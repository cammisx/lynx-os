import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Window({ title, onClose, children, width = 620, height = 460 }) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(8, Math.round((window.innerWidth - width) / 2)),
    y: Math.max(8, Math.round((window.innerHeight - height) / 2)),
  }));
  const offsetRef = useRef(null);

  const startDrag = (event) => {
    event.preventDefault();
    offsetRef.current = { dx: event.clientX - pos.x, dy: event.clientY - pos.y };

    const handleMove = (moveEvent) => {
      const offset = offsetRef.current;
      if (!offset) return;
      setPos({
        x: Math.min(Math.max(-width + 120, moveEvent.clientX - offset.dx), window.innerWidth - 120),
        y: Math.min(Math.max(0, moveEvent.clientY - offset.dy), window.innerHeight - 60),
      });
    };

    const handleUp = () => {
      offsetRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width,
        height,
        minWidth: 520,
        minHeight: 380,
        zIndex: 8000,
        background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid color-mix(in srgb, var(--c1) 22%, transparent)',
        borderRadius: 14,
        boxShadow: '0 16px 56px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-main)',
      }}
    >
      <div
        onMouseDown={startDrag}
        style={{
          height: 38,
          flexShrink: 0,
          padding: '0 10px 0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--c3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>

        <button
          type="button"
          aria-label="Fechar"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={onClose}
          className="clk-nav-btn"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: 'var(--c2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>{children}</div>
    </div>,
    document.body
  );
}