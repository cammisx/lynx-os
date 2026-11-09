import { useEffect, useState } from 'react';

/**
 * Diz se o app está no modo escuro agora.
 *
 * O tema do Lynx é aplicado como atributo no <html> (`data-mode`), então quem
 * desenha em canvas ou precisa de uma cor fixa observa esse atributo e se
 * repinta quando a pessoa troca o modo nas configurações.
 */
const lerModo = () => {
  if (typeof document === 'undefined') return true;
  return (document.documentElement.getAttribute('data-mode') || 'dark') !== 'light';
};

export default function useModoEscuro() {
  const [escuro, setEscuro] = useState(lerModo);

  useEffect(() => {
    const observador = new MutationObserver(() => setEscuro(lerModo()));
    observador.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mode'],
    });
    return () => observador.disconnect();
  }, []);

  return escuro;
}