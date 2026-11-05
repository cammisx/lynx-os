import { useEffect, useRef, useState } from 'react';
import TurnoIcon from '@/components/icons/TurnoIcon';

const TILE = 92;
const ICON_SIZE = 52;
const TASKBAR = 96;

const clamp = (x, y) => ({
  x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - TILE)),
  y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - TASKBAR - TILE)),
});

/**
 * Ícone do widget no desktop. Arrasta pra reposicionar e abre com duplo clique.
 * Clique simples só seleciona, pra ninguém abrir sem querer no meio de um arrasto.
 */
export default function WidgetIcon({ label, position, onOpen, onCommit, pulsando = false }) {
  const [pos, setPos] = useState(() => clamp(position.icone_x, position.icone_y));
  const [arrastando, setArrastando] = useState(false);
  const [selecionado, setSelecionado] = useState(false);
  const [hover, setHover] = useState(false);
  const drag = useRef(null);
  const posRef = useRef(pos);
  posRef.current = pos;

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
      role="button"
      tabIndex={0}
      aria-label={label}
      onMouseDown={startDrag}
      onDoubleClick={() => {
        if (drag.current?.moveu) return;
        onOpen();
      }}
      onClick={() => setSelecionado(true)}
      onBlur={() => setSelecionado(false)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: TILE,
        height: TILE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: 10,
        border: `1px solid ${
          selecionado
            ? 'color-mix(in srgb, var(--c1) 55%, transparent)'
            : hover
              ? 'color-mix(in srgb, white 18%, transparent)'
              : 'transparent'
        }`,
        background: selecionado
          ? 'color-mix(in srgb, var(--c1) 16%, transparent)'
          : hover
            ? 'color-mix(in srgb, white 7%, transparent)'
            : 'transparent',
        cursor: arrastando ? 'grabbing' : 'default',
        userSelect: 'none',
        transition: 'background-color 0.12s, border-color 0.12s',
        zIndex: 1,
      }}
    >
      <div style={{ position: 'relative', display: 'flex' }}>
        <TurnoIcon size={ICON_SIZE} />
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
          fontSize: 10,
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
