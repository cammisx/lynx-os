import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';

/**
 * Aviso passageiro do sistema: vidro, no topo, some sozinho em 3 segundos.
 *
 * Mora em portal no body e na camada mais alta para aparecer por cima de
 * janela, modal e menu.
 */
export function Aviso({ texto }) {
  if (!texto || typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: 'min(92vw, 420px)',
        padding: '10px 16px',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 78%, transparent)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 14px 36px rgba(0,0,0,0.5)',
        color: 'var(--c3)',
        fontFamily: 'var(--font-main)',
        fontSize: 12,
        lineHeight: 1.45,
        textAlign: 'center',
        animation: 'clk-menu-in 160ms ease',
      }}
    >
      {texto}
    </div>,
    document.body
  );
}

/** Texto do aviso + o componente pronto para renderizar. */
export default function useAviso() {
  const [texto, setTexto] = useState('');

  const avisar = useCallback((mensagem) => {
    setTexto(String(mensagem || ''));
  }, []);

  useEffect(() => {
    if (!texto) return undefined;
    const id = setTimeout(() => setTexto(''), 3000);
    return () => clearTimeout(id);
  }, [texto]);

  return { texto, avisar, Aviso: <Aviso texto={texto} /> };
}
