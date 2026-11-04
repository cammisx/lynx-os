import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/AuthContext';

const ANIM_MS = 180;

export default function StartMenu({ open, onClose }) {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return undefined;
    }
    if (!mounted) return undefined;
    setClosing(true);
    const timeout = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, ANIM_MS);
    return () => clearTimeout(timeout);
  }, [open, mounted]);

  if (!mounted) return null;

  const source = (user?.nickname || user?.full_name || user?.email || '').trim();
  const words = source.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?';
  const displayName = user?.full_name || user?.nickname || user?.email || 'Conta';

  const panelStyle = {
    position: 'fixed',
    bottom: 'calc(100vh * 1.5 / 24 + 3px)',
    left: '3px',
    width: 'calc(100vw / 6)',
    height: '65vh',
    zIndex: 1100,
    borderRadius: 14,
    background: 'transparent',
    backdropFilter: 'blur(24px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
    border: '1px solid color-mix(in srgb, var(--c1) 20%, transparent)',
    boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transformOrigin: 'bottom left',
    animation: `${closing ? 'sm-out' : 'sm-in'} ${ANIM_MS}ms ease forwards`,
  };

  const bodyStyle = {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflowY: 'auto',
  };

  const footerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 'auto',
    padding: '12px 14px',
    borderTop: '1px solid color-mix(in srgb, var(--c1) 12%, transparent)',
  };

  const avatarStyle = {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'color-mix(in srgb, var(--c1) 25%, transparent)',
    border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--c1)',
    flexShrink: 0,
  };

  const powerStyle = {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: '1px solid color-mix(in srgb, var(--c1) 18%, transparent)',
    background: 'none',
    color: 'var(--c2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'background-color 150ms ease',
  };

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1099, background: 'transparent' }}
      />
      <div style={panelStyle}>
        <div style={bodyStyle} />
        <div style={footerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={avatarStyle}>{initials}</div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--c3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </span>
          </div>
          <button
            type="button"
            aria-label="Sair"
            onClick={() => logout()}
            style={powerStyle}
            className="start-power"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}