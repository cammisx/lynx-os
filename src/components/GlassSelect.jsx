import { useEffect, useRef, useState } from 'react';

const fieldStyle = (height, disabled) => ({
  width: '100%',
  height,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '0 10px',
  borderRadius: 8,
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 12,
  cursor: disabled ? 'default' : 'pointer',
  transition: 'border-color 0.15s, background 0.15s',
  outline: 'none',
});

const listStyle = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  maxHeight: 200,
  overflowY: 'auto',
  background: 'color-mix(in srgb, var(--c8) 88%, transparent)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid color-mix(in srgb, var(--c2) 15%, transparent)',
  borderRadius: 10,
  padding: 5,
  zIndex: 9999,
  boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
};

const optionStyle = (selected) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  width: '100%',
  padding: '7px 9px',
  borderRadius: 7,
  border: 'none',
  background: selected ? 'color-mix(in srgb, var(--c1) 15%, transparent)' : 'none',
  color: selected ? 'var(--c1)' : 'var(--c2)',
  fontFamily: 'var(--font-main)',
  fontSize: 12,
  textAlign: 'left',
  cursor: 'pointer',
});

export default function GlassSelect({
  value,
  options = [],
  onChange,
  placeholder = 'Selecione…',
  disabled,
  height = 34,
  width = '100%',
  emptyText = 'Nenhuma opção.',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleDown = (event) => {
      if (rootRef.current && rootRef.current.contains(event.target)) return;
      setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const current = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} style={{ position: 'relative', width }}>
      <button
        type="button"
        disabled={disabled}
        className="gs-field"
        onClick={() => setOpen((prev) => !prev)}
        style={fieldStyle(height, disabled)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {current?.prefix && (
            <span style={{ fontSize: 11, color: 'var(--c1)', flexShrink: 0 }}>
              ({current.prefix})
            </span>
          )}
          <span
            style={{
              fontSize: 12,
              color: current ? 'var(--c3)' : 'var(--c2)',
              opacity: current ? 1 : 0.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {current ? current.label : placeholder}
          </span>
          {current?.hint && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--c2)',
                opacity: 0.6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0,
              }}
            >
              {current.hint}
            </span>
          )}
        </span>

        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            color: 'var(--c2)',
            flexShrink: 0,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <path d="M4 6.5 L8 10.5 L12 6.5" />
        </svg>
      </button>

      {open && !disabled && (
        <div style={listStyle}>
          {options.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.6, padding: '6px 9px' }}>
              {emptyText}
            </span>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="gs-option"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={optionStyle(option.value === value)}
            >
              {option.prefix && (
                <span style={{ fontSize: 11, color: 'var(--c1)', flexShrink: 0 }}>
                  ({option.prefix})
                </span>
              )}
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {option.label}
              </span>
              {option.hint && (
                <span style={{ fontSize: 10, opacity: 0.6, flexShrink: 0 }}>{option.hint}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}