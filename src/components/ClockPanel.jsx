import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import WeekGrid from '@/components/shifts/WeekGrid';

const DAY_MS = 86400000;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const shortDate = (date) =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function ClockPanel({ open, onClose, anchorRef }) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [shifts, setShifts] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleDown = (event) => {
      if (panelRef.current && panelRef.current.contains(event.target)) return;
      if (anchorRef && anchorRef.current && anchorRef.current.contains(event.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const weekEnd = new Date(anchor.getTime() + 7 * DAY_MS);
    base44.entities.Shift.filter({
      inicio: { $lt: weekEnd.toISOString() },
      fim: { $gt: anchor.toISOString() },
    })
      .then((result) => {
        if (!active) return;
        const rows = Array.isArray(result) ? result : result?.items || [];
        setShifts(rows);
      })
      .catch(() => {
        if (active) setShifts([]);
      });
    return () => {
      active = false;
    };
  }, [open, anchor]);

  if (!open) return null;

  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const weekLabel = `${shortDate(days[0])} – ${shortDate(days[6])}`;

  const navStyle = {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: 'var(--c2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--c3)',
    padding: '4px 8px',
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-main)',
  };

  const menuButtonStyle = {
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-main)',
  };

  const dateValue = dateInput;
  const goToDate = () => {
    if (!dateValue) return;
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    setAnchor(startOfDay(parsed));
    setMenuOpen(false);
  };

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: 'calc(100vh * 1.5 / 24)',
        right: 3,
        width: 700,
        height: 500,
        background: 'color-mix(in srgb, var(--c8) 35%, transparent)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid color-mix(in srgb, var(--c1) 22%, transparent)',
        borderRadius: 16,
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
        zIndex: 1200,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'clk-panel-in 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        fontFamily: 'var(--font-main)',
      }}
    >
      <div
        style={{
          height: 36,
          padding: '0 12px 0 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c2)' }}>Turnos</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            type="button"
            aria-label="Semana anterior"
            className="clk-nav-btn"
            style={navStyle}
            onClick={() => setAnchor((prev) => addDays(prev, -7))}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3 5 8l5 5" />
            </svg>
          </button>

          <button
            type="button"
            className="clk-week-label"
            style={labelStyle}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {weekLabel}
          </button>

          <button
            type="button"
            aria-label="Próxima semana"
            className="clk-nav-btn"
            style={navStyle}
            onClick={() => setAnchor((prev) => addDays(prev, 7))}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'color-mix(in srgb, var(--c8) 85%, transparent)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid color-mix(in srgb, var(--c2) 15%, transparent)',
              borderRadius: 10,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              minWidth: 180,
              zIndex: 9999,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAnchor(startOfDay(new Date()));
                setMenuOpen(false);
              }}
              style={{
                ...menuButtonStyle,
                background: 'color-mix(in srgb, var(--c1) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
                color: 'var(--c1)',
              }}
            >
              Hoje
            </button>

            <div style={{ height: 1, background: 'color-mix(in srgb, var(--c2) 15%, transparent)' }} />

            <input
              type="date"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              style={{
                background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
                borderRadius: 6,
                fontSize: 11,
                color: 'var(--c3)',
                padding: '4px 6px',
                fontFamily: 'var(--font-main)',
              }}
            />

            <button
              type="button"
              onClick={goToDate}
              style={{
                ...menuButtonStyle,
                background: 'color-mix(in srgb, var(--c5) 20%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c5) 40%, transparent)',
                color: 'var(--c5)',
              }}
            >
              Ir
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '8px 8px 6px', display: 'flex', flexDirection: 'column' }}>
        <WeekGrid days={days} shifts={shifts} userId={user?.id} />
      </div>
    </div>,
    document.body
  );
}