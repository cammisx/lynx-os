import { ImageIcon, MoreIcon, BookIcon } from '@/components/icons';
import ChatIcon from '@/components/icons/ChatIcon';

/**
 * Barra inferior do celular, no estilo do dock do iOS: cinco lugares, ícone
 * em cima e nome embaixo, com marca embaixo do que está aberto.
 * O resto do sistema mora no "Mais", junto com o status do shift e das páginas.
 */
export const ABAS_MOBILE = [
  { id: 'chat', rotulo: 'Chat', Icone: ChatIcon },
  { id: 'playbook', rotulo: 'Playbook', Icone: BookIcon },
  { id: 'conteudo', rotulo: 'Conteúdo', Icone: ImageIcon },
  { id: 'inicio', rotulo: 'Mais', Icone: MoreIcon },
];

export default function MobileDock({ atual, abertos = [], naoLidas = 0, onIr }) {
  return (
    <nav
      aria-label="Menu principal"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9350,
        height: 'calc(58px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        alignItems: 'stretch',
        background: 'color-mix(in srgb, var(--c8) 78%, transparent)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        borderTop: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
        fontFamily: 'var(--font-main)',
      }}
    >
      {ABAS_MOBILE.map((aba) => {
        const Icone = aba.Icone;
        const ativa = atual === aba.id;
        const aberto = abertos.includes(aba.id);
        return (
          <button
            key={aba.id}
            type="button"
            onClick={() => onIr(aba.id)}
            aria-current={ativa ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              border: 'none',
              background: 'transparent',
              color: ativa ? 'var(--c1)' : 'color-mix(in srgb, var(--c3) 72%, transparent)',
              fontFamily: 'inherit',
              fontSize: 9.5,
              letterSpacing: '0.03em',
              padding: 0,
              position: 'relative',
            }}
          >
            <span style={{ position: 'relative', display: 'flex' }}>
              <Icone size={21} />
              {aba.id === 'chat' && naoLidas > 0 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -7,
                    minWidth: 14,
                    height: 14,
                    padding: '0 3px',
                    borderRadius: 999,
                    background: 'var(--c1)',
                    color: 'var(--c8)',
                    fontSize: 8,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              ) : null}
            </span>
            {aba.rotulo}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: 4,
                width: ativa || aberto ? 16 : 0,
                height: 2,
                borderRadius: 2,
                background: 'var(--c1)',
                opacity: ativa ? 1 : 0.45,
                transition: 'width 140ms ease',
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}
