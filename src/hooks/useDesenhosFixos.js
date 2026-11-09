import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { novoId } from '@/lib/paint';

/**
 * Desenhos fixados na área de trabalho.
 *
 * Ficam no navegador de quem fixou (uma mesa por aparelho), como ícone da
 * área de trabalho: não viram registro no banco. A imagem em si é enviada
 * para o armazenamento do app, então continua abrindo depois de recarregar.
 */

export const LIMITE_DESENHOS = 10;

const chaveDe = (userId) => `lynx:desenhos-fixos:${userId || 'anon'}`;

const ler = (userId) => {
  try {
    const bruto = localStorage.getItem(chaveDe(userId));
    if (!bruto) return [];
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista.filter((item) => item?.url) : [];
  } catch {
    return [];
  }
};

const EVENTO = 'lynx:desenhos';

const gravar = (userId, lista) => {
  try {
    localStorage.setItem(chaveDe(userId), JSON.stringify(lista));
    /* Quem mais estiver ouvindo (a área de trabalho, por exemplo) se atualiza
       na hora: fixar dentro do Paint precisa aparecer na mesa sem recarregar. */
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { userId } }));
  } catch (erro) {
    console.warn('[Desenhos] não consegui guardar', erro);
  }
};

export default function useDesenhosFixos() {
  const { user } = useAuth();
  const userId = user?.id;
  const [desenhos, setDesenhos] = useState(() => (typeof window === 'undefined' ? [] : []));

  useEffect(() => {
    setDesenhos(ler(userId));

    const recarregar = (evento) => {
      if (!evento?.detail?.userId || evento.detail.userId === userId) setDesenhos(ler(userId));
    };
    const deFora = (evento) => {
      if (!evento?.key || evento.key === chaveDe(userId)) setDesenhos(ler(userId));
    };

    window.addEventListener(EVENTO, recarregar);
    window.addEventListener('storage', deFora);
    return () => {
      window.removeEventListener(EVENTO, recarregar);
      window.removeEventListener('storage', deFora);
    };
  }, [userId]);

  const salvar = useCallback(
    (lista) => {
      setDesenhos(lista);
      gravar(userId, lista);
    },
    [userId]
  );

  const fixar = useCallback(
    ({ url, largura, altura, nome = 'Desenho' }) => {
      const atuais = ler(userId);
      if (atuais.length >= LIMITE_DESENHOS) {
        return {
          ok: false,
          erro: `Limite de ${LIMITE_DESENHOS} desenhos fixados atingido. Desafixe um para fixar outro.`,
        };
      }

      const proporcao = largura && altura ? altura / largura : 0.75;
      const indice = atuais.length;
      const novo = {
        id: novoId(),
        url,
        nome,
        largura: 320,
        altura: Math.round(Math.min(420, Math.max(160, 320 * proporcao))),
        x: 64 + (indice % 5) * 36,
        y: 64 + (indice % 5) * 36,
      };

      salvar([...atuais, novo]);
      return { ok: true, desenho: novo };
    },
    [salvar, userId]
  );

  const mover = useCallback(
    (id, x, y) => {
      salvar(ler(userId).map((item) => (item.id === id ? { ...item, x, y } : item)));
    },
    [salvar, userId]
  );

  const redimensionar = useCallback(
    (id, largura, altura) => {
      salvar(ler(userId).map((item) => (item.id === id ? { ...item, largura, altura } : item)));
    },
    [salvar, userId]
  );

  const desafixar = useCallback(
    (id) => {
      salvar(ler(userId).filter((item) => item.id !== id));
    },
    [salvar, userId]
  );

  return useMemo(
    () => ({ desenhos, fixar, mover, redimensionar, desafixar, limite: LIMITE_DESENHOS }),
    [desenhos, fixar, mover, redimensionar, desafixar]
  );
}
