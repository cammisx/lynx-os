import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { TASKBAR_SAFE, WIDGET_TILE } from '@/components/desktop/widgetLayout';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const MARGIN = 16;

/** Posição inicial do ícone: canto superior direito, longe da barra de tarefas. */
export const posicaoPadrao = () => ({
  icone_x: Math.max(MARGIN, window.innerWidth - WIDGET_TILE - MARGIN),
  icone_y: MARGIN + 24,
});

export const limiterNaTela = (x, y) => ({
  icone_x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - WIDGET_TILE)),
  icone_y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - TASKBAR_SAFE - WIDGET_TILE)),
});

/**
 * Widgets do desktop de cada pessoa. Por enquanto só existe o de turno, então o
 * hook garante que ele sempre exista e guarda posição e estado aberto/fechado.
 */
export default function useWidgets() {
  const { user } = useAuth();
  const userId = user?.id;
  const [widgets, setWidgets] = useState([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;

    const carregar = async () => {
      try {
        const result = await base44.entities.WidgetUsuario.filter({ usuario_id: userId });
        const lista = asList(result);

        if (lista.length > 0) {
          if (active) setWidgets(lista);
          return;
        }

        const criado = await base44.entities.WidgetUsuario.create({
          usuario_id: userId,
          tipo: 'turno',
          aberto: false,
          ...posicaoPadrao(),
        });
        if (active && criado?.id) setWidgets([criado]);
      } catch (error) {
        console.warn('[WidgetUsuario]', error);
      } finally {
        if (active) setCarregado(true);
      }
    };

    carregar();
    return () => {
      active = false;
    };
  }, [userId]);

  const patch = useCallback(async (id, dados) => {
    setWidgets((prev) => prev.map((item) => (item.id === id ? { ...item, ...dados } : item)));
    try {
      await base44.entities.WidgetUsuario.update(id, dados);
    } catch (error) {
      console.warn('[WidgetUsuario]', error);
    }
  }, []);

  return { widgets, carregado, patch };
}
