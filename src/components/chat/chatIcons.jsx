/**
 * Ícones do chat que não existem no conjunto geral: enviar, voltar e buscar.
 * Mesmo traço fino dos outros ícones do desktop.
 */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const SendIcon = ({ size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M21.5 3.5 2.5 11l7 2.5 2.5 7 9.5-17Z" />
    <path d="M21.5 3.5 9.5 13.5" />
  </svg>
);

export const BackIcon = ({ size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const SearchIcon = ({ size = 15, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);
