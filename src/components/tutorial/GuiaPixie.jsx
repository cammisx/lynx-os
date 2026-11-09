import { useEffect, useRef } from 'react';

/**
 * A pixie que guia o tutorial da rota /tutorial.
 *
 * O desenho vem dos sprites que a Chloë mandou, um arquivo por quadro (em
 * src/assets/pixie, montados por scripts/montar-pixie.py): a tira do corpo
 * traz o bote das asas, animado por background-position em steps (nada de
 * canvas).
 *
 * O voo é o de antes das poses do giro: ela não gira nem passeia pela tela,
 * só bate as asas e sobe e desce devagar, num vaivém de senoide.
 *
 * O balão mora no mesmo grupo (para acompanhar), mas é posicionado a cada
 * quadro com duas regras: fica sempre ACIMA do desenho dela, com folga, e
 * nunca encosta na borda da tela — se ela chega perto do lado, o balão desliza
 * e a pontinha continua apontando para ela.
 *
 * Nada aqui captura clique (a camada é pointer-events: none). Com "reduzir
 * movimento" ligado, ela fica parada e não pisca.
 */

/* O vaivém: ela fica no meio da tela e sobe e desce numa senoide lenta. */
const BASE_Y = 0.62;
const AMPLITUDE_Y = 0.045; // quanto sobe e desce, em fração da altura da tela
const VELOCIDADE_Y = 1.35; // radianos por segundo: um sobe e desce a cada 4,6s

/* Tamanho de um quadro na folha e o quanto ele cresce na tela. */
const QUADRO_LARG = 104;
const QUADRO_ALT = 96;
const QUADROS = 3;
/* 0,75 deixa o desenho no mesmo tamanho de antes na tela (78x72). */
const ESCALA = 0.75;
const LARGURA = QUADRO_LARG * ESCALA;
const ALTURA = QUADRO_ALT * ESCALA;

/* Onde o desenho dela começa e termina em relação ao ponto do caminho. */
const CORPO_TOPO = -ALTURA + 6;
const TOPO_VISUAL = CORPO_TOPO;
const FOLGA_DO_BALAO = 8;
const MARGEM_DA_TELA = 8;

/* Cada brilhinho: tamanho, onde fica em volta dela, em que compasso pisca. */
const PISCADAS = [
  { tamanho: 7, x: -36, y: -20, duracao: 1.1, atraso: 0 },
  { tamanho: 4, x: 26, y: -8, duracao: 0.9, atraso: 0.35 },
  { tamanho: 5, x: -18, y: 12, duracao: 1.3, atraso: 0.6 },
  { tamanho: 3, x: 31, y: 18, duracao: 1, atraso: 0.15 },
  { tamanho: 5, x: -46, y: -4, duracao: 1.2, atraso: 0.8 },
  { tamanho: 3, x: 12, y: -30, duracao: 0.95, atraso: 0.5 },
  { tamanho: 4, x: -8, y: 26, duracao: 1.15, atraso: 0.25 },
  { tamanho: 6, x: 40, y: -22, duracao: 1.35, atraso: 0.7 },
  { tamanho: 3, x: -30, y: -34, duracao: 1.05, atraso: 0.9 },
  { tamanho: 4, x: 20, y: 8, duracao: 1.25, atraso: 0.45 },
];

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
  from { opacity: 0; }
  to { opacity: 1; }
}
.pixie-corpo {
  position: absolute;
  background-repeat: no-repeat;
  filter: drop-shadow(0 0 7px rgba(240, 148, 58, 0.6)) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.45));
}
.pixie-corpo {
  inset: 0;
  background-image: url(/tutorial/pixie-corpo.png);
  background-size: ${LARGURA * QUADROS}px ${ALTURA}px;
  animation: pixie-quadros 0.42s steps(${QUADROS}) infinite;
}
.pixie-pisca { animation: pixie-pisca 2.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pixie-corpo { animation: none !important; }
  .pixie-pisca { animation: none !important; opacity: 0.5; }
}
`;

/** Estrelinha de quatro pontas: o brilho que sobra no caminho dela. */
const Estrela = ({ tamanho, atraso, x, y, duracao }) => (
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
      animationDuration: `${duracao}s`,
    }}
  />
);

const limitar = (valor, minimo, maximo) => Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));

export default function GuiaPixie({ texto = 'Boas vindas à Lynx' }) {
  const grupoRef = useRef(null);
  const corpoRef = useRef(null);
  const balaoRef = useRef(null);
  const pontaRef = useRef(null);
  const medidaRef = useRef({ largura: 0, altura: 0 });

  /* O balão muda de tamanho com a fonte do sistema: mede ao montar, quando a
     fonte carrega e quando a janela muda. */
  useEffect(() => {
    const balao = balaoRef.current;
    if (!balao) return undefined;

    const medir = () => {
      const caixa = balao.getBoundingClientRect();
      medidaRef.current = { largura: caixa.width, altura: caixa.height };
    };

    medir();
    window.addEventListener('resize', medir);
    document.fonts?.ready?.then(medir).catch(() => {});
    return () => window.removeEventListener('resize', medir);
  }, []);

  useEffect(() => {
    const grupo = grupoRef.current;
    if (!grupo) return undefined;

    const semMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const inicio = performance.now();
    let raf = 0;

    const desenhar = (agora) => {
      const t = (agora - inicio) / 1000;

      const larguraTela = window.innerWidth;
      const alturaTela = window.innerHeight;

      const fracaoY = semMovimento ? BASE_Y : BASE_Y + AMPLITUDE_Y * Math.sin(t * VELOCIDADE_Y);

      const { largura: larguraBalao, altura: alturaBalao } = medidaRef.current;

      /* Ela nunca sobe tanto que o balão saia por cima, nem desce para fora. */
      const alturaNecessaria = FOLGA_DO_BALAO - TOPO_VISUAL + alturaBalao + MARGEM_DA_TELA;
      const limiteBaixo = alturaTela - MARGEM_DA_TELA - ALTURA / 2;
      const x = larguraTela / 2;
      const y = limitar(fracaoY * alturaTela, alturaNecessaria, limiteBaixo);

      grupo.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;

      /* O balão acompanha, mas preso dentro da tela: o deslocamento lateral
         só compensa o quanto ela passou das bordas. */
      const balao = balaoRef.current;
      if (balao && larguraBalao > 0) {
        const meio = larguraBalao / 2;
        const centro = limitar(x, meio + MARGEM_DA_TELA, larguraTela - meio - MARGEM_DA_TELA);
        const desvio = centro - x;/* ela mora no meio da tela: o desvio é zero, mas fica aqui para o balão continuar preso dentro dela */
        const alturaDoBalao = TOPO_VISUAL - FOLGA_DO_BALAO;
        balao.style.transform =
          `translate(${desvio.toFixed(1)}px, ${alturaDoBalao.toFixed(1)}px) translate(-50%, -100%)`;

        /* A pontinha segue apontando para ela, sem sair do balão. */
        if (pontaRef.current) {
          pontaRef.current.style.left = `${limitar(meio - desvio, 16, larguraBalao - 16).toFixed(1)}px`;
        }
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
        {PISCADAS.map((estrela) => (
          <Estrela key={`${estrela.x}:${estrela.y}`} {...estrela} />
        ))}

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
            marginTop: CORPO_TOPO,
            transformOrigin: 'center 70%',
            willChange: 'transform',
          }}
        >
          <div className="pixie-corpo" />
        </div>

        {/* balão de fala: acima do desenho e dentro da tela */}
        <div
          ref={balaoRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            maxWidth: 'calc(100vw - 16px)',
            padding: '8px 13px',
            borderRadius: 12,
            fontSize: 12,
            lineHeight: 1.35,
            textAlign: 'center',
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
            ref={pontaRef}
            style={{
              position: 'absolute',
              top: '100%',
              width: 0,
              height: 0,
              marginLeft: -6,
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
