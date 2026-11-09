import { useEffect, useRef } from 'react';
import tiraCorpo from '@/assets/pixie/tiras/pixie-corpo.png';
import tiraVirar from '@/assets/pixie/tiras/pixie-virar.png';

/**
 * A pixie que guia o tutorial da rota /tutorial.
 *
 * O desenho vem dos sprites que a Chloë mandou, um arquivo por quadro (em
 * src/assets/pixie/quadros, montados por scripts/montar-pixie.py), animados
 * por background-position em steps (nada de canvas). São três tiras:
 *
 * - frente: o bote das asas de frente (quadros 11 a 16), tocado sem parar;
 * - costas: o bote das asas de costas (quadros 17 a 19), montado em
 *   pixie-costas.png mas ainda não usado: aqui ela voa sempre de frente;
 * - virada: as nove poses da virada (quadros 1 a 9), tocadas uma vez de cada
 *   vez.
 *
 * O voo é o de antes das poses do giro: ela flutua de um lado para o outro da
 * tela e sobe e desce, numa soma de senoides (dá um caminho orgânico, não um
 * vaivém de metrônomo), mais para a direita do que para a esquerda. A cada dez
 * segundos ela dá o giro: aí entra a tira das nove poses, tocada uma vez, na
 * ordem 9-8-7-6-5-4-3-2-1 quando ela está indo para a direita e na ordem
 * 1-2-3-4-5-6-7-8-9 quando está indo para a esquerda. Fora do giro ela voa de
 * frente nos dois sentidos.
 *
 * O balão mora no mesmo grupo (para acompanhar), mas é posicionado a cada
 * quadro com duas regras: fica sempre ACIMA do desenho dela, com folga, e
 * nunca encosta na borda da tela — se ela chega perto do lado, o balão desliza
 * e a pontinha continua apontando para ela.
 *
 * Nada aqui captura clique (a camada é pointer-events: none). Com "reduzir
 * movimento" ligado, ela fica parada e não pisca nem vira.
 */

/* O vaivém: ela flutua de um lado para o outro e sobe e desce. */
const BASE_X = 0.68; // ela fica do meio para a direita
const AMPLITUDE_X = 0.075; // ela quase não anda de lado: dá para acertar o clique
const FREQ_X = Math.PI / 16; // rad/s: bem devagar
const AMPLITUDE_X2 = 0.02; // segunda senoide, para o caminho não ser robótico
const FREQ_X2 = Math.PI / 24;
const FASE_X2 = 1.2;

const BASE_Y = 0.62;
const AMPLITUDE_Y = 0.028; // quanto sobe e desce, em fração da altura da tela
const FREQ_Y = 0.9; // rad/s
const AMPLITUDE_Y2 = 0.008;
const FREQ_Y2 = 1.5;

/* A virada: a cada dez segundos ela roda as nove poses uma vez, no ar. Não é
   presa à troca de lado: indo para a esquerda ela também vai de frente. */
const VIRADA_CADA = 10;
const VIRADA_DURACAO = 0.8; // tem de casar com a animação do CSS

/* Tamanho de um quadro na folha e o quanto ele cresce na tela. */
const QUADRO_LARG = 120;
const QUADRO_ALT = 96;
const QUADROS = 6; // bote das asas de frente
/* 0,72 deixa o desenho no mesmo tamanho de antes na tela. */
const ESCALA = 0.72;
const LARGURA = QUADRO_LARG * ESCALA;
const ALTURA = QUADRO_ALT * ESCALA;

/* A tira da virada: as nove poses, no mesmo tamanho de quadro. */
const VIRADA_QUADROS = 9;
const VIRADA_LARGURA = QUADRO_LARG * ESCALA;
const VIRADA_ALTURA = QUADRO_ALT * ESCALA;

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
@keyframes pixie-frente {
  from { background-position-x: 0; }
  to { background-position-x: -${QUADRO_LARG * QUADROS * ESCALA}px; }
}

@keyframes pixie-virar-ida {
  from { background-position-x: 0; }
  to { background-position-x: -${VIRADA_LARGURA * VIRADA_QUADROS}px; }
}
@keyframes pixie-virar-volta {
  from { background-position-x: -${VIRADA_LARGURA * VIRADA_QUADROS}px; }
  to { background-position-x: 0; }
}
@keyframes pixie-pisca {
  0%, 100% { opacity: 0; transform: scale(0.4); }
  45% { opacity: 0.9; transform: scale(1); }
}
@keyframes pixie-balao {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pixie-feliz {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(90deg) scale(1.07); }
  50% { transform: rotate(180deg) scale(1); }
  75% { transform: rotate(270deg) scale(1.07); }
  100% { transform: rotate(360deg) scale(1); }
}
@keyframes pixie-coracao {
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  20% { opacity: 1; transform: translate(calc(var(--dx) * 0.3), -18px) scale(1); }
  100% { opacity: 0; transform: translate(var(--dx), -78px) scale(1.05); }
}
.pixie-feliz { animation: pixie-feliz 1.1s ease-in-out 2; }
.pixie-coracao { animation: pixie-coracao 1.5s ease-out both; }
.pixie-frente, .pixie-virar {
  position: absolute;
  background-repeat: no-repeat;
  filter: drop-shadow(0 0 7px rgba(240, 148, 58, 0.6)) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.45));
}
.pixie-frente {
  inset: 0;
  background-image: url(${tiraCorpo});
  background-size: ${LARGURA * QUADROS}px ${ALTURA}px;
  animation: pixie-frente 0.6s steps(${QUADROS}) infinite;
}
.pixie-virar {
  inset: 0;
  background-image: url(${tiraVirar});
  background-size: ${VIRADA_LARGURA * VIRADA_QUADROS}px ${VIRADA_ALTURA}px;
  animation: pixie-virar-ida ${VIRADA_DURACAO}s steps(${VIRADA_QUADROS}) 1 both;
}
.pixie-pisca { animation: pixie-pisca 2.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pixie-frente, .pixie-virar { animation: none !important; }
  .pixie-pisca { animation: none !important; opacity: 0.5; }
  .pixie-feliz { animation: none !important; }
  .pixie-coracao { animation: none !important; opacity: 0.85; }
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

/* Cada coração: para que lado voa, tamanho e quando sai. */
const CORACOES = [
  { dx: -28, tamanho: 12, atraso: 0 },
  { dx: -12, tamanho: 9, atraso: 0.16 },
  { dx: 4, tamanho: 13, atraso: 0.34 },
  { dx: 22, tamanho: 10, atraso: 0.52 },
  { dx: -20, tamanho: 8, atraso: 0.74 },
  { dx: 14, tamanho: 11, atraso: 0.96 },
  { dx: 0, tamanho: 9, atraso: 1.18 },
];

/** Coraçãozinho que sobe quando ela agradece. */
const Coracao = ({ tamanho, atraso, dx }) => (
  <span
    className="pixie-coracao"
    style={{
      position: 'absolute',
      left: -tamanho / 2,
      top: -ALTURA * 0.72,
      width: tamanho,
      height: tamanho,
      '--dx': `${dx}px`,
      animationDelay: `${atraso}s`,
    }}
  >
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true">
      <path
        d="M12 21s-7.6-4.8-9.5-9.1A5.5 5.5 0 0 1 12 6.1a5.5 5.5 0 0 1 9.5 5.8C19.6 16.2 12 21 12 21Z"
        fill="#f2789c"
        stroke="rgba(255, 220, 235, 0.8)"
        strokeWidth="0.8"
      />
    </svg>
  </span>
);

const limitar = (valor, minimo, maximo) => Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));

export default function GuiaPixie({
  texto = 'Boas vindas à Lynx',
  children = null,
  capturarClique = false,
  aoClique = null,
  aoMenu = null,
  /* Sem balão ela só flutua (fim do tutorial, esperando o botão direito). */
  esconderBalao = false,
  /* Agradecimento: ela fica feliz, gira e solta corações. */
  comemorando = false,
}) {
  const grupoRef = useRef(null);
  const corpoRef = useRef(null);
  const asaRef = useRef(null);
  const virarRef = useRef(null);
  const balaoRef = useRef(null);
  const pontaRef = useRef(null);
  const medidaRef = useRef({ largura: 0, altura: 0 });

  /* O balão muda de tamanho com a fonte do sistema: mede ao montar, quando a
     fonte carrega e quando a janela muda. */
  useEffect(() => {
    const balao = balaoRef.current;
    if (!balao) {
      /* Sem balão na tela ela pode subir mais: a medida antiga não vale. */
      medidaRef.current = { largura: 0, altura: 0 };
      return undefined;
    }

    const medir = () => {
      const caixa = balao.getBoundingClientRect();
      medidaRef.current = { largura: caixa.width, altura: caixa.height };
    };

    medir();
    window.addEventListener('resize', medir);
    document.fonts?.ready?.then(medir).catch(() => {});
    /* O balão cresce quando entra o campo do nome ou um texto mais longo. */
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(balao);
    return () => {
      window.removeEventListener('resize', medir);
      observador?.disconnect();
    };
  }, [esconderBalao]);

  useEffect(() => {
    const grupo = grupoRef.current;
    if (!grupo) return undefined;

    const semMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const inicio = performance.now();
    let virando = null;
    let raf = 0;

    const desenhar = (agora) => {
      const t = (agora - inicio) / 1000;

      const larguraTela = window.innerWidth;
      const alturaTela = window.innerHeight;

      const fracaoX = semMovimento
        ? BASE_X
        : BASE_X + AMPLITUDE_X * Math.sin(t * FREQ_X) + AMPLITUDE_X2 * Math.sin(t * FREQ_X2 + FASE_X2);
      const fracaoY = semMovimento
        ? BASE_Y
        : BASE_Y + AMPLITUDE_Y * Math.sin(t * FREQ_Y) + AMPLITUDE_Y2 * Math.sin(t * FREQ_Y2);

      /* Para que lado ela está indo agora: decide a ordem da virada. */
      const velocidadeX =
        AMPLITUDE_X * FREQ_X * Math.cos(t * FREQ_X) +
        AMPLITUDE_X2 * FREQ_X2 * Math.cos(t * FREQ_X2 + FASE_X2);
      const paraDireita = velocidadeX >= 0;

      /* A cada dez segundos, as nove poses uma vez. */
      const ciclo = semMovimento ? VIRADA_CADA : t % VIRADA_CADA;
      const estaVirando = ciclo < VIRADA_DURACAO;

      const { largura: larguraBalao, altura: alturaBalao } = medidaRef.current;

      /* Ela nunca sobe tanto que o balão saia por cima, nem desce para fora. */
      const alturaNecessaria = FOLGA_DO_BALAO - TOPO_VISUAL + alturaBalao + MARGEM_DA_TELA;
      const limiteBaixo = alturaTela - MARGEM_DA_TELA - ALTURA / 2;
      const x = fracaoX * larguraTela;
      const y = limitar(fracaoY * alturaTela, alturaNecessaria, limiteBaixo);

      grupo.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;

      /* Ela voa sempre de frente (a tira do bote das asas 11 a 16), para os
         dois lados. Só sai dessa tira na hora do giro.

         Indo para a direita a tira da virada roda de trás para frente, indo
         para a esquerda de frente para trás. */
      if (estaVirando !== virando) {
        virando = estaVirando;
        if (asaRef.current) asaRef.current.style.display = estaVirando ? 'none' : 'block';
        if (virarRef.current) virarRef.current.style.display = estaVirando ? 'block' : 'none';
      }
      if (virarRef.current) {
        virarRef.current.style.animationName = paraDireita ? 'pixie-virar-volta' : 'pixie-virar-ida';
      }

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
    <div
      aria-live="polite"
      data-pixie="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9500 }}
    >
      <style>{ESTILOS}</style>

      {/* Enquanto o roteiro espera um clique, a tela toda vira o botão: o
          clique não chega no desktop, só avança a fala dela. */}
      {capturarClique ? (
        <div
          onClick={aoClique ? (evento) => aoClique(evento, false) : undefined}
          style={{ position: 'fixed', inset: 0, pointerEvents: 'auto', cursor: 'default' }}
        />
      ) : null}

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
          <div
            ref={asaRef}
            className={comemorando ? 'pixie-frente pixie-feliz' : 'pixie-frente'}
          />
          <div ref={virarRef} className="pixie-virar" style={{ display: 'none' }} />

          {/* Agradecimento: os corações saem dela enquanto ela gira. */}
          {comemorando ? CORACOES.map((coracao) => <Coracao key={coracao.atraso} {...coracao} />) : null}

          {/* A área do clique direito: um pouco maior que o desenho, senão é
              difícil acertar num bicho que mexe. O menu é dela mesma, então o
              menu do sistema não entra no lugar. Sem ninguém para atender o
              clique, ela não pega o mouse: o clique segue para o que está
              atrás (o menu do sistema, com o Chamar Pixie, por exemplo). */}
          {aoMenu || aoClique ? (
          <div
            data-menu-own="true"
            onContextMenu={(evento) => {
              evento.preventDefault();
              evento.stopPropagation();
              aoMenu?.({ x: evento.clientX, y: evento.clientY });
            }}
            onClick={aoClique ? (evento) => aoClique(evento, true) : undefined}
            style={{
              position: 'absolute',
              inset: -8,
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          />
          ) : null}
        </div>

        {/* balão de fala: acima do desenho e dentro da tela */}
        {esconderBalao ? null : (
        <div
          ref={balaoRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            /* O balão vive dentro de um grupo de largura zero: sem o
               max-content ele encolheria até a largura da palavra mais longa. */
            width: 'max-content',
            maxWidth: 'min(264px, calc(100vw - 16px))',
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
          {children}
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
        )}
      </div>
    </div>
  );
}
