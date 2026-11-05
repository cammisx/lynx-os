import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons';
import NotificationRow from '@/components/notifications/NotificationRow';

export default function NotificationsPanel({ items, anchorRef, onOpen, onClose }) {
  const panelRef = useRef(null);

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
        border: '1px solid color-mix(in srgb, white 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
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
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c3)' }}>Notificações</span>
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
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--c2)',
              opacity: 0.6,
            }}
          >
            Nada por aqui.
          </div>
        ) : (
          items.map((notification) => (
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