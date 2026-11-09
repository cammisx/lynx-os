import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * Desenhos fixados na área de trabalho.
 *
 * Ficam no banco (entidade DesenhoFixo), um por pessoa: o desenho fixado no
 * celular aparece na mesa do computador e vice-versa. A mesa só existe no
 * desktop, então é lá que eles são desenhados.
 */

export const LIMITE_DESENHOS = 10;

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

/* Fixar dentro do Paint precisa aparecer na mesa na hora: as duas telas usam
   este hook e se avisam por evento, sem recarregar a página. */
const EVENTO = 'lynx:desenhos';

const avisarMudanca = () => {
  try {
    window.dispatchEvent(new CustomEvent(EVENTO));
  } catch {
    /* navegador sem CustomEvent não deve derrubar o fixar */
  }
};

const posicaoInicial = (indice) => ({
  pos_x: 64 + (indice % 5) * 36,
  pos_y: 64 + (indice % 5) * 36,
});

export default function useDesenhosFixos() {
  const { user } = useAuth();
  const userId = user?.id;
  const [desenhos, setDesenhos] = useState([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    let ativo = true;

    const recarregar = async () => {
      try {
        const lista = asList(await base44.entities.DesenhoFixo.filter({ usuario_id: userId }));
        if (ativo) setDesenhos(lista);
      } catch (erro) {
        console.warn('[Desenhos] recarregar', erro?.message || erro);
      }
    };

    const carregar = async () => {
      try {
        const lista = asList(await base44.entities.DesenhoFixo.filter({ usuario_id: userId }));
        if (ativo) setDesenhos(lista);
      } catch (erro) {
        console.warn('[Desenhos] não consegui carregar', erro?.message || erro);
      } finally {
        if (ativo) setCarregado(true);
      }
    };

    carregar();
    window.addEventListener(EVENTO, recarregar);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO, recarregar);
    };
  }, [userId]);

  const fixar = useCallback(
    async ({ url, largura, altura, nome = 'Desenho' }) => {
      if (!userId) return { ok: false, erro: 'Entre na sua conta para fixar desenhos.' };
      if (desenhos.length >= LIMITE_DESENHOS) {
        return {
          ok: false,
          erro: `Limite de ${LIMITE_DESENHOS} desenhos fixados atingido. Desafixe um para fixar outro.`,
        };
      }

      const proporcao = largura && altura ? altura / largura : 0.75;
      const posicao = posicaoInicial(desenhos.length);

      const criado = await base44.entities.DesenhoFixo.create({
        usuario_id: userId,
        desenho_url: url,
        nome,
        largura: 320,
        altura: Math.round(Math.min(420, Math.max(160, 320 * proporcao))),
        ...posicao,
      });

      if (criado?.id) {
        setDesenhos((atual) => [...atual, criado]);
        avisarMudanca();
      }
      return { ok: true, desenho: criado };
    },
    [desenhos.length, userId]
  );

  const mover = useCallback(async (id, pos_x, pos_y) => {
    setDesenhos((atual) => atual.map((item) => (item.id === id ? { ...item, pos_x, pos_y } : item)));
    try {
      await base44.entities.DesenhoFixo.update(id, { pos_x, pos_y });
    } catch (erro) {
      console.warn('[Desenhos] mover', erro?.message || erro);
    }
  }, []);

  const redimensionar = useCallback(async (id, largura, altura) => {
    setDesenhos((atual) => atual.map((item) => (item.id === id ? { ...item, largura, altura } : item)));
    try {
      await base44.entities.DesenhoFixo.update(id, { largura, altura });
    } catch (erro) {
      console.warn('[Desenhos] redimensionar', erro?.message || erro);
    }
  }, []);

  const desafixar = useCallback(async (id) => {
    setDesenhos((atual) => atual.filter((item) => item.id !== id));
    try {
      await base44.entities.DesenhoFixo.delete(id);
      avisarMudanca();
    } catch (erro) {
      console.warn('[Desenhos] desafixar', erro?.message || erro);
    }
  }, []);

  return useMemo(
    () => ({ desenhos, carregado, fixar, mover, redimensionar, desafixar, limite: LIMITE_DESENHOS }),
    [desenhos, carregado, fixar, mover, redimensionar, desafixar]
  );
}
