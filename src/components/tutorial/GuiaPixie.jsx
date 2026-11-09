import { useEffect, useRef } from 'react';

/**
 * A pixie que guia o tutorial da rota /tutorial.
 *
 * Ela passeia sozinha pela área de trabalho: o caminho é uma senoide lenta,
 * então nunca fica parada nem corre, e o balão de fala vai junto porque mora
 * dentro do mesmo grupo que se move.
 *
 * Nada aqui captura clique (a camada inteira é pointer-events: none): o
 * desktop atrás continua sendo o de verdade, com janelas e menu funcionando.
 * Com "reduzir movimento" ligado no sistema, ela fica no lugar e sem asas
 * batendo.
 */

const DESLOCAMENTO_X = 0.34; // metade do caminho horizontal, em fração da tela
const VELOCIDADE_X = 0.15; // radianos por segundo (bem devagar)
const BASE_Y = 0.62;
const DESLOCAMENTO_Y = 0.055;
const VELOCIDADE_Y = 0.37;

const ESTILOS = `
@keyframes pixie-asa-esq {
  0%, 100% { transform: scaleX(1) rotate(0deg); }
  50% { transform: scaleX(0.52) rotate(-7deg); }
}
@keyframes pixie-asa-dir {
  0%, 100% { transform: scaleX(1) rotate(0deg); }
  50% { transform: scaleX(0.52) rotate(7deg); }
}
@keyframes pixie-aura {
  0%, 100% { opacity: 0.75; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}
@keyframes pixie-pisca {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  45% { opacity: 0.9; transform: scale(1); }
}
@keyframes pixie-balao {
  from { opacity: 0; transform: translate(-50%, -66px) scale(0.94); }
  to { opacity: 1; transform: translate(-50%, -78px) scale(1); }
}
.pixie-asa-esq, .pixie-asa-dir, .pixie-aura, .pixie-pisca {
  transform-box: fill-box;
  transform-origin: center;
}
.pixie-asa-esq { transform-origin: right center; animation: pixie-asa-esq 0.62s ease-in-out infinite; }
.pixie-asa-dir { transform-origin: left center; animation: pixie-asa-dir 0.62s ease-in-out infinite; }
.pixie-aura { animation: pixie-aura 3.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pixie-asa-esq, .pixie-asa-dir, .pixie-aura, .pixie-pisca { animation: none !important; }
}
`;

/** Estrelinha de quatro pontas: o brilho que sobra no caminho dela. */
const Estrela = ({ x, y, tamanho, atraso }) => (
  <path
    className="pixie-pisca"
    d={`M ${x} ${y - tamanho} L ${x + tamanho * 0.28} ${y - tamanho * 0.28} L ${x + tamanho} ${y} L ${
      x + tamanho * 0.28
    } ${y + tamanho * 0.28} L ${x} ${y + tamanho} L ${x - tamanho * 0.28} ${y + tamanho * 0.28} L ${
      x - tamanho
    } ${y} L ${x - tamanho * 0.28} ${y - tamanho * 0.28} Z`}
    style={{
      fill: 'var(--c1)',
      animation: `pixie-pisca ${2.6 + atraso}s ease-in-out ${atraso}s infinite`,
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
        {/* corpo, centralizado no ponto do caminho */}
        <div
          ref={corpoRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 76,
            height: 76,
            marginLeft: -38,
            marginTop: -50,
            transition: 'transform 0.35s ease',
          }}
        >
          <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label="Pixie">
            <defs>
              <radialGradient id="pixie-aura-grad">
                <stop offset="0%" style={{ stopColor: 'var(--c1)', stopOpacity: 0.55 }} />
                <stop offset="55%" style={{ stopColor: 'var(--c1)', stopOpacity: 0.16 }} />
                <stop offset="100%" style={{ stopColor: 'var(--c1)', stopOpacity: 0 }} />
              </radialGradient>
              <linearGradient id="pixie-corpo-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff6da" />
                <stop offset="55%" style={{ stopColor: 'var(--c1)' }} />
                <stop offset="100%" stopColor="#7b5cff" />
              </linearGradient>
              <linearGradient id="pixie-asa-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="100%" style={{ stopColor: 'var(--c1)', stopOpacity: 0.35 }} />
              </linearGradient>
            </defs>

            <circle className="pixie-aura" cx="38" cy="42" r="28" fill="url(#pixie-aura-grad)" />

            {/* asas */}
            <path
              className="pixie-asa-esq"
              d="M35 34 C26 22 12 25 5 33 C13 41 27 44 35 40 Z"
              fill="url(#pixie-asa-grad)"
            />
            <path
              className="pixie-asa-dir"
              d="M41 34 C50 22 64 25 71 33 C63 41 49 44 41 40 Z"
              fill="url(#pixie-asa-grad)"
            />

            {/* vestido */}
            <path
              d="M31 40 C27 49 23 57 19 62 C29 67 47 67 57 62 C53 57 49 49 45 40 Z"
              fill="url(#pixie-corpo-grad)"
              opacity="0.95"
            />
            <path d="M34 42 C32 49 30 55 28 60 C34 62 42 62 48 60 C46 55 44 49 42 42 Z" fill="#fff8e6" opacity="0.35" />

            {/* cabeça e cabelo */}
            <circle cx="38" cy="31" r="7.6" fill="#fff4e1" opacity="0.96" />
            <path
              d="M30 30 C27 21 34 16 41 18 C48 20 51 27 48 34 C46 28 43 25 39 25 C35 25 32 27 30 30 Z"
              fill="#6f5cff"
              opacity="0.92"
            />
            <circle cx="35.6" cy="31.4" r="0.9" fill="#3a2a6b" />
            <circle cx="40.6" cy="31.4" r="0.9" fill="#3a2a6b" />

            {/* estrelinhas do rastro */}
            <Estrela x="20" y="52" tamanho="3.4" atraso="0" />
            <Estrela x="56" y="56" tamanho="2.8" atraso="0.7" />
            <Estrela x="38" y="64" tamanho="2.4" atraso="1.4" />
            <Estrela x="12" y="38" tamanho="2.2" atraso="1.9" />
          </svg>
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
