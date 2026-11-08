import { JANELAS } from '@/lib/janelas';

/**
 * Tela inicial do celular: saudação curta e a grade com todos os apps, como
 * a home de um Android ou iPhone. Cada ícone abre a janela correspondente.
 */
export default function MobileInicio({ nome = '', perfil, onAbrir }) {
  const hora = new Date().getHours();
  const saudacao = hora < 6 ? 'Boa madrugada' : hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiro = String(nome || '').trim().split(/\s+/)[0] || '';

  return (
    <div
      className="glass-scroll"
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '18px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        fontFamily: 'var(--font-main)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--c1)' }}>
          {saudacao}
          {primeiro ? `, ${primeiro}` : ''}
        </span>
        <span style={{ fontSize: 12, color: 'var(--c2)' }}>
          {perfil?.subnick?.trim() || 'O que vamos abrir hoje?'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {Object.entries(JANELAS).map(([id, meta]) => {
          const Icone = meta.Icone;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onAbrir(id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '12px 4px 10px',
                borderRadius: 16,
                border: '1px solid color-mix(in srgb, var(--c1) 18%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
                color: 'var(--c3)',
                fontFamily: 'inherit',
                minHeight: 78,
              }}
            >
              <span style={{ color: 'var(--c1)', display: 'flex' }}>
                <Icone size={24} />
              </span>
              <span style={{ fontSize: 10, letterSpacing: '0.02em', textAlign: 'center' }}>
                {meta.titulo}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
