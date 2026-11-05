import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { TASKBAR_SAFE, WIDGET_TILE, WIDGET_TILE_H } from '@/components/desktop/widgetLayout';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const MARGIN = 16;

/** Widgets que toda pessoa tem no desktop, na ordem em que aparecem empilhados. */
const TIPOS = ['turno', 'paginas'];

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
 * Widgets do desktop de cada pessoa. O hook garante que turno e páginas existam,
 * e guarda posição e estado aberto/fechado de cada um.
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

        const posicao = posicaoPadrao();
        const faltando = TIPOS.filter((tipo) => !lista.some((widget) => widget.tipo === tipo));

        if (!faltando.length) {
          if (active) setWidgets(lista);
          return;
        }

        const criados = [];
        for (const tipo of faltando) {
          criados.push(
            await base44.entities.WidgetUsuario.create({
              usuario_id: userId,
              tipo,
              aberto: false,
              icone_x: posicao.icone_x,
              icone_y: posicao.icone_y + TIPOS.indexOf(tipo) * (WIDGET_TILE_H + 8),
            })
          );
        }
        if (active) setWidgets([...lista, ...criados.filter((item) => item?.id)]);
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
