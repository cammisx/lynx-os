import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ehAdmin } from '@/lib/chat';
import {
  TIPO_EMPRESA,
  TIPO_MODELO,
  nomeDoPlaybook,
  normalizarSecoes,
  playbooksVisiveis,
  secoesIniciais,
} from '@/lib/playbooks';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const agora = () => new Date().toISOString();

/**
 * Mantém os playbooks em dia com as modelos:
 * cria o da empresa e o de cada modelo nova, arquiva o das modelos que
 * saíram (arquivadas ou excluídas) e devolve o que a pessoa pode ver.
 */
export default function usePlaybooks() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const admin = ehAdmin(user);
  const userId = user?.id;
  const modelosRef = useRef([]);

  const carregar = useCallback(async () => {
    if (!userId) return;
    setErro('');
    try {
      const [listaModelos, listaPlaybooks] = await Promise.all([
        asList(await base44.entities.Modelo.list('-created_date', 200, 0).catch(() => [])),
        asList(await base44.entities.Playbook.list('-created_date', 300, 0).catch(() => [])),
      ]);
      modelosRef.current = listaModelos;
      setModelos(listaModelos);

      let atuais = listaPlaybooks;
      let mexeu = false;

      /* 1. Garante o playbook da empresa. */
      const daEmpresa = atuais.filter((item) => item.tipo === TIPO_EMPRESA);
      if (!daEmpresa.length) {
        const criado = await base44.entities.Playbook.create({
          tipo: TIPO_EMPRESA,
          titulo: 'Empresa',
          resumo: 'Diretrizes da agência: valem para toda a equipe.',
          secoes: secoesIniciais(TIPO_EMPRESA),
          arquivado: false,
        }).catch((falha) => {
          console.warn('[Playbook] não consegui criar o da empresa', falha);
          return null;
        });
        if (criado?.id) {
          atuais = [...atuais, criado];
          mexeu = true;
        }
      }

      /* 2. Garante um por modelo (mesmo arquivada, para o texto não se perder). */
      const existentes = new Set(atuais.filter((item) => item.tipo === TIPO_MODELO).map((item) => item.modelo_id));
      const faltando = listaModelos.filter((modelo) => modelo?.id && !existentes.has(modelo.id));
      if (faltando.length) {
        const criados = await Promise.all(
          faltando.map((modelo) =>
            base44.entities.Playbook.create({
              tipo: TIPO_MODELO,
              modelo_id: modelo.id,
              titulo: modelo.nome,
              resumo: `Diretrizes da modelo ${modelo.nome}.`,
              secoes: secoesIniciais(TIPO_MODELO),
              arquivado: false,
            }).catch((falha) => {
              console.warn('[Playbook] não consegui criar o da modelo', modelo.nome, falha);
              return null;
            })
          )
        );
        const validos = criados.filter((item) => item?.id);
        if (validos.length) {
          atuais = [...atuais, ...validos];
          mexeu = true;
        }
      }

      /* 3. Arquiva quem perdeu a modelo, e acompanha o arquivamento da modelo. */
      const idsModelos = new Set(listaModelos.map((modelo) => modelo?.id).filter(Boolean));
      const arquivadas = new Set(
        listaModelos.filter((modelo) => modelo?.arquivada).map((modelo) => modelo.id)
      );
      const paraArquivar = atuais.filter((item) => {
        if (item.tipo !== TIPO_MODELO || item.arquivado) return false;
        if (!item.modelo_id || !idsModelos.has(item.modelo_id)) return true;
        return arquivadas.has(item.modelo_id);
      });
      const paraVoltar = atuais.filter((item) => {
        if (item.tipo !== TIPO_MODELO || !item.arquivado) return false;
        if (!item.modelo_id || !idsModelos.has(item.modelo_id)) return false;
        return !arquivadas.has(item.modelo_id);
      });

      if (paraArquivar.length || paraVoltar.length) {
        const marcados = new Map();
        await Promise.all([
          ...paraArquivar.map((item) =>
            base44.entities.Playbook.update(item.id, { arquivado: true, arquivado_em: agora() })
              .then(() => marcados.set(item.id, { arquivado: true }))
              .catch((falha) => console.warn('[Playbook] arquivar', item.id, falha))
          ),
          ...paraVoltar.map((item) =>
            base44.entities.Playbook.update(item.id, { arquivado: false, arquivado_em: null })
              .then(() => marcados.set(item.id, { arquivado: false }))
              .catch((falha) => console.warn('[Playbook] desarquivar', item.id, falha))
          ),
        ]);
        if (marcados.size) {
          atuais = atuais.map((item) => (marcados.has(item.id) ? { ...item, ...marcados.get(item.id) } : item));
          mexeu = true;
        }
      }

      setPlaybooks(mexeu ? atuais : listaPlaybooks);
    } catch (falha) {
      console.warn('[Playbook] carregar', falha);
      setErro('Não consegui carregar os playbooks.');
    } finally {
      setCarregando(false);
    }
  }, [userId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** Grava as seções de um playbook. Só admin edita. */
  const salvar = useCallback(
    async (playbook, { secoes, resumo }) => {
      if (!admin || !playbook?.id) return false;
      const dados = {
        secoes: normalizarSecoes(secoes),
        resumo: String(resumo ?? playbook.resumo ?? ''),
        atualizado_por: userId,
        atualizado_por_nome: user?.full_name || '',
      };
      setPlaybooks((anterior) =>
        anterior.map((item) => (item.id === playbook.id ? { ...item, ...dados } : item))
      );
      try {
        await base44.entities.Playbook.update(playbook.id, dados);
        return true;
      } catch (falha) {
        console.warn('[Playbook] salvar', falha);
        setErro('Não consegui salvar o playbook.');
        await carregar();
        return false;
      }
    },
    [admin, carregar, user?.full_name, userId]
  );

  const visiveis = playbooksVisiveis(playbooks, modelos, user);

  return {
    playbooks: visiveis,
    todos: playbooks,
    modelos,
    carregando,
    erro,
    admin,
    recarregar: carregar,
    salvar,
    nomeDe: (playbook) => nomeDoPlaybook(playbook, modelos),
  };
}
