import { useEffect, useRef, useState } from 'react';
import { hexParaHsv, hsvParaHex } from '@/lib/paint';

/**
 * Círculo cromático: matiz pelo ângulo, saturação pela distância do centro.
 * O brilho fica no controle ao lado, então a roda é desenhada de novo quando
 * ele muda.
 */

const LADO = 164;
const RAIO = 78;
const CENTRO = LADO / 2;

const hsvParaRgb = (h, s, v) => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

export default function RodaCromatica({ cor, brilho = 1, onChange }) {
  const telaRef = useRef(null);
  const [hsv, setHsv] = useState(() => hexParaHsv(cor));

  useEffect(() => {
    setHsv(hexParaHsv(cor));
  }, [cor]);

  useEffect(() => {
    const tela = telaRef.current;
    if (!tela) return;
    const ctx = tela.getContext('2d');
    const imagem = ctx.createImageData(LADO, LADO);
    const dados = imagem.data;

    for (let y = 0; y < LADO; y += 1) {
      for (let x = 0; x < LADO; x += 1) {
        const dx = x - CENTRO;
        const dy = y - CENTRO;
        const distancia = Math.hypot(dx, dy);
        const pos = (y * LADO + x) * 4;
        if (distancia > RAIO) {
          dados[pos + 3] = 0;
          continue;
        }
        const angulo = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const [r, g, b] = hsvParaRgb(angulo, Math.min(1, distancia / RAIO), brilho);
        dados[pos] = r;
        dados[pos + 1] = g;
        dados[pos + 2] = b;
        dados[pos + 3] = distancia > RAIO - 1 ? 120 : 255;
      }
    }

    ctx.clearRect(0, 0, LADO, LADO);
    ctx.putImageData(imagem, 0, 0);

    /* Marca a cor escolhida: um anel branco com sombra por dentro. */
    const raio = hsv.s * RAIO;
    const angulo = (hsv.h * Math.PI) / 180;
    const mx = CENTRO + Math.cos(angulo) * raio;
    const my = CENTRO + Math.sin(angulo) * raio;
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hsv, brilho]);

  const escolher = (evento) => {
    const tela = telaRef.current;
    if (!tela) return;
    const caixa = tela.getBoundingClientRect();
    const x = ((evento.clientX - caixa.left) / caixa.width) * LADO - CENTRO;
    const y = ((evento.clientY - caixa.top) / caixa.height) * LADO - CENTRO;
    const distancia = Math.hypot(x, y);
    if (distancia > RAIO) return;
    const angulo = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    const saturacao = Math.min(1, distancia / RAIO);
    setHsv({ h: angulo, s: saturacao, v: brilho });
    onChange(hsvParaHex(angulo, saturacao, brilho));
  };

  return (
    <canvas
      ref={telaRef}
      width={LADO}
      height={LADO}
      onPointerDown={(evento) => {
        evento.preventDefault();
        telaRef.current?.setPointerCapture?.(evento.pointerId);
        escolher(evento);
      }}
      onPointerMove={(evento) => {
        if (evento.buttons === 1) escolher(evento);
      }}
      style={{ width: LADO, height: LADO, cursor: 'crosshair', touchAction: 'none' }}
      aria-label="Círculo cromático"
    />
  );
}
