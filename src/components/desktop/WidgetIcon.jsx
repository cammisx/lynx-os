import { useEffect, useRef, useState } from 'react';
import TurnoIcon from '@/components/icons/TurnoIcon';
import {
  LABEL_OFFSET,
  TASKBAR_SAFE,
  WIDGET_ICON,
  WIDGET_LABEL,
  WIDGET_TILE,
  WIDGET_TILE_H,
} from './widgetLayout';

const TILE = WIDGET_TILE;
const TILE_H = WIDGET_TILE_H;
const TASKBAR = TASKBAR_SAFE;

const clamp = (x, y) => ({
  x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - TILE)),
  y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - TASKBAR - TILE_H)),
});

/**
 * Ícone do widget no desktop. Arrasta pra reposicionar e abre com duplo clique.
 * Clique simples só seleciona, pra ninguém abrir sem querer no meio de um arrasto.
 */
export default function WidgetIcon({ label, position, onOpen, onCommit, pulsando = false }) {
  const [pos, setPos] = useState(() => clamp(position.icone_x, position.icone_y));
  const [arrastando, setArrastando] = useState(false);
  const [selecionado, setSelecionado] = useState(false);
  const containerRef = useRef(null);
  const drag = useRef(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    if (!selecionado) return undefined;
    const handleDown = (event) => {
      if (containerRef.current?.contains(event.target)) return;
      setSelecionado(false);
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [selecionado]);

  useEffect(() => {
    if (drag.current) return;
    setPos(clamp(position.icone_x, position.icone_y));
  }, [position.icone_x, position.icone_y]);

  const startDrag = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = {
      dx: event.clientX - pos.x,
      dy: event.clientY - pos.y,
      moveu: false,
    };
    setArrastando(true);

    const handleMove = (moveEvent) => {
      const data = drag.current;
      if (!data) return;
      const next = clamp(moveEvent.clientX - data.dx, moveEvent.clientY - data.dy);
      if (next.x !== pos.x || next.y !== pos.y) data.moveu = true;
      setPos(next);
    };

    const handleUp = () => {
      const data = drag.current;
      drag.current = null;
      setArrastando(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      if (data?.moveu) {
        onCommit({ icone_x: posRef.current.x, icone_y: posRef.current.y });
      }
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={label}
      onMouseDown={startDrag}
      onClick={() => setSelecionado(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') setSelecionado(true);
      }}
      onDoubleClick={() => {
        if (drag.current?.moveu) return;
        onOpen();
      }}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: TILE,
        height: TILE_H,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        borderRadius: 14,
        background: selecionado ? 'color-mix(in srgb, var(--c1) 20%, transparent)' : 'transparent',
        transition: 'background-color 0.14s ease',
        cursor: arrastando ? 'grabbing' : 'default',
        userSelect: 'none',
        zIndex: 1,
      }}
    >
      <div style={{ position: 'relative', display: 'flex' }}>
        <TurnoIcon size={WIDGET_ICON} />
        {pulsando && (
          <span
            style={{
              position: 'absolute',
              right: -2,
              top: -2,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'var(--c1)',
              boxShadow: '0 0 10px var(--c1)',
              animation: 'widget-pulse 2s ease-in-out infinite',
            }}
          />
        )}
      </div>
      <span
        style={{
          fontSize: WIDGET_LABEL,
          marginTop: LABEL_OFFSET,
          color: 'var(--c3)',
          textShadow: '0 1px 3px rgba(0,0,0,0.85)',
          maxWidth: TILE,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-main)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
