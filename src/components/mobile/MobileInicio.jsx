import { janelasDaGrade } from '@/lib/janelas';
import { ehAdmin } from '@/lib/chat';
import MobileResumoDia from '@/components/mobile/MobileResumoDia';
import MobileStatusPaginas from '@/components/mobile/MobileStatusPaginas';
import MobileAcoesRapidas from '@/components/mobile/MobileAcoesRapidas';

/**
 * Tela inicial do celular (o "Mais" do dock): saudação, status do shift, status
 * das páginas, ações rápidas e a grade com o resto do sistema.
 * A grade segue o cargo: chatter só vê o que o desktop deixa (playbook e
 * conteúdo, que aqui já estão no dock), então pra ele a grade nem aparece.
 */
export default function MobileInicio({ nome = '', perfil, onAbrir, onRelogio, user }) {
  const hora = new Date().getHours();
  const saudacao = hora < 6 ? 'Boa madrugada' : hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiro = String(nome || '').trim().split(/\s+/)[0] || '';
  const admin = ehAdmin(user);
  const apps = janelasDaGrade(admin);

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

      {/* Turnos é janela de admin: pro chatter o resumo abre a agenda do relógio. */}
      <MobileResumoDia
        user={user}
        onAbrirTurnos={() => (admin ? onAbrir('turnos') : onRelogio?.())}
      />

      <MobileStatusPaginas />

      <MobileAcoesRapidas user={user} />

      {apps.length ? (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {apps.map(([id, meta]) => {
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
      ) : null}
    </div>
  );
}
