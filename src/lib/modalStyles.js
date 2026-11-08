/**
 * Caixa padrão dos modais do desktop: mesmo vidro, mesma largura e altura
 * generosa para o conteúdo caber sem scroll interno.
 */
export const MODAL_CAIXA = {
  width: 480,
  maxWidth: '94vw',
  maxHeight: '94vh',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 12,
  background: 'color-mix(in srgb, var(--c8) 62%, transparent)',
  backdropFilter: 'blur(22px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
  border: '1px solid color-mix(in srgb, var(--ink-hex) 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
  boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
  fontFamily: 'var(--font-main)',
  overflow: 'hidden',
};
