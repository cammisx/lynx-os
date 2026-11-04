import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const REFRESH_MS = 60000;

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

export default function useNotifications(userId) {
  const [items, setItems] = useState([]);
  const [readIds, setReadIds] = useState(() => new Set());

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
    return () => clearInterval(id);
  }, [userId, load]);

  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  return { items, readIds, markRead, reload: load };
}