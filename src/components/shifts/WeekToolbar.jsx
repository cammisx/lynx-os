import { useState } from 'react';

const arrowStyle = {
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
};

const menuButtonStyle = {
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 6,
  padding: '4px 8px',
  cursor: 'pointer',
  fontFamily: 'var(--font-main)',
};

export default function WeekToolbar({
  tabs,
  activeTab,
  onTabChange,
  weekLabel,
  onPrev,
  onNext,
  onToday,
  onPickDate,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dateInput, setDateInput] = useState('');

  const applyDate = () => {
    if (!dateInput) return;
    onPickDate(dateInput);
    setMenuOpen(false);
  };

  return (
    <div
      style={{
        height: 36,
        flexShrink: 0,
        padding: '0 12px 0 8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, overflow: 'hidden' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '2px solid transparent',
                borderBottomColor: isActive ? 'var(--c1)' : 'transparent',
                fontFamily: 'var(--font-main)',
                fontSize: 11,
                padding: '6px 10px',
                color: isActive ? 'var(--c1)' : 'var(--c2)',
                opacity: isActive ? 1 : 0.55,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 150ms ease, opacity 150ms ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', flexShrink: 0 }}>
        <button type="button" aria-label="Semana anterior" className="clk-nav-btn" style={arrowStyle} onClick={onPrev}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3 5 8l5 5" />
          </svg>
        </button>

        <button
          type="button"
          className="clk-week-label"
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--c3)',
            padding: '4px 8px',
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'var(--font-main)',
            whiteSpace: 'nowrap',
          }}
        >
          {weekLabel}
        </button>

        <button type="button" aria-label="Próxima semana" className="clk-nav-btn" style={arrowStyle} onClick={onNext}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>

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
              fontFamily: 'var(--font-main)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                onToday();
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

            <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.6 }}>Ir para data</span>

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
              onClick={applyDate}
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
    </div>
  );
}