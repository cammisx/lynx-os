import { useEffect, useRef, useState } from 'react';
import StartMenu from '@/components/StartMenu';
import ClockPanel from '@/components/ClockPanel';

export default function Taskbar() {
  const [now, setNow] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const clockRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const date = now.toLocaleDateString([], {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <div className="taskbar">
      <div
        className={`taskbar-start${menuOpen ? ' is-active' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Iniciar"
        onClick={() => setMenuOpen((prev) => !prev)}
      />

      <div className="taskbar-right">
        <button type="button" className="taskbar-bell" aria-label="Notificações">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </button>

        <div
          ref={clockRef}
          className={`taskbar-clock${clockOpen ? ' is-open' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Abrir turnos"
          onClick={() => setClockOpen((prev) => !prev)}
        >
          <span className="clock-time">{time}</span>
          <span className="clock-date">{date}</span>
        </div>
      </div>

      <StartMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ClockPanel open={clockOpen} onClose={() => setClockOpen(false)} anchorRef={clockRef} />
    </div>
  );
}