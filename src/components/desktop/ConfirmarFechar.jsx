import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Pergunta antes de fechar uma janela que tem alteração não salva.
 * Vale tanto para o X da janela quanto para o "Fechar" da barra de tarefas.
 */
export default function ConfirmarFechar({ titulo, onCancelar, onConfirmar }) {
  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape') onCancelar();
      if (evento.key === 'Enter') onConfirmar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCancelar, onConfirmar]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCancelar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fechar-titulo"
        style={{
          width: 'min(380px, calc(100vw - 40px))',
          borderRadius: 14,
          border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
          background: 'color-mix(in srgb, var(--c8) 82%, transparent)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span
          id="fechar-titulo"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            letterSpacing: '0.04em',
            color: 'var(--c1)',
          }}
        >
          Fechar {titulo || 'janela'}?
        </span>
        <span style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--c3)' }}>
          Tem alteração que ainda não foi salva. Se fechar agora, ela se perde.
        </span>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancelar}
            style={{
              height: 30,
              padding: '0 14px',
              borderRadius: 9,
              border: '1px solid color-mix(in srgb, var(--c2) 25%, transparent)',
              background: 'transparent',
              color: 'var(--c3)',
              fontFamily: 'inherit',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            style={{
              height: 30,
              padding: '0 14px',
              borderRadius: 9,
              border: '1px solid color-mix(in srgb, var(--erro) 45%, transparent)',
              background: 'color-mix(in srgb, var(--erro) 18%, transparent)',
              color: 'var(--erro)',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Fechar sem salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
