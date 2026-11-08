import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import StartMenu from '@/components/StartMenu';
import ClockPanel from '@/components/ClockPanel';
import NotificationsPanel from '@/components/notifications/NotificationsPanel';
import JustificativaModal from '@/components/notifications/JustificativaModal';
import ConfirmarTurnoModal from '@/components/notifications/ConfirmarTurnoModal';
import VendaPendenteModal from '@/components/vendas/VendaPendenteModal';
import FolgaPendenteModal from '@/components/solicitacoes/FolgaPendenteModal';
import HorarioDisponivelModal from '@/components/solicitacoes/HorarioDisponivelModal';
import CutucadaModal from '@/components/notifications/CutucadaModal';
import useNotifications from '@/hooks/useNotifications';
import usePreferenciaSom from '@/hooks/usePreferenciaSom';
import ChatIcon from '@/components/icons/ChatIcon';
import { useChatPanel } from '@/components/chat/ChatProvider';
import { useAuth } from '@/lib/AuthContext';
import { nomeDaPessoa } from '@/lib/pessoas';
import { janelaPorId } from '@/lib/janelas';

export default function Taskbar({ onOpenApp, janelas = [], janelaAtiva = null, onAlternarJanela }) {
  const { user } = useAuth();
  const { items, naoLidas, markRead, markAllRead, reload } = useNotifications(
    user?.id,
    user?.role === 'admin'
  );
  const preferenciaSom = usePreferenciaSom();
  const chat = useChatPanel();
  const [now, setNow] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [justificativa, setJustificativa] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [vendaPendente, setVendaPendente] = useState(null);
  const [folgaPendente, setFolgaPendente] = useState(null);
  const [horarioLivre, setHorarioLivre] = useState(null);
  const [cutucada, setCutucada] = useState(null);
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

    if (notification.tipo === 'mencao') {
      if (notification.canal_id) {
        chat.abrir();
        chat.abrirCanal(notification.canal_id);
      }
      if (notification.status !== 'resolvida') {
        base44.entities.Notificacao.update(notification.id, { status: 'resolvida' }).catch(
          (erro) => console.warn('[Notificacao]', erro)
        );
        await reload();
      }
      return;
    }

    if (notification.tipo === 'cutucada') {
      if (notification.status === 'resolvida') return;
      setCutucada(notification);
      return;
    }

    if (notification.tipo === 'turno_esquecido') {
      setJustificativa(notification);
      return;
    }

    if (notification.tipo === 'folga_pendente') {
      if (notification.status === 'resolvida') return;
      setFolgaPendente(notification);
      return;
    }

    if (notification.tipo === 'horario_disponivel') {
      if (notification.status === 'resolvida') return;
      setHorarioLivre(notification);
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

      <div
        className="taskbar-janelas"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: '100%',
          marginLeft: 'calc(100vw / 12 + 8px)',
          overflow: 'hidden',
        }}
      >
        {janelas.map((janela) => {
          const meta = janelaPorId(janela.id);
          if (!meta) return null;
          const Icone = meta.Icone;
          const ativa = janelaAtiva === janela.id && !janela.minimizada;
          return (
            <button
              key={janela.id}
              type="button"
              onClick={() => onAlternarJanela && onAlternarJanela(janela.id)}
              title={janela.minimizada ? `Restaurar ${meta.titulo}` : `${meta.titulo} · minimizar`}
              aria-label={meta.titulo}
              aria-pressed={ativa}
              style={{
                position: 'relative',
                width: 36,
                height: 30,
                borderRadius: 8,
                border: ativa
                  ? '1px solid color-mix(in srgb, var(--c1) 55%, transparent)'
                  : '1px solid transparent',
                background: ativa
                  ? 'color-mix(in srgb, var(--c1) 16%, transparent)'
                  : 'color-mix(in srgb, var(--c8) 28%, transparent)',
                color: ativa ? 'var(--c1)' : 'var(--c2)',
                opacity: janela.minimizada ? 0.55 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color 140ms ease, opacity 140ms ease',
              }}
            >
              <Icone size={16} />
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: 3,
                  left: 10,
                  right: 10,
                  height: 2,
                  borderRadius: 2,
                  background: ativa ? 'var(--c1)' : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="taskbar-right">
        <button
          type="button"
          className="taskbar-bell taskbar-chat"
          aria-label="Chat interno"
          onClick={() => {
            chat.alternar();
            setBellOpen(false);
            setClockOpen(false);
          }}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChatIcon size={28} />
          {chat.totalNaoLidas > 0 && (
            <span className="taskbar-chat-badge">
              {chat.totalNaoLidas > 9 ? '9+' : chat.totalNaoLidas}
            </span>
          )}
        </button>

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
        onOpenConfig={() => {
          setMenuOpen(false);
          if (onOpenApp) onOpenApp('config');
        }}
      />
      <ClockPanel
        open={clockOpen}
        onClose={() => setClockOpen(false)}
        anchorRef={clockRef}
        notificacoes={items}
        onOpenJustificativa={openNotification}
      />

      {cutucada && (
        <CutucadaModal
          notificacao={cutucada}
          onClose={() => {
            setCutucada(null);
            reload();
          }}
        />
      )}

      {bellOpen && (
        <NotificationsPanel
          items={items}
          anchorRef={bellRef}
          onOpen={openNotification}
          onClose={() => setBellOpen(false)}
          preferencia={preferenciaSom}
          onMarcarTodas={markAllRead}
        />
      )}

      {horarioLivre && (
        <HorarioDisponivelModal
          notification={horarioLivre}
          onClose={() => setHorarioLivre(null)}
          onSaved={reload}
        />
      )}

      {folgaPendente && (
        <FolgaPendenteModal
          notification={folgaPendente}
          onClose={() => setFolgaPendente(null)}
          onSaved={reload}
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
          chatterNome={user ? nomeDaPessoa(user) : ''}
          onClose={() => setConfirmacao(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}