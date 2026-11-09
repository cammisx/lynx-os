import { useEffect, useRef } from 'react';

/**
 * A pixie que guia o tutorial da rota /tutorial.
 *
 * O desenho vem da folha de sprites que a Chloë mandou (ver
 * scripts/extrair-pixie.py): o bote das asas na primeira fileira e, na
 * segunda, as poses dela virando — a pirueta. Tudo com o fundo preto virando
 * transparência, animado por background-position em steps (nada de canvas).
 *
 * O voo é uma soma de duas senoides (dá um caminho de oito, não um vaivém
 * robótico) com o ritmo variando devagar: ela acelera, quase para, segue.
 * Ela também se inclina para o lado do movimento e, a cada alguns segundos,
 * dá uma pirueta no ar.
 *
 * O balão mora no mesmo grupo (para acompanhar), mas é posicionado a cada
 * quadro com duas regras: fica sempre ACIMA do desenho dela, com folga, e
 * nunca encosta na borda da tela — se ela chega perto do lado, o balão desliza
 * e a pontinha continua apontando para ela.
 *
 * Nada aqui captura clique (a camada é pointer-events: none). Com "reduzir
 * movimento" ligado, ela fica parada e não pisca nem gira.
 */

/* Caminho do voo. */
const AMPLITUDE_X = 0.3;
const AMPLITUDE_X2 = 0.045;
const FREQ_X = 0.16;
const FREQ_X2 = 0.53;
const BASE_Y = 0.62;
const AMPLITUDE_Y = 0.055;
const AMPLITUDE_Y2 = 0.018;
const FREQ_Y = 0.37;
const FREQ_Y2 = 0.83;

/* Ritmo: 0,35 é o passo mínimo, o resto vem e vai com a senoide. */
const RITMO_MIN = 0.35;
const RITMO_EXTRA = 1.15;
const FREQ_RITMO = 0.23;

/* Inclinação ao voar. */
const INCLINACAO_MAX = 12;
const INCLINACAO_GANHO = 0.7;

/* Pirueta. */
const PIRUETA_CADA = 8.5; // segundos entre uma e outra
const PIRUETA_DURACAO = 0.52; // os quatro quadros
const PIRUETA_SALTO = 9; // px que ela sobe no meio do giro

/* Tamanho de um quadro na folha e o quanto ele cresce na tela. */
const QUADRO_LARG = 26;
const QUADRO_ALT = 24;
const QUADROS = 3;
const ESCALA = 3;
const LARGURA = QUADRO_LARG * ESCALA;
const ALTURA = QUADRO_ALT * ESCALA;

/* A pirueta usa um quadro maior (34x28), com folga para a pose inteira. */
const GIRO_QUADROS = 4;
const GIRO_LARG = 34;
const GIRO_ALT = 28;
const GIRO_LARGURA = GIRO_LARG * ESCALA;
const GIRO_ALTURA = GIRO_ALT * ESCALA;

/* Onde o desenho dela começa e termina em relação ao ponto do caminho.
   TOPO_VISUAL já desconta o quanto ela cresce ao inclinar e ao girar. */
const CORPO_TOPO = -ALTURA + 6;
const TOPO_VISUAL = CORPO_TOPO - 18;
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
@keyframes pixie-giro {
  from { background-position-x: 0; }
  to { background-position-x: -${GIRO_LARGURA * GIRO_QUADROS}px; }
}
@keyframes pixie-pisca {
  0%, 100% { opacity: 0; transform: scale(0.4); }
  45% { opacity: 0.9; transform: scale(1); }
}
@keyframes pixie-balao {
  from { opacity: 0; }
  to { opacity: 1; }
}
.pixie-corpo, .pixie-giro {
  position: absolute;
  background-repeat: no-repeat;
  filter: drop-shadow(0 0 7px rgba(240, 148, 58, 0.6)) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.45));
}
.pixie-corpo {
  inset: 0;
  background-image: url(/tutorial/pixie-dourada.png);
  background-size: ${LARGURA * QUADROS}px ${ALTURA}px;
  animation: pixie-quadros 0.42s steps(${QUADROS}) infinite;
}
.pixie-giro {
  left: ${(LARGURA - GIRO_LARGURA) / 2}px;
  top: ${(ALTURA - GIRO_ALTURA) / 2}px;
  width: ${GIRO_LARGURA}px;
  height: ${GIRO_ALTURA}px;
  background-image: url(/tutorial/pixie-giro-dourada.png);
  background-size: ${GIRO_LARGURA * GIRO_QUADROS}px ${GIRO_ALTURA}px;
  animation: pixie-giro ${PIRUETA_DURACAO}s steps(${GIRO_QUADROS}) 1;
}
.pixie-pisca { animation: pixie-pisca 2.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pixie-corpo, .pixie-giro { animation: none !important; }
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
  const asaRef = useRef(null);
  const giroRef = useRef(null);
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
    let anterior = null;
    let caminho = 0; // "tempo" do voo, que acelera e desacelera
    let piruetando = null;
    let raf = 0;

    const desenhar = (agora) => {
      const t = (agora - inicio) / 1000;
      const dt = anterior === null ? 0 : Math.min(0.05, (agora - anterior) / 1000);
      anterior = agora;

      const larguraTela = window.innerWidth;
      const alturaTela = window.innerHeight;

      /* O caminho anda mais devagar em alguns trechos, como quem voa sem pressa. */
      const ritmo = RITMO_MIN + RITMO_EXTRA * Math.max(0, Math.sin(t * FREQ_RITMO));
      caminho += semMovimento ? 0 : dt * ritmo;

      const fracaoX = semMovimento
        ? 0.5
        : 0.5 + AMPLITUDE_X * Math.sin(caminho * FREQ_X) + AMPLITUDE_X2 * Math.sin(caminho * FREQ_X2 + 1.7);
      const fracaoY = semMovimento
        ? BASE_Y
        : BASE_Y + AMPLITUDE_Y * Math.sin(caminho * FREQ_Y + 0.8) + AMPLITUDE_Y2 * Math.sin(caminho * FREQ_Y2);

      /* Velocidade vertical: inclina o corpo para o lado de onde ela vai. */
      const velocidadeY =
        AMPLITUDE_Y * FREQ_Y * Math.cos(caminho * FREQ_Y + 0.8) +
        AMPLITUDE_Y2 * FREQ_Y2 * Math.cos(caminho * FREQ_Y2);
      const inclinacao = semMovimento
        ? 0
        : limitar(velocidadeY * alturaTela * INCLINACAO_GANHO, -INCLINACAO_MAX, INCLINACAO_MAX);

      /* De vez em quando, uma pirueta no ar. */
      const ciclo = semMovimento ? PIRUETA_CADA : t % PIRUETA_CADA;
      const girando = ciclo < PIRUETA_DURACAO;
      const progresso = girando ? ciclo / PIRUETA_DURACAO : 0;
      const salto = girando ? Math.sin(Math.PI * progresso) : 0;

      const { largura: larguraBalao, altura: alturaBalao } = medidaRef.current;

      /* Ela nunca sobe tanto que o balão saia por cima, nem desce para fora. */
      const alturaNecessaria =
        FOLGA_DO_BALAO - TOPO_VISUAL + alturaBalao + MARGEM_DA_TELA + PIRUETA_SALTO;
      const limiteBaixo = alturaTela - MARGEM_DA_TELA - ALTURA / 2;
      const x = fracaoX * larguraTela;
      const y =
        limitar(fracaoY * alturaTela, alturaNecessaria, limiteBaixo) - PIRUETA_SALTO * salto;

      grupo.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;

      /* Vira para o lado do caminho e sobe/desce o nariz conforme o voo. */
      const direcao = Math.cos(caminho * FREQ_X) >= 0 ? 1 : -1;
      const corpo = corpoRef.current;
      if (corpo) {
        const crescer = 1 + 0.07 * salto;
        corpo.style.transform =
          `scaleX(${direcao}) rotate(${inclinacao.toFixed(1)}deg) scale(${crescer.toFixed(3)})`;
      }

      /* Troca o bote das asas pela sequência da pirueta (só quando muda). */
      if (girando !== piruetando) {
        piruetando = girando;
        if (asaRef.current) asaRef.current.style.display = girando ? 'none' : 'block';
        if (giroRef.current) giroRef.current.style.display = girando ? 'block' : 'none';
      }

      /* O balão acompanha, mas preso dentro da tela: o deslocamento lateral
         só compensa o quanto ela passou das bordas. */
      const balao = balaoRef.current;
      if (balao && larguraBalao > 0) {
        const meio = larguraBalao / 2;
        const centro = limitar(x, meio + MARGEM_DA_TELA, larguraTela - meio - MARGEM_DA_TELA);
        const desvio = centro - x;
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
          <div ref={asaRef} className="pixie-corpo" />
          <div ref={giroRef} className="pixie-giro" style={{ display: 'none' }} />
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
