import { useEffect, useRef } from 'react';

const SEGMENTS = 400;
const GHOST_COUNT = 45;
const GHOST_STEP = 6; // frames entre fantasmas
const MAX_HISTORY = GHOST_COUNT * GHOST_STEP + 1;
const PASSO_TEMPO = 0.0045; // quanto o ruído anda por frame

// Cores da "seda" — vêm do tema ativo (c14, c5, c6, c1) e são cicladas.
const CORES_PADRAO = ['#9B3FA8', '#C8387A', '#E8604A', '#F0943A'];

const montarStops = (cores) => {
  const lista = cores.map((hex, indice) => [indice / cores.length, hex]);
  lista.push([1, cores[0]]);
  return lista;
};

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

let RGB_STOPS = montarStops(CORES_PADRAO).map(([p, hex]) => [p, hexToRgb(hex)]);

function colorAt(t) {
  const x = ((t % 1) + 1) % 1;
  for (let i = 0; i < RGB_STOPS.length - 1; i += 1) {
    const [p0, c0] = RGB_STOPS[i];
    const [p1, c1] = RGB_STOPS[i + 1];
    if (x >= p0 && x <= p1) {
      const k = p1 === p0 ? 0 : (x - p0) / (p1 - p0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * k);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * k);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
      return `rgb(${r},${g},${b})`;
    }
  }
  const last = RGB_STOPS[RGB_STOPS.length - 1][1];
  return `rgb(${last[0]},${last[1]},${last[2]})`;
}

// Perlin 2D com tabela de permutação embaralhada (sem biblioteca)
function makeNoise2D() {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) table[i] = i;
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = table[i];
    table[i] = table[j];
    table[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i += 1) perm[i] = table[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (hash, x, y) => {
    switch (hash & 3) {
      case 0:
        return x + y;
      case 1:
        return -x + y;
      case 2:
        return x - y;
      default:
        return -x - y;
    }
  };

  return (x, y) => {
    const xf0 = Math.floor(x);
    const yf0 = Math.floor(y);
    const xi = xf0 & 255;
    const yi = yf0 & 255;
    const xf = x - xf0;
    const yf = y - yf0;
    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v) * 0.9;
  };
}

/**
 * Fundo do desktop: a imagem do usuário (se houver), um véu do tema por cima
 * para o texto continuar legível, e a seda de linhas desenhada em canvas.
 *
 * `estatico` congela a seda: em vez de animar, desenha um quadro só — mesmo
 * desenho, sem gastar CPU. Serve para PCs mais modestos.
 */
export default function DesktopBackground({ imagem = '', estatico = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const noise = makeNoise2D();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let time = 2.4; // começa com a seda já formada, sem "nascendo" na tela
    let colorPhase = 0;
    let frame = 0;
    const history = [];
    let background = '#1A0510';
    let alphaMain = 0.9;
    let alphaGhost = 0.25;

    const readTheme = () => {
      const root = document.documentElement;
      const mode = root.getAttribute('data-mode') || 'dark';
      /* No claro a seda continua viva, só que mais discreta sobre o fundo pálido. */
      alphaMain = mode === 'light' ? 0.55 : 0.9;
      alphaGhost = mode === 'light' ? 0.16 : 0.25;
      const estilo = window.getComputedStyle(root);
      const lerCor = (nome, reserva) => {
        const valor = estilo.getPropertyValue(nome).trim();
        return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(valor) ? valor : reserva;
      };
      const c8 = estilo.getPropertyValue('--c8').trim();
      background = c8 || '#1A0510';
      // O tema pode ter mudado: a seda se repinta com as cores dele.
      RGB_STOPS = montarStops([
        lerCor('--c14', CORES_PADRAO[0]),
        lerCor('--c5', CORES_PADRAO[1]),
        lerCor('--c6', CORES_PADRAO[2]),
        lerCor('--c1', CORES_PADRAO[3]),
      ]).map(([p, hex]) => [p, hexToRgb(hex)]);
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pintarBase = () => {
      ctx.globalAlpha = 1;
      if (imagem) {
        // com imagem, o canvas é só a camada de linhas
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const buildGradient = () => {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      const steps = 24;
      for (let k = 0; k <= steps; k += 1) {
        const p = k / steps;
        gradient.addColorStop(p, colorAt(p + colorPhase));
      }
      return gradient;
    };

    const strokeY = (ys, gradient, alpha, step) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, ys[0]);
      for (let i = step; i <= SEGMENTS; i += step) {
        ctx.lineTo((i / SEGMENTS) * width, ys[i]);
      }
      ctx.lineTo(width, ys[SEGMENTS]);
      ctx.stroke();
    };

    /* Uma curva inteira num instante do ruído. Usada nos fantasmas do quadro
       parado, onde não existe histórico de frames para reaproveitar. */
    const curvaEm = (instante) => {
      const ys = new Float32Array(SEGMENTS + 1);
      for (let i = 0; i <= SEGMENTS; i += 1) {
        const t = i / SEGMENTS;
        const n = noise(t * width * 0.0012, instante);
        const y = height * 0.5 + n * 0.48 * height;
        ys[i] = Math.max(-height, Math.min(height * 2, y));
      }
      return ys;
    };

    let rafId = 0;

    const desenharParado = () => {
      pintarBase();
      const gradient = buildGradient();
      for (let g = GHOST_COUNT; g >= 1; g -= 1) {
        strokeY(curvaEm(time - g * GHOST_STEP * PASSO_TEMPO), gradient, alphaGhost, 4);
      }
      strokeY(curvaEm(time), gradient, alphaMain, 1);
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      time += PASSO_TEMPO;
      colorPhase += 0.0008;
      frame += 1;

      pintarBase();

      const ys = curvaEm(time);
      history.push(ys);
      if (history.length > MAX_HISTORY) history.shift();

      const gradient = buildGradient();

      // fantasmas, do mais antigo para o mais recente
      for (let g = GHOST_COUNT; g >= 1; g -= 1) {
        const index = history.length - 1 - g * GHOST_STEP;
        if (index >= 0) strokeY(history[index], gradient, alphaGhost, 4);
      }

      // linha principal
      strokeY(ys, gradient, alphaMain, 1);
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(draw);
    };

    const parar = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const comecar = () => {
      parar();
      history.length = 0;
      if (estatico) {
        desenharParado();
        return;
      }
      rafId = requestAnimationFrame(draw);
    };

    readTheme();
    resize();
    comecar();

    const observer = new MutationObserver(() => {
      readTheme();
      if (estatico) desenharParado();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-mode'],
    });

    const aoRedimensionar = () => {
      resize();
      comecar();
    };
    window.addEventListener('resize', aoRedimensionar);

    return () => {
      parar();
      observer.disconnect();
      window.removeEventListener('resize', aoRedimensionar);
      history.length = 0;
    };
  }, [imagem, estatico]);

  return (
    <>
      {imagem ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            backgroundImage: `url("${imagem}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {imagem ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            /* véu do tema: a foto aparece, o texto continua legível */
            background: 'color-mix(in srgb, var(--c8) 52%, transparent)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
