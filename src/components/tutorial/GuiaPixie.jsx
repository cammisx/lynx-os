import { useEffect, useRef } from 'react';

/**
 * A pixie que guia o tutorial da rota /tutorial.
 *
 * O desenho vem da folha de sprites que a Chloë mandou (ver
 * scripts/extrair-pixie.py): três quadros do bote das asas, já com o fundo
 * preto virando transparência. A tira é animada por background-position em
 * steps, então não tem nada de canvas rodando.
 *
 * Ela passeia sozinha pela área de trabalho numa senoide lenta e o balão de
 * fala vai junto, porque mora dentro do mesmo grupo que se move. Nada aqui
 * captura clique (a camada é pointer-events: none): o desktop atrás continua
 * sendo o de verdade. Com "reduzir movimento" ligado, ela fica parada e sem
 * asas batendo.
 */

const DESLOCAMENTO_X = 0.34; // metade do caminho horizontal, em fração da tela
const VELOCIDADE_X = 0.15; // radianos por segundo (bem devagar)
const BASE_Y = 0.62;
const DESLOCAMENTO_Y = 0.055;
const VELOCIDADE_Y = 0.37;

/* Tamanho de um quadro na folha e o quanto ele cresce na tela. */
const QUADRO_LARG = 26;
const QUADRO_ALT = 24;
const QUADROS = 3;
const ESCALA = 3;
const LARGURA = QUADRO_LARG * ESCALA;
const ALTURA = QUADRO_ALT * ESCALA;

const ESTILOS = `
@keyframes pixie-quadros {
  from { background-position-x: 0; }
  to { background-position-x: -${QUADRO_LARG * QUADROS * ESCALA}px; }
}
@keyframes pixie-pisca {
  0%, 100% { opacity: 0; transform: scale(0.4); }
  45% { opacity: 0.9; transform: scale(1); }
}
@keyframes pixie-balao {
  from { opacity: 0; transform: translate(-50%, -66px) scale(0.94); }
  to { opacity: 1; transform: translate(-50%, -78px) scale(1); }
}
.pixie-corpo {
  background-image: url(/tutorial/pixie-dourada.png);
  background-repeat: no-repeat;
  background-size: ${LARGURA * QUADROS}px ${ALTURA}px;
  animation: pixie-quadros 0.42s steps(${QUADROS}) infinite;
  filter: drop-shadow(0 0 7px rgba(240, 148, 58, 0.6)) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.45));
}
.pixie-pisca { animation: pixie-pisca 2.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pixie-corpo { animation: none !important; }
  .pixie-pisca { animation: none !important; opacity: 0.5; }
}
`;

/** Estrelinha de quatro pontas: o brilho que sobra no caminho dela. */
const Estrela = ({ tamanho, atraso, x, y }) => (
  <span
    className="pixie-pisca"
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: tamanho,
      height: tamanho,
      background: 'var(--c1)',
      clipPath:
        'polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)',
      animationDelay: `${atraso}s`,
      animationDuration: `${2.6 + atraso}s`,
    }}
  />
);

export default function GuiaPixie({ texto = 'Boas vindas à Lynx' }) {
  const grupoRef = useRef(null);
  const corpoRef = useRef(null);

  useEffect(() => {
    const grupo = grupoRef.current;
    if (!grupo) return undefined;

    const semMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const inicio = performance.now();
    let lado = 0;
    let raf = 0;

    const desenhar = (agora) => {
      const t = (agora - inicio) / 1000;
      const largura = window.innerWidth;
      const altura = window.innerHeight;

      const x = semMovimento ? 0.5 : 0.5 + DESLOCAMENTO_X * Math.sin(t * VELOCIDADE_X);
      const y = semMovimento ? BASE_Y : BASE_Y + DESLOCAMENTO_Y * Math.sin(t * VELOCIDADE_Y + 0.8);

      grupo.style.transform = `translate3d(${(x * largura).toFixed(1)}px, ${(y * altura).toFixed(1)}px, 0)`;

      /* Vira para o lado do caminho. O balão fica de fora para o texto não
         aparecer espelhado. */
      const direcao = Math.cos(t * VELOCIDADE_X) >= 0 ? 1 : -1;
      if (direcao !== lado && corpoRef.current) {
        lado = direcao;
        corpoRef.current.style.transform = `scaleX(${direcao})`;
      }

      raf = requestAnimationFrame(desenhar);
    };

    raf = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div aria-live="polite" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9500 }}>
      <style>{ESTILOS}</style>

      <div
        ref={grupoRef}
        style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, willChange: 'transform' }}
      >
        {/* brilho que fica para trás */}
        <Estrela tamanho={6} atraso={0} x={-34} y={-18} />
        <Estrela tamanho={4} atraso={0.7} x={24} y={-6} />
        <Estrela tamanho={5} atraso={1.4} x={-16} y={12} />
        <Estrela tamanho={3} atraso={1.9} x={30} y={18} />

        {/* corpo, apoiado no ponto do caminho */}
        <div
          ref={corpoRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: LARGURA,
            height: ALTURA,
            marginLeft: -LARGURA / 2,
            marginTop: -ALTURA + 6,
            transition: 'transform 0.35s ease',
          }}
        >
          <div className="pixie-corpo" style={{ width: LARGURA, height: ALTURA }} />
        </div>

        {/* balão de fala */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translate(-50%, -78px)',
            padding: '8px 13px',
            borderRadius: 12,
            whiteSpace: 'nowrap',
            fontSize: 12,
            letterSpacing: '0.01em',
            color: 'var(--c3)',
            fontFamily: 'var(--font-main)',
            background: 'color-mix(in srgb, var(--c8) 80%, transparent)',
            border: '1px solid color-mix(in srgb, var(--c1) 34%, transparent)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 10px 26px rgba(0, 0, 0, 0.35)',
            animation: 'pixie-balao 0.6s ease-out both',
          }}
        >
          {texto}
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              width: 0,
              height: 0,
              transform: 'translateX(-50%)',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '7px solid color-mix(in srgb, var(--c1) 34%, transparent)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
