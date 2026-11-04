import { useEffect, useRef, useState } from 'react';

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '5px 10px',
  borderRadius: 8,
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  textAlign: 'left',
  cursor: 'pointer',
  outline: 'none',
};

const listStyle = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  background: 'color-mix(in srgb, var(--c8) 85%, transparent)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid color-mix(in srgb, var(--c2) 15%, transparent)',
  borderRadius: 10,
  padding: 6,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  maxHeight: 210,
  overflowY: 'auto',
};

export default function GlassSelect({ value, options, onChange, placeholder = 'Selecione…', disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleDown = (event) => {
      if (rootRef.current && rootRef.current.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open]);

  const current = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        style={{ ...fieldStyle, cursor: disabled ? 'default' : 'pointer' }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 12,
              color: current ? 'var(--c3)' : 'var(--c2)',
              opacity: current ? 1 : 0.6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {current ? current.label : placeholder}
          </span>
          {current?.sublabel && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--c2)',
                opacity: 0.7,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {current.sublabel}
            </span>
          )}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            transition: 'transform 0.12s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && !disabled && (
        <div style={listStyle}>
          {options.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.6, padding: '6px 8px' }}>
              Nenhum usuário disponível.
            </span>
          )}
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className="gs-option"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 7,
                  border: 'none',
                  background: selected ? 'color-mix(in srgb, var(--c1) 15%, transparent)' : 'none',
                  color: selected ? 'var(--c1)' : 'var(--c2)',
                  fontFamily: 'var(--font-main)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 12 }}>{option.label}</span>
                {option.sublabel && (
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{option.sublabel}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}