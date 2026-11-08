import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckAllIcon, CloseIcon, GearIcon } from '@/components/icons';
import NotificationRow from '@/components/notifications/NotificationRow';
import { isNaoLida } from '@/lib/notificacoes';
import { abrirConfigNaAba } from '@/lib/configAba';

export default function NotificationsPanel({ items, anchorRef, onOpen, onClose, onMarcarTodas }) {
  const panelRef = useRef(null);
  const [filtro, setFiltro] = useState('nao_lidas');

  const naoLidas = useMemo(() => items.filter(isNaoLida), [items]);
  const visiveis = filtro === 'nao_lidas' ? naoLidas : items;

  useEffect(() => {
    const handleDown = (event) => {
      if (panelRef.current && panelRef.current.contains(event.target)) return;
      if (anchorRef && anchorRef.current && anchorRef.current.contains(event.target)) return;
      onClose();
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: 'calc(100vh * 1.5 / 24)',
        right: 3,
        width: 340,
        maxHeight: 420,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 12,
        background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid color-mix(in srgb, var(--ink-hex) 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
        boxShadow: '0 -2px 24px rgba(0,0,0,0.45)',
        zIndex: 9100,
        fontFamily: 'var(--font-main)',
        animation: 'clk-panel-in 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        style={{
          height: 34,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 12px',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c3)' }}>
          {config ? 'Som de notificação' : 'Notificações'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!config && (
            <button
              type="button"
              aria-label="Marcar todas como lidas"
              title={
                naoLidas.length
                  ? `Marcar ${naoLidas.length} como lidas`
                  : 'Nenhuma notificação não lida'
              }
              onClick={() => onMarcarTodas?.()}
              disabled={!naoLidas.length}
              className="clk-nav-btn"
              style={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: 'none',
                borderRadius: 6,
                background: 'transparent',
                color: naoLidas.length ? 'var(--c1)' : 'var(--c12)',
                cursor: naoLidas.length ? 'pointer' : 'default',
                opacity: naoLidas.length ? 1 : 0.55,
              }}
            >
              <CheckAllIcon size={13} />
            </button>
          )}
          <button
            type="button"
            aria-label="Abrir as configurações de notificação"
            title="Configurações de notificação"
            onClick={() => {
              onClose();
              abrirConfigNaAba('notificacoes');
            }}
            className="clk-nav-btn"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--c2)',
              cursor: 'pointer',
            }}
          >
            <GearIcon size={12} />
          </button>
          <button
            type="button"
            aria-label="Fechar notificações"
            onClick={onClose}
          className="clk-nav-btn"
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--c2)',
            cursor: 'pointer',
          }}
        >
            <CloseIcon size={12} />
          </button>
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexShrink: 0,
          padding: '0 8px',
          height: 28,
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
        }}
      >
        {[
          { id: 'nao_lidas', label: 'Não lidas', count: naoLidas.length },
          { id: 'todas', label: 'Ver todas', count: items.length },
        ].map((aba) => {
          const ativa = filtro === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setFiltro(aba.id)}
              style={{
                height: 28,
                padding: '0 8px',
                border: 'none',
                borderBottom: `2px solid ${ativa ? 'var(--c1)' : 'transparent'}`,
                borderRadius: 0,
                background: 'transparent',
                color: ativa ? 'var(--c1)' : 'var(--c2)',
                fontFamily: 'var(--font-main)',
                fontSize: 10,
                fontWeight: ativa ? 700 : 500,
                letterSpacing: '0.03em',
                opacity: ativa ? 1 : 0.6,
                cursor: 'pointer',
                transition: 'color 0.15s, opacity 0.15s',
              }}
            >
              {aba.label} ({aba.count})
            </button>
          );
        })}
      </div>
      <div
        className="glass-scroll"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}
      >
        {visiveis.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--c2)',
              opacity: 0.6,
            }}
          >
            {filtro === 'nao_lidas' ? 'Nada não lido.' : 'Nada por aqui.'}
          </div>
        ) : (
          visiveis.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              read={Boolean(notification.lida) || notification.status === 'resolvida'}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>,
    document.body
  );
}