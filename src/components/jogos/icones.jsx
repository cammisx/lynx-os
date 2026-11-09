/** Icones dos jogos: traco simples, na cor do texto do card. */

const caixa = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true };

export function Icone2048({ tamanho = 22 }) {
  return (
    <svg {...caixa} width={tamanho} height={tamanho}>
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
      <rect x="13" y="13" width="8.5" height="8.5" rx="2" fill="currentColor" opacity="0.65" />
    </svg>
  );
}

export function IconeCobrinha({ tamanho = 22 }) {
  return (
    <svg {...caixa} width={tamanho} height={tamanho}>
      <path
        d="M4 7h6a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="18.4" cy="6" r="1.9" fill="currentColor" />
      <circle cx="4" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconeCampo({ tamanho = 22 }) {
  return (
    <svg {...caixa} width={tamanho} height={tamanho}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4M4.8 4.8l2.4 2.4M16.8 16.8l2.4 2.4M19.2 4.8l-2.4 2.4M7.2 16.8l-2.4 2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

export function IconePokemon({ tamanho = 22 }) {
  return (
    <svg {...caixa} width={tamanho} height={tamanho}>
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.4 12h5.2M15.4 12h5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
