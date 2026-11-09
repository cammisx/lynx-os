import { escuro } from '@/components/jogos/EstruturaJogo';

/**
 * A "gozada": splash branco cobrindo a area do jogo, com o cartao por cima.
 *
 * O splash entra primeiro e o cartao aparece logo depois, para a tela nao ficar
 * branca com texto em cima. Usado no fim de partida, ganhando ou perdendo, e o
 * texto muda conforme o resultado.
 *
 * Precisa estar dentro de um container com `position: relative`.
 */
export default function EfeitoGozada({ titulo, texto, acao }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        pointerEvents: 'none',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 12,
          opacity: 0.96,
          filter: 'blur(1px)',
          background:
            'radial-gradient(ellipse 44% 40% at 50% 46%, rgba(255,255,255,1) 0 55%, rgba(255,255,255,0.78) 72%, rgba(255,255,255,0) 100%),' +
            'radial-gradient(circle at 24% 24%, rgba(255,255,255,0.95) 0 12%, rgba(255,255,255,0) 30%),' +
            'radial-gradient(circle at 78% 30%, rgba(255,255,255,0.92) 0 10%, rgba(255,255,255,0) 27%),' +
            'radial-gradient(circle at 36% 78%, rgba(255,255,255,0.94) 0 14%, rgba(255,255,255,0) 33%),' +
            'radial-gradient(circle at 72% 76%, rgba(255,255,255,0.86) 0 10%, rgba(255,255,255,0) 26%),' +
            'radial-gradient(ellipse 6% 26% at 16% 52%, rgba(255,255,255,0.8) 0 70%, rgba(255,255,255,0) 100%),' +
            'radial-gradient(ellipse 26% 5% at 62% 90%, rgba(255,255,255,0.7) 0 70%, rgba(255,255,255,0) 100%),' +
            'radial-gradient(ellipse 5% 22% at 88% 60%, rgba(255,255,255,0.65) 0 70%, rgba(255,255,255,0) 100%)',
          animation: 'splashGozo 560ms ease-out both',
        }}
      />

      <div
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          maxWidth: 300,
          padding: '18px 20px',
          borderRadius: 14,
          border: `1px solid ${escuro(18)}`,
          background: 'rgba(16,10,23,0.9)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          textAlign: 'center',
          animation: 'entraPlacar 320ms ease-out 300ms both',
        }}
      >
        {titulo ? (
          <span
            style={{
              fontFamily: 'var(--font-main)',
              fontSize: 15,
              fontWeight: 800,
              lineHeight: 1.35,
              color: '#ffe08a',
            }}
          >
            {titulo}
          </span>
        ) : null}
        {texto ? (
          <span
            style={{
              fontFamily: 'var(--font-main)',
              fontSize: 11.5,
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.82)',
            }}
          >
            {texto}
          </span>
        ) : null}
        {acao}
      </div>

      <style>{`
        @keyframes splashGozo {
          0%   { opacity: 0; transform: scale(0.6); }
          45%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0.9; transform: scale(1.05); }
        }
        @keyframes entraPlacar {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
