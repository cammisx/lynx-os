import { useEffect, useRef, useState } from 'react';
import StartMenu from '@/components/StartMenu';
import ClockPanel from '@/components/ClockPanel';
import NotificationsPanel from '@/components/notifications/NotificationsPanel';
import useAcoesNotificacoes from '@/hooks/useAcoesNotificacoes';
import useNotifications from '@/hooks/useNotifications';
import usePreferenciaSom from '@/hooks/usePreferenciaSom';
import ChatIcon from '@/components/icons/ChatIcon';
import { useChatPanel } from '@/components/chat/ChatProvider';
import { useAuth } from '@/lib/AuthContext';
import { janelaPorId } from '@/lib/janelas';
import MenuFlutuante from '@/components/desktop/MenuFlutuante';

export default function Taskbar({
  onOpenApp,
  itens = [],
  janelaAtiva = null,
  onAlternarJanela,
  onFixarJanela,
  onAbrirJanela,
  onFecharJanela,
  onMoverJanela,
}) {
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
  const [menuJanela, setMenuJanela] = useState(null);
  const [arrastando, setArrastando] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const { abrir: abrirNotificacao, modais: modaisNotificacao } = useAcoesNotificacoes({ reload });
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

  const openNotification = (notification) => {
    markRead(notification.id);
    setBellOpen(false);
    abrirNotificacao(notification);
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

      <div className="taskbar-janelas">
        {itens.map((item, indice) => {
          const meta = janelaPorId(item.id);
          if (!meta) return null;
          const Icone = meta.Icone;
          const ativa = janelaAtiva === item.id && item.aberta && !item.minimizada;
          const classes = [
            'taskbar-janela',
            ativa ? 'is-ativa' : '',
            item.minimizada ? 'is-minimizada' : '',
            !item.aberta ? 'is-fechada' : '',
            item.fixada ? 'is-fixada' : '',
            arrastando === indice ? 'is-arrastando' : '',
            alvo === indice && arrastando !== null && arrastando !== indice ? 'is-alvo' : '',
          ]
            .filter(Boolean)
            .join(' ');

          const abrirMenu = (evento) => {
            evento.preventDefault();
            setMenuJanela({ id: item.id, ancora: evento.currentTarget });
          };

          return (
            <button
              key={item.id}
              type="button"
              className={classes}
              draggable
              onDragStart={(evento) => {
                setArrastando(indice);
                setMenuJanela(null);
                evento.dataTransfer.effectAllowed = 'move';
                evento.dataTransfer.setData('text/plain', item.id);
              }}
              onDragOver={(evento) => {
                if (arrastando === null) return;
                evento.preventDefault();
                evento.dataTransfer.dropEffect = 'move';
                setAlvo(indice);
              }}
              onDrop={(evento) => {
                evento.preventDefault();
                if (arrastando !== null && onMoverJanela) onMoverJanela(arrastando, indice);
                setArrastando(null);
                setAlvo(null);
              }}
              onDragEnd={() => {
                setArrastando(null);
                setAlvo(null);
              }}
              onClick={() => onAlternarJanela && onAlternarJanela(item.id)}
              onContextMenu={abrirMenu}
              title={item.aberta ? meta.titulo : `${meta.titulo} (fechada, fixada)`}
              aria-label={meta.titulo}
              aria-pressed={ativa}
              data-rotulo={meta.titulo}
              data-menu-own="true"
            >
              <Icone size={22} />
              <span
                aria-hidden="true"
                className={`taskbar-janela-marca${ativa ? '' : ' is-apagada'}`}
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
          <ChatIcon size={22} />
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
            width="27"
            height="27"
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

      {menuJanela
        ? (() => {
            const item = itens.find((atual) => atual.id === menuJanela.id);
            const meta = janelaPorId(menuJanela.id);
            if (!item || !meta) return null;
            /* Abrir só faz sentido com a janela minimizada ou fechada. */
            const opcoes = [
              {
                id: 'fixar',
                rotulo: item.fixada
                  ? 'Desafixar da barra de tarefas'
                  : 'Fixar na barra de tarefas',
                acao: () => onFixarJanela && onFixarJanela(item.id),
              },
              !item.aberta || item.minimizada
                ? {
                    id: 'abrir',
                    rotulo: item.minimizada ? 'Restaurar' : 'Abrir',
                    acao: () => onAbrirJanela && onAbrirJanela(item.id),
                  }
                : null,
              item.aberta
                ? {
                    id: 'fechar',
                    rotulo: 'Fechar',
                    perigo: true,
                    acao: () => onFecharJanela && onFecharJanela(item.id),
                  }
                : null,
            ].filter(Boolean);
            return (
              <MenuFlutuante
                ancora={menuJanela.ancora}
                itens={opcoes}
                onFechar={() => setMenuJanela(null)}
              />
            );
          })()
        : null}

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

      {modaisNotificacao}
    </div>
  );
}