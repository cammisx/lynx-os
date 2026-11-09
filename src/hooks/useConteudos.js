import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ehAdmin } from '@/lib/chat';
import { conteudosVisiveis } from '@/lib/conteudos';
import { abasPadrao } from '@/lib/tabelaPrecos';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

/**
 * Mantém o conteúdo em dia com as modelos: garante um por modelo (inclusive
 * as arquivadas, para nada se perder) e devolve só o que a pessoa pode ver.
 *
 * Quem cria é o admin; o chatter só lê o das modelos dele.
 */
export default function useConteudos() {
  const { user } = useAuth();
  const [conteudos, setConteudos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const admin = ehAdmin(user);
  const userId = user?.id;

  const carregar = useCallback(async () => {
    if (!userId) return;
    setErro('');
    setCarregando(true);
    try {
      const [listaModelos, listaConteudos] = await Promise.all([
        asList(await base44.entities.Modelo.list('-created_date', 200, 0).catch(() => [])),
        asList(await base44.entities.Conteudo.list('-created_date', 300, 0).catch(() => [])),
      ]);

      let atuais = listaConteudos;

      /* Modelo nova (ou modelo que ainda não tinha conteúdo) ganha o dela. */
      if (admin) {
        const existentes = new Set(atuais.map((item) => item?.modelo_id));
        const faltando = listaModelos.filter((modelo) => modelo?.id && !existentes.has(modelo.id));
        if (faltando.length) {
          const criados = await Promise.all(
            faltando.map((modelo) =>
              base44.entities.Conteudo.create({
                modelo_id: modelo.id,
                titulo: modelo.nome,
                secoes: [],
                tabela_precos: abasPadrao(),
                arquivado: Boolean(modelo.arquivada),
                arquivado_em: modelo.arquivada ? new Date().toISOString() : null,
              }).catch((falha) => {
                console.warn('[Conteudo] não consegui criar o da modelo', modelo.nome, falha);
                return null;
              })
            )
          );
          const validos = criados.filter((item) => item?.id);
          if (validos.length) atuais = [...atuais, ...validos];
        }
      }

      setModelos(listaModelos);
      setConteudos(atuais);
    } catch (falha) {
      console.warn('[Conteudo] carregar', falha);
      setErro('Não consegui carregar o conteúdo agora.');
    } finally {
      setCarregando(false);
    }
  }, [admin, userId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    modelos,
    conteudos: conteudosVisiveis(conteudos, modelos, user),
    admin,
    carregando,
    erro,
    recarregar: carregar,
  };
}
