import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import usePopoverPos from '@/lib/popover';

const triggerStyle = {
  width: '100%',
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '0 10px',
  borderRadius: 8,
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c6) 35%, transparent)',
  color: 'var(--c3)',
  fontSize: 12,
  fontFamily: 'var(--font-main)',
  textAlign: 'left',
  cursor: 'pointer',
};

const labelStyle = {
  fontSize: 10,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

const panelStyle = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  zIndex: 10000,
  display: 'flex',
  borderRadius: 12,
  background:
    'linear-gradient(to bottom, color-mix(in srgb, white 4%, transparent) 0%, transparent 18%), color-mix(in srgb, var(--c8) 72%, transparent)',
  backdropFilter: 'blur(32px) saturate(1.5)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
  border: '1px solid color-mix(in srgb, white 16%, color-mix(in srgb, var(--c1) 20%, transparent))',
  boxShadow: '0 16px 40px color-mix(in srgb, black 35%, transparent)',
  overflow: 'hidden',
};

const panelFixo = {
  ...panelStyle,
  position: 'fixed',
  left: 0,
  top: 0,
  zIndex: 12000,
};

const itemStyle = (active) => ({
  width: '100%',
  flexShrink: 0,
  padding: '7px 10px',
  borderRadius: 7,
  border: 'none',
  background: active ? 'color-mix(in srgb, var(--c6) 75%, transparent)' : 'transparent',
  color: active ? 'var(--c8)' : 'var(--c2)',
  fontSize: 12,
  fontFamily: 'var(--font-main)',
  fontWeight: active ? 700 : 400,
  opacity: active ? 1 : 0.75,
  cursor: 'pointer',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

/**
 * Lista suspensa no mesmo vidro do DateTimePicker, aberta na largura do campo.
 * Substitui o select nativo em qualquer lugar do desktop.
 */
export default function GlassSelect({
  value,
  onChange,
  options = [],
  label,
  placeholder = 'Selecionar',
  align = 'left',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const pos = usePopoverPos({ open, anchorRef: triggerRef, alturaMax: 268, align });

  const selecionado = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value]
  );

  useEffect(() => {
    if (!open) return undefined;
    const aoClicarFora = (event) => {
      const dentroDoCampo = rootRef.current && rootRef.current.contains(event.target);
      const dentroDaLista = panelRef.current && panelRef.current.contains(event.target);
      if (!dentroDoCampo && !dentroDaLista) setOpen(false);
    };
    const aoTeclar = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [open]);

  const alternar = () => {
    if (disabled) return;
    setOpen(!open);
  };

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      {label && <span style={labelStyle}>{label}</span>}

      <button
        type="button"
        ref={triggerRef}
        onClick={alternar}
        style={{ ...triggerStyle, opacity: disabled ? 0.55 : 1 }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: selecionado ? 'var(--c3)' : 'var(--c2)',
          }}
        >
          {selecionado ? selecionado.label : placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            opacity: 0.45,
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
        <div
          ref={panelRef}
          style={{
            ...panelFixo,
            left: pos.left,
            top: pos.top,
            width: pos.width,
            maxWidth: pos.width,
            maxHeight: pos.maxHeight,
          }}
        >
          <div
            className="glass-scroll"
            style={{
              width: '100%',
              maxHeight: Math.max(140, pos.maxHeight - 16),
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: '8px 6px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {options.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--c2)', padding: '4px 6px' }}>
                Nada aqui.
              </span>
            )}
            {options.map((option) => {
              const ativo = String(option.value) === String(value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className="dtp-hour"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={itemStyle(ativo)}
                  title={option.label}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
