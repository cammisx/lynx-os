import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import StartMenu from '@/components/StartMenu';
import ClockPanel from '@/components/ClockPanel';
import NotificationsPanel from '@/components/notifications/NotificationsPanel';
import JustificativaModal from '@/components/notifications/JustificativaModal';
import ConfirmarTurnoModal from '@/components/notifications/ConfirmarTurnoModal';
import VendaPendenteModal from '@/components/vendas/VendaPendenteModal';
import useNotifications from '@/hooks/useNotifications';
import { useAuth } from '@/lib/AuthContext';

export default function Taskbar({ onOpenApp }) {
  const { user } = useAuth();
  const { items, naoLidas, markRead, reload } = useNotifications(user?.id);
  const [now, setNow] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [justificativa, setJustificativa] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [vendaPendente, setVendaPendente] = useState(null);
  const clockRef = useRef(null);
  const bellRef = useRef(null);

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

  const openNotification = async (notification) => {
    markRead(notification.id);
    setBellOpen(false);

    if (notification.tipo === 'turno_esquecido') {
      setJustificativa(notification);
      return;
    }

    if (notification.tipo === 'venda_pendente') {
      if (notification.status === 'resolvida') return;
      setVendaPendente(notification);
      return;
    }

    if (notification.tipo === 'novo_shift') {
      // Já respondida: abre nada, só marca como lida.
      if (notification.status === 'resolvida') return;
      setConfirmacao(notification);
      return;
    }

    // Aviso de turno novo: só precisa ser lido, sem justificativa.
    if (notification.status !== 'resolvida') {
      try {
        await base44.entities.Notificacao.update(notification.id, { status: 'resolvida' });
      } catch (error) {
        console.warn('[Notificacao]', error);
      }
      await reload();
    }
  };

  const toggleBell = () => {
    if (!bellOpen) {
      reload();
      setClockOpen(false);
    }
    setBellOpen(!bellOpen);
  };

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
        <button
          ref={bellRef}
          type="button"
          className="taskbar-bell"
          aria-label="Notificações"
          onClick={toggleBell}
          style={{ position: 'relative' }}
        >
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
          {naoLidas > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 3,
                right: 3,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--c1)',
                boxShadow: '0 0 0 2px color-mix(in srgb, var(--c8) 65%, transparent)',
                animation: 'clk-punch-pulse 1.8s ease-in-out infinite',
              }}
            />
          )}
        </button>

        <div
          ref={clockRef}
          className={`taskbar-clock${clockOpen ? ' is-open' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Abrir turnos"
          onClick={() => {
            setClockOpen((prev) => !prev);
            setBellOpen(false);
          }}
        >
          <span className="clock-time">{time}</span>
          <span className="clock-date">{date}</span>
        </div>
      </div>

      <StartMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenApp={(app) => {
          setMenuOpen(false);
          if (onOpenApp) onOpenApp(app);
        }}
      />
      <ClockPanel
        open={clockOpen}
        onClose={() => setClockOpen(false)}
        anchorRef={clockRef}
        notificacoes={items}
        onOpenJustificativa={openNotification}
      />

      {bellOpen && (
        <NotificationsPanel
          items={items}
          anchorRef={bellRef}
          onOpen={openNotification}
          onClose={() => setBellOpen(false)}
        />
      )}

      {vendaPendente && (
        <VendaPendenteModal
          notification={vendaPendente}
          onClose={() => setVendaPendente(null)}
          onSaved={reload}
        />
      )}

      {justificativa && (
        <JustificativaModal
          notification={justificativa}
          onClose={() => setJustificativa(null)}
          onSaved={reload}
        />
      )}

      {confirmacao && (
        <ConfirmarTurnoModal
          notification={confirmacao}
          chatterNome={user?.full_name || ''}
          onClose={() => setConfirmacao(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}