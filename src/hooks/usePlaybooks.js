import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ehAdmin } from '@/lib/chat';
import {
  CABECALHO_MODELO,
  DIAS_DE_VALIDADE,
  TIPO_EMPRESA,
  TIPO_MODELO,
  VERSAO_TEMPLATE,
  conviteValido,
  gerarToken,
  nomeDoPlaybook,
  normalizarSecoes,
  playbooksVisiveis,
  secoesDoTemplate,
  secoesIniciais,
  secoesParaFormulario,
} from '@/lib/playbooks';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const agora = () => new Date().toISOString();

const daquiAPouco = (dias) => {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString();
};

/**
 * Mantém os playbooks em dia com as modelos:
 * cria o da empresa e o de cada modelo nova, arquiva o das modelos que
 * saíram (arquivadas ou excluídas) e devolve o que a pessoa pode ver.
 *
 * O questionário de uma modelo nova vem do template salvo pelo admin (aba
 * Template). Se o template ainda não existir, cai no questionário do código.
 *
 * O link do formulário é um convite: a modelo responde sem conta, pela função
 * pública, e o playbook dela nasce preenchido.
 */
export default function usePlaybooks() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [convites, setConvites] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const admin = ehAdmin(user);
  const userId = user?.id;
  const modelosRef = useRef([]);

  const templateDe = useCallback(
    (tipo) => templates.find((item) => item?.tipo === tipo) || null,
    [templates]
  );

  const carregar = useCallback(async () => {
    if (!userId) return;
    setErro('');
    try {
      const [listaModelos, listaPlaybooks, listaTemplates, listaConvites] = await Promise.all([
        asList(await base44.entities.Modelo.list('-created_date', 200, 0).catch(() => [])),
        asList(await base44.entities.Playbook.list('-created_date', 300, 0).catch(() => [])),
        asList(await base44.entities.PlaybookTemplate.list('-created_date', 20, 0).catch(() => [])),
        admin
          ? asList(await base44.entities.PlaybookConvite.list('-created_date', 200, 0).catch(() => []))
          : Promise.resolve([]),
      ]);
      modelosRef.current = listaModelos;
      setModelos(listaModelos);
      setConvites(listaConvites);

      let templatesAtuais = listaTemplates;
      let atuais = listaPlaybooks;
      let mexeu = false;

      /* 0. Template: se ainda não existe, nasce com o questionário do código. */
      if (admin) {
        const faltando = [TIPO_MODELO, TIPO_EMPRESA].filter(
          (tipo) => !templatesAtuais.some((item) => item?.tipo === tipo)
        );
        if (faltando.length) {
          const criados = await Promise.all(
            faltando.map((tipo) =>
              base44.entities.PlaybookTemplate.create({
                tipo,
                versao: VERSAO_TEMPLATE,
                resumo:
                  tipo === TIPO_EMPRESA
                    ? 'Perguntas que o playbook da agência começa tendo'
                    : 'Perguntas que toda modelo nova recebe',
                secoes: secoesIniciais(tipo),
              }).catch((falha) => {
                console.warn('[Playbook] não consegui criar o template', tipo, falha);
                return null;
              })
            )
          );
          const validos = criados.filter((item) => item?.id);
          if (validos.length) templatesAtuais = [...templatesAtuais, ...validos];
        }
        /* Template de uma versão antiga do questionário é reescrito. */
        const desatualizados = templatesAtuais.filter(
          (item) => item?.tipo && (Number(item?.versao) || 0) < VERSAO_TEMPLATE
        );
        if (desatualizados.length) {
          const atualizados = await Promise.all(
            desatualizados.map((item) =>
              base44.entities.PlaybookTemplate.update(item.id, {
                versao: VERSAO_TEMPLATE,
                secoes: secoesIniciais(item.tipo),
              })
                .then((salvo) => ({ ...item, ...(salvo || {}), versao: VERSAO_TEMPLATE, secoes: secoesIniciais(item.tipo) }))
                .catch((falha) => {
                  console.warn('[Playbook] não consegui atualizar o template', item?.tipo, falha);
                  return null;
                })
            )
          );
          const ok = atualizados.filter(Boolean);
          if (ok.length) {
            const porId = new Map(ok.map((item) => [item.id, item]));
            templatesAtuais = templatesAtuais.map((item) => porId.get(item.id) || item);
          }
        }

        setTemplates(templatesAtuais);
      }

      const secoesDe = (tipo) =>
        secoesDoTemplate(templatesAtuais.find((item) => item?.tipo === tipo), tipo);

      /* 1. Garante o playbook da empresa. */
      const daEmpresa = atuais.filter((item) => item.tipo === TIPO_EMPRESA);
      if (!daEmpresa.length) {
        const criado = await base44.entities.Playbook.create({
          tipo: TIPO_EMPRESA,
          titulo: 'Empresa',
          resumo: 'Diretrizes da agência: valem para toda a equipe.',
          secoes: secoesDe(TIPO_EMPRESA),
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
        const questionario = secoesDe(TIPO_MODELO);
        const criados = await Promise.all(
          faltando.map((modelo) =>
            base44.entities.Playbook.create({
              tipo: TIPO_MODELO,
              modelo_id: modelo.id,
              titulo: modelo.nome,
              resumo: `Diretrizes da modelo ${modelo.nome}.`,
              secoes: questionario,
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

          /* Modelo nova já sai com o link do formulário pronto para enviar. */
          if (admin) {
            const convitesCriados = await Promise.all(
              validos.map((novo) => {
                const secoes = secoesParaFormulario(novo);
                if (!secoes.some((secao) => secao.itens.length)) return Promise.resolve(null);
                return base44.entities.PlaybookConvite.create({
                  token: gerarToken(),
                  modelo_id: novo.modelo_id,
                  modelo_nome: novo.titulo || novo.nome || '',
                  ...cabecalhoDoFormulario(),
                  secoes,
                  status: 'pendente',
                  expira_em: daquiAPouco(DIAS_DE_VALIDADE),
                  playbook_id: novo.id,
                  origem: 'cadastro',
                }).catch((falha) => {
                  console.warn('[Playbook] não consegui gerar o link da modelo nova', falha);
                  return null;
                });
              })
            );
            const okConvites = convitesCriados.filter(Boolean);
            if (okConvites.length) {
              setConvites((anterior) => [...okConvites, ...anterior]);
            }
          }
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
  }, [admin, userId]);

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

  /** Grava o questionário padrão. Só admin. */
  const salvarTemplate = useCallback(
    async (tipo, { secoes, resumo, titulo, descricao }) => {
      if (!admin) return false;
      const dados = {
        tipo,
        resumo: String(resumo || ''),
        titulo: String(titulo || ''),
        descricao: String(descricao || ''),
        secoes: normalizarSecoes(secoes),
        atualizado_por: userId,
        atualizado_por_nome: user?.full_name || '',
      };
      const atual = templates.find((item) => item?.tipo === tipo);
      setErro('');
      try {
        if (atual?.id) {
          const salvo = await base44.entities.PlaybookTemplate.update(atual.id, dados);
          setTemplates((anterior) =>
            anterior.map((item) => (item.id === atual.id ? { ...item, ...(salvo || dados) } : item))
          );
        } else {
          const criado = await base44.entities.PlaybookTemplate.create(dados);
          setTemplates((anterior) => [...anterior, criado]);
        }
        return true;
      } catch (falha) {
        console.warn('[Playbook] salvar template', falha);
        setErro('Não consegui salvar o template.');
        return false;
      }
    },
    [admin, templates, user?.full_name, userId]
  );

  /** Cabeçalho que o formulário público mostra, vindo do template. */
  const cabecalhoDoFormulario = useCallback(() => {
    const template = templates.find((item) => item?.tipo === TIPO_MODELO);
    return {
      titulo: template?.titulo || CABECALHO_MODELO.titulo,
      descricao: template?.descricao || CABECALHO_MODELO.descricao,
    };
  }, [templates]);

  const conviteDaModelo = useCallback(
    (modeloId) => {
      if (!modeloId) return null;
      const doModelo = convites.filter((item) => item?.modelo_id === modeloId);
      if (!doModelo.length) return null;
      const pendente = doModelo.find(conviteValido);
      if (pendente) return pendente;
      return [...doModelo].sort(
        (a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)
      )[0];
    },
    [convites]
  );

  /**
   * Gera (ou reaproveita) o link público do formulário da modelo.
   * O convite guarda uma cópia das perguntas, para o formulário não mudar
   * debaixo da modelo se o template for editado no meio do caminho.
   */
  const criarConvite = useCallback(
    async (playbook, origem = 'manual') => {
      if (!admin || !playbook?.id) return null;
      setErro('');
      const modeloId = playbook.modelo_id;
      if (!modeloId) {
        setErro('Este playbook não está ligado a uma modelo.');
        return null;
      }

      const existente = convites.find(
        (item) => item?.modelo_id === modeloId && conviteValido(item)
      );
      if (existente) return existente;

      const secoes = secoesParaFormulario(playbook);
      if (!secoes.some((secao) => secao.itens.length)) {
        setErro('O playbook não tem perguntas para enviar.');
        return null;
      }

      const dados = {
        token: gerarToken(),
        modelo_id: modeloId,
        modelo_nome: nomeDoPlaybook(playbook, modelos),
        ...cabecalhoDoFormulario(),
        secoes,
        status: 'pendente',
        expira_em: daquiAPouco(DIAS_DE_VALIDADE),
        respondido_em: null,
        playbook_id: playbook.id,
        origem,
      };

      try {
        const criado = await base44.entities.PlaybookConvite.create(dados);
        setConvites((anterior) => [criado, ...anterior]);
        return criado;
      } catch (falha) {
        console.warn('[Playbook] criar convite', falha);
        setErro('Não consegui gerar o link do formulário.');
        return null;
      }
    },
    [admin, cabecalhoDoFormulario, convites, modelos]
  );

  const visiveis = playbooksVisiveis(playbooks, modelos, user);

  return {
    playbooks: visiveis,
    todos: playbooks,
    modelos,
    convites,
    templates,
    templateDe,
    carregando,
    erro,
    admin,
    recarregar: carregar,
    salvar,
    salvarTemplate,
    criarConvite,
    conviteDaModelo,
    nomeDe: (playbook) => nomeDoPlaybook(playbook, modelos),
  };
}
