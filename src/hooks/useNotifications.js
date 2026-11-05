import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isNaoLida } from '@/lib/notificacoes';
import { NOTIFICATIONS_CHANGED } from '@/lib/desktopEvents';

const REFRESH_MS = 60000;

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

export default function useNotifications(userId) {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await base44.entities.Notificacao.filter(
        { usuario_id: userId },
        { sort: '-created_date', limit: 30 }
      );
      setItems(asList(result));
    } catch (error) {
      setItems([]);
    }
  }, [userId]);

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