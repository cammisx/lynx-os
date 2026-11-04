import { useEffect, useRef, useState } from 'react';

const OPTIONS = [
  { value: 'semanal', label: 'Toda semana' },
  { value: 'quinzenal', label: 'A cada 2 semanas' },
  { value: 'unica', label: 'Só nesta data' },
];

const fieldStyle = {
  width: '100%',
  height: 34,
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
};

const optionStyle = (selected) => ({
  width: '100%',
  padding: '7px 10px',
  borderRadius: 7,
  border: 'none',
  background: selected ? 'color-mix(in srgb, var(--c1) 15%, transparent)' : 'none',
  color: selected ? 'var(--c1)' : 'var(--c2)',
  fontFamily: 'var(--font-main)',
  fontSize: 12,
  textAlign: 'left',
  cursor: 'pointer',
});

export default function RepeatSelect({ value, onChange }) {
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

  const current = OPTIONS.find((option) => option.value === value) || OPTIONS[0];

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={fieldStyle}
      >
        <span>{current.label}</span>
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

      {open && (
        <div style={listStyle} role="listbox">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="rp-option"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={optionStyle(option.value === value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}