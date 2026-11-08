import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import { nomeDoPet } from '@/lib/pets';

const LIMITE = 24;

/**
 * Dá nome ao bicho. O nome aparece no balão de fala e no tooltip do mouse.
 * Deixar vazio volta a chamar pelo nome da espécie.
 */
export default function PetNomeModal({ pet, nome = '', onFechar, onSalvar }) {
  const [texto, setTexto] = useState(nome);
  const campoRef = useRef(null);

  useEffect(() => {
    const campo = campoRef.current;
    if (!campo) return;
    campo.focus();
    campo.select();
  }, []);

  const enviar = () => {
    onSalvar?.(texto.trim().slice(0, LIMITE));
    onFechar();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9950,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Nome do pet" style={{ ...MODAL_CAIXA, width: 380 }}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 12.5,
                letterSpacing: '0.04em',
                color: 'var(--c1)',
              }}
            >
              NOMEAR
            </span>
            <span style={{ fontSize: 10, color: 'var(--c2)' }}>
              Como você chama esse {nomeDoPet(pet).toLowerCase()}
            </span>
          </div>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            ref={campoRef}
            value={texto}
            maxLength={LIMITE}
            placeholder={nomeDoPet(pet)}
            onChange={(evento) => setTexto(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') enviar();
              if (evento.key === 'Escape') onFechar();
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c1) 35%, transparent)',
              background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
              color: 'var(--c3)',
              fontFamily: 'var(--font-main)',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onFechar}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                background: 'transparent',
                color: 'var(--c3)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={enviar}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c1) 55%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
                color: 'var(--c1)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
