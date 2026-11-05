import { useEffect, useRef } from 'react';

const SEGMENTS = 400;
const GHOST_COUNT = 45;
const GHOST_STEP = 6; // frames entre fantasmas
const MAX_HISTORY = GHOST_COUNT * GHOST_STEP + 1;

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

export default function DesktopBackground() {
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
    let time = 0;
    let colorPhase = 0;
    let frame = 0;
    const history = [];
    let background = '#1A0510';
    let bgOverride = null;

    const readTheme = () => {
      const root = document.documentElement;
      const mode = root.getAttribute('data-mode') || 'dark';
      if (mode === 'light') {
        bgOverride = '#f5f5f5';
        return;
      }
      bgOverride = null;
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

    readTheme();
    resize();

    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-mode'],
    });

    window.addEventListener('resize', resize);

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

    let rafId = 0;

    const draw = () => {
      time += 0.0045;
      colorPhase += 0.0008;
      frame += 1;

      ctx.globalAlpha = 1;
      ctx.fillStyle = bgOverride || background;
      ctx.fillRect(0, 0, width, height);

      const ys = new Float32Array(SEGMENTS + 1);
      for (let i = 0; i <= SEGMENTS; i += 1) {
        const t = i / SEGMENTS;
        const n = noise(t * width * 0.0012, time);
        const y = height * 0.5 + n * 0.48 * height;
        ys[i] = Math.max(-height, Math.min(height * 2, y));
      }

      history.push(ys);
      if (history.length > MAX_HISTORY) history.shift();

      const gradient = buildGradient();

      // fantasmas, do mais antigo para o mais recente
      for (let g = GHOST_COUNT; g >= 1; g -= 1) {
        const index = history.length - 1 - g * GHOST_STEP;
        if (index >= 0) strokeY(history[index], gradient, 0.25, 4);
      }

      // linha principal
      strokeY(ys, gradient, 0.9, 1);
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      history.length = 0;
    };
  }, []);

  return (
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
  );
}