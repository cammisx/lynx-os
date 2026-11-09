/**
 * Placar pequeno, usado na tela de inicio dos jogos para mostrar o score que a
 * pessoa ja juntou. Fundo e borda saem dos tokens do tema, entao funciona no
 * claro e no escuro sem cor fixa.
 */
export default function PlacarTotal({ rotulo = 'score total', valor = 0 }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        minWidth: 118,
        padding: '7px 16px',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 62%, transparent)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-main)',
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--c1)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {valor}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-main)',
          fontSize: 8.5,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--c2)',
        }}
      >
        {rotulo}
      </span>
    </div>
  );
}