import { useEffect, useMemo, useRef, useState } from 'react';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const SLOTS = Array.from({ length: 48 }, (_, index) => index);

const slotOf = (date) => date.getHours() * 2 + (date.getMinutes() >= 30 ? 1 : 0);

const slotLabel = (slot) => `${pad(Math.floor(slot / 2))}:${pad((slot % 2) * 30)}`;

const pad = (value) => String(value).padStart(2, '0');

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDay = (date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
const formatTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const formatDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatValue = (value, mode) => {
  if (!value) {
    if (mode === 'date') return '--/--/----';
    if (mode === 'time') return '--:--';
    return '--/--/----  --:--';
  }
  if (mode === 'date') return formatDay(value);
  if (mode === 'time') return formatTime(value);
  return `${formatDay(value)}  ${formatTime(value)}`;
};

const triggerStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '9px 12px',
  borderRadius: 9,
  border: '1px solid color-mix(in srgb, var(--c1) 22%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c2)',
  fontFamily: 'var(--font-main)',
  fontSize: 13,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'border-color 0.15s, background 0.15s',
};

const labelStyle = {
  fontFamily: 'var(--font-main)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
  opacity: 0.5,
};

const navStyle = {
  width: 22,
  height: 22,
  borderRadius: 5,
  border: 'none',
  background: 'color-mix(in srgb, var(--c1) 10%, transparent)',
  color: 'var(--c1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
  flexShrink: 0,
};

const dayStyle = (state) => {
  const base = {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: 'none',
    background: 'transparent',
    color: 'var(--c2)',
    fontSize: 12,
    fontFamily: 'var(--font-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    cursor: 'pointer',
  };

  if (state.outside) return { ...base, opacity: 0.22, cursor: 'default' };
  if (state.selected)
    return {
      ...base,
      background: 'color-mix(in srgb, var(--c6) 75%, transparent)',
      color: 'var(--c8)',
      fontWeight: 700,
    };
  if (state.today) return { ...base, border: '1px solid color-mix(in srgb, var(--c6) 50%, transparent)', color: 'var(--c6)' };
  return base;
};

const hourStyle = (active) => ({
  padding: '6px 8px',
  borderRadius: 7,
  border: 'none',
  background: active ? 'color-mix(in srgb, var(--c6) 75%, transparent)' : 'transparent',
  color: active ? 'var(--c8)' : 'var(--c2)',
  fontSize: 12,
  fontFamily: 'var(--font-main)',
  fontWeight: active ? 700 : 400,
  opacity: active ? 1 : 0.6,
  cursor: 'pointer',
  textAlign: 'center',
});

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
  minWidth: 300,
};

export default function DateTimePicker({ value, onChange, label, mode = 'datetime', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value || new Date()));
  const [focusDate, setFocusDate] = useState(() => value || new Date());
  const rootRef = useRef(null);
  const hoursRef = useRef(null);

  const showCalendar = mode !== 'time';
  const showHours = mode !== 'date';

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

  const activeSlot = value ? slotOf(value) : null;

  useEffect(() => {
    if (!open || !hoursRef.current) return;
    const slot = activeSlot === null ? slotOf(new Date()) : activeSlot;
    const target = hoursRef.current.querySelector(`[data-slot="${slot}"]`);
    if (!target) return;
    hoursRef.current.scrollTop =
      target.offsetTop - hoursRef.current.clientHeight / 2 + target.offsetHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const gridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - monthStart.getDay());
    return Array.from(
      { length: 42 },
      (_, index) =>
        new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    );
  }, [viewMonth]);

  const toggleOpen = () => {
    if (!open) {
      const base = value || new Date();
      setViewMonth(startOfMonth(base));
      setFocusDate(base);
    }
    setOpen(!open);
  };

  const pickDay = (day) => {
    if (day.getMonth() !== viewMonth.getMonth()) return;
    const base = value || focusDate;
    const next = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      mode === 'date' ? 0 : base.getHours(),
      mode === 'date' ? 0 : base.getMinutes(),
      0,
      0
    );
    onChange(next);
    setFocusDate(next);
    if (mode === 'date') setOpen(false);
  };

  const pickSlot = (slot) => {
    const base = value || focusDate;
    const next = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      Math.floor(slot / 2),
      (slot % 2) * 30,
      0,
      0
    );
    onChange(next);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!open) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (step) {
      event.preventDefault();
      const next = new Date(focusDate);
      next.setDate(next.getDate() + step);
      setFocusDate(next);
      setViewMonth(startOfMonth(next));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      pickDay(focusDate);
    }
  };

  const today = new Date();
  const monthLabel = `${MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={labelStyle}>{label}</span>}

      <button type="button" className="dtp-trigger" onClick={toggleOpen} style={triggerStyle}>
        <span>{formatValue(value, mode)}</span>
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
          style={{ opacity: 0.45, flexShrink: 0 }}
        >
          <rect x="3" y="5" width="18" height="16" rx="2.5" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <div style={align === 'right' ? { ...panelStyle, left: 'auto', right: 0 } : panelStyle}>
          {showCalendar && (
            <div
              style={{
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontFamily: 'var(--font-main)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <button
                  type="button"
                  aria-label="Mês anterior"
                  className="dtp-nav"
                  style={navStyle}
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3 5 8l5 5" />
                  </svg>
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c2)' }}>{monthLabel}</span>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  className="dtp-nav"
                  style={navStyle}
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {WEEKDAYS.map((day, index) => (
                  <span
                    key={`${day}-${index}`}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--c2)',
                      opacity: 0.35,
                      textAlign: 'center',
                    }}
                  >
                    {day}
                  </span>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {days.map((day) => {
                  const outside = day.getMonth() !== viewMonth.getMonth();
                  const selected = value ? sameDay(day, value) : false;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={
                        outside ? undefined : `dtp-day${selected ? ' is-selected' : ''}`
                      }
                      disabled={outside}
                      onClick={() => pickDay(day)}
                      style={dayStyle({
                        outside,
                        selected,
                        today: sameDay(day, today),
                      })}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showCalendar && showHours && (
            <div style={{ width: 1, background: 'color-mix(in srgb, var(--c1) 15%, transparent)', margin: '10px 0' }} />
          )}

          {showHours && (
            <div
              ref={hoursRef}
              className="dtp-hours"
              style={{
                position: 'relative',
                width: 72,
                maxHeight: 240,
                overflowY: 'auto',
                padding: '8px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                scrollbarWidth: 'none',
                fontFamily: 'var(--font-main)',
              }}
            >
              {SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  data-slot={slot}
                  className={`dtp-hour${activeSlot === slot ? ' is-active' : ''}`}
                  onClick={() => pickSlot(slot)}
                  style={hourStyle(activeSlot === slot)}
                >
                  {slotLabel(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}