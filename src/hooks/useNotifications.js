import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isNaoLida } from '@/lib/notificacoes';
import { isSolicitacaoSemDono } from '@/lib/solicitacoes';
import { NOTIFICATIONS_CHANGED } from '@/lib/desktopEvents';
import { avaliarNotificacoesNovas, tocarNotificacao } from '@/lib/sons';

const REFRESH_MS = 60000;

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

export default function useNotifications(userId, isAdmin = false) {
  const [items, setItems] = useState([]);

  /* Instante em que a página abriu: nada criado antes disso deve soar. */
  const aberturaRef = useRef(Date.now());

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await base44.entities.Notificacao.filter(
        { usuario_id: userId },
        { sort: '-created_date', limit: 30 }
      );
      let lista = asList(result);

      // Solicitações criadas por chatter ficam sem dono e aparecem para o admin.
      if (isAdmin) {
        try {
          const abertas = await base44.entities.Notificacao.filter(
            { status: 'pendente' },
            { sort: '-created_date', limit: 50 }
          );
          const semDono = asList(abertas).filter(isSolicitacaoSemDono);
          const vistos = new Set(lista.map((item) => item.id));
          lista = [...lista, ...semDono.filter((item) => !vistos.has(item.id))];
        } catch (error) {
          // sem acesso às solicitações abertas, segue com as próprias
        }
      }

      // Avisa com o som escolhido quando aparece notificação nova não lida.
      // Pendências que já estavam abertas quando a página carregou não soam.
      const naoLidasAgora = lista
        .filter(isNaoLida)
        .map((item) => ({ id: item.id, created_date: item.created_date }));
      if (avaliarNotificacoesNovas(naoLidasAgora, aberturaRef.current)) tocarNotificacao();

      setItems(lista);
    } catch (error) {
      setItems([]);
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    if (!userId) return undefined;
    load();
    const id = setInterval(load, REFRESH_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      clearInterval(id);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [userId, load]);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, lida: true } : item)));
    try {
      await base44.entities.Notificacao.update(id, { lida: true });
    } catch (error) {
      console.warn('[Notificacao]', error);
    }
  }, []);

  const naoLidas = items.filter(isNaoLida).length;

  return { items, naoLidas, markRead, reload: load };
}