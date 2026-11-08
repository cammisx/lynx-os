import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons';

/**
 * Folha que sobe do rodapé, no estilo dos apps de celular.
 *
 * Serve para o que no desktop é menu, painel ou popover: lista de apps,
 * notificações. Fecha pelo X, tocando fora ou com Esc.
 */
export default function MobileSheet({ titulo = '', subtitulo = '', onFechar, children, alturaMax = '78dvh' }) {
  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape') onFechar?.();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9600,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.42)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        fontFamily: 'var(--font-main)',
        animation: 'mobile-fade 140ms ease-out',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo || 'Painel'}
        style={{
          width: '100%',
          maxHeight: alturaMax,
          display: 'flex',
          flexDirection: 'column',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          background: 'color-mix(in srgb, var(--c8) 82%, transparent)',
          backdropFilter: 'blur(26px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(26px) saturate(1.4)',
          borderTop: '1px solid color-mix(in srgb, var(--c1) 26%, transparent)',
          boxShadow: '0 -18px 50px rgba(0,0,0,0.5)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'mobile-sheet 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 38,
            height: 4,
            borderRadius: 999,
            margin: '8px auto 2px',
            background: 'color-mix(in srgb, var(--c2) 45%, transparent)',
            flexShrink: 0,
          }}
        />
        {titulo ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 14px 10px',
              borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                  color: 'var(--c1)',
                }}
              >
                {titulo}
              </span>
              {subtitulo ? (
                <span style={{ fontSize: 10.5, color: 'var(--c2)' }}>{subtitulo}</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: 10,
                background: 'color-mix(in srgb, var(--c2) 12%, transparent)',
                color: 'var(--c3)',
                padding: 0,
              }}
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ) : null}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
