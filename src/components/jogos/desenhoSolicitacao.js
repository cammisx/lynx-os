/**
 * Desenho do SOLICITACAO DE MIDIA em canvas puro.
 *
 * Fica separado do componente para poder ser aberto num teste de tela sem
 * React. As cores sao fixas de proposito: canvas nao entende var(--cor) nem
 * color-mix, e era exatamente isso que deixava a cobrinha antiga preta.
 */

export const FUNDO = '#171021';
export const LINHA_GRADE = 'rgba(255,255,255,0.045)';
export const BORDA = 'rgba(214,178,94,0.28)';
const TAU = Math.PI * 2;

const caminho = (ctx, pontos) => {
  ctx.beginPath();
  pontos.forEach((ponto, indice) => {
    if (indice === 0) ctx.moveTo(ponto.x, ponto.y);
    else ctx.lineTo(ponto.x, ponto.y);
  });
};

export const desenharPelos = (ctx, x, y, raio, angulo, cor) => {
  ctx.strokeStyle = cor;
  ctx.lineWidth = Math.max(0.8, raio * 0.1);
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i += 1) {
    const a = angulo + (i / 18) * TAU;
    const inicio = raio * (0.86 + (i % 3) * 0.05);
    const fim = raio * (1.2 + ((i * 5) % 4) * 0.08);
    const curva = a + 0.3;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * inicio, y + Math.sin(a) * inicio);
    ctx.quadraticCurveTo(
      x + Math.cos(a) * raio * 1.08,
      y + Math.sin(a) * raio * 1.08,
      x + Math.cos(curva) * fim,
      y + Math.sin(curva) * fim
    );
    ctx.stroke();
  }
};

export const desenharCobra = (ctx, corpo, passo, pele, pelos) => {
  if (!corpo.length) return;
  const meio = passo / 2;
  const pontos = corpo.map((parte) => ({ x: parte.x * passo + meio, y: parte.y * passo + meio }));

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  /* Contorno mais escuro para o tronco destacar do fundo. */
  if (pontos.length > 1) {
    ctx.strokeStyle = pele.sombra;
    ctx.lineWidth = passo * 0.74;
    caminho(ctx, pontos);
    ctx.stroke();
    ctx.strokeStyle = pele.cor;
    ctx.lineWidth = passo * 0.6;
    caminho(ctx, pontos);
    ctx.stroke();
  }

  /* Bolas na base do rabo: enfeite, nao contam para a hitbox. */
  if (pontos.length > 1) {
    const rabo = pontos[pontos.length - 1];
    const antes = pontos[pontos.length - 2];
    const angulo = Math.atan2(rabo.y - antes.y, rabo.x - antes.x);
    const base = { x: rabo.x + Math.cos(angulo) * passo * 0.22, y: rabo.y + Math.sin(angulo) * passo * 0.22 };
    const perpendicular = { x: -Math.sin(angulo), y: Math.cos(angulo) };
    const raio = passo * 0.44;
    [-1, 1].forEach((lado) => {
      const bx = base.x + perpendicular.x * raio * 0.92 * lado;
      const by = base.y + perpendicular.y * raio * 0.92 * lado;
      ctx.beginPath();
      ctx.fillStyle = pele.cor;
      ctx.arc(bx, by, raio, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = pele.sombra;
      ctx.lineWidth = Math.max(1, passo * 0.07);
      ctx.stroke();
      if (pelos) desenharPelos(ctx, bx, by, raio, angulo, pele.pelos);
    });
  }

  /* Cabeca: a glande, virada para onde a cobra anda. */
  const cabeca = pontos[0];
  const anterior = pontos[1] || { x: cabeca.x - passo, y: cabeca.y };
  const angulo = Math.atan2(cabeca.y - anterior.y, cabeca.x - anterior.x);
  ctx.save();
  ctx.translate(cabeca.x, cabeca.y);
  ctx.rotate(angulo);
  ctx.fillStyle = pele.glande;
  ctx.beginPath();
  ctx.ellipse(passo * 0.06, 0, passo * 0.5, passo * 0.44, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = pele.sombra;
  ctx.lineWidth = Math.max(1, passo * 0.06);
  ctx.stroke();
  /* Coroa da glande e o furinho na ponta. */
  ctx.beginPath();
  ctx.ellipse(-passo * 0.2, 0, passo * 0.1, passo * 0.38, 0, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = pele.sombra;
  ctx.beginPath();
  ctx.ellipse(passo * 0.42, 0, passo * 0.05, passo * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
};

export const desenharEstrela = (ctx, x, y, raio, cor) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? raio : raio * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = cor;
  ctx.fill();
};

export const desenharItem = (ctx, item, passo, agora) => {
  const x = item.x * passo + passo / 2;
  const y = item.y * passo + passo / 2;
  const r = passo * 0.38;
  const restante = Math.max(0, Math.min(1, (item.expira - agora) / item.duracao));

  ctx.save();
  /* Aro do tempo que sobra. */
  ctx.beginPath();
  ctx.arc(x, y, passo * 0.46, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.max(1, passo * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, passo * 0.46, -Math.PI / 2, -Math.PI / 2 + TAU * restante);
  ctx.strokeStyle = restante < 0.25 ? '#ff7b7b' : 'rgba(224,192,110,0.85)';
  ctx.stroke();

  if (item.tipo === 'berinjela') {
    ctx.save();
    ctx.translate(x, y + passo * 0.04);
    ctx.rotate(-0.35);
    ctx.fillStyle = '#6b3f9c';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.62, r * 1.02, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#a06ad0';
    ctx.beginPath();
    ctx.ellipse(-r * 0.16, -r * 0.12, r * 0.2, r * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4f8a3d';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.9);
    ctx.lineTo(0, -r * 1.25);
    ctx.lineTo(r * 0.5, -r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (item.tipo === 'foto') {
    ctx.fillStyle = '#f4efe2';
    ctx.beginPath();
    ctx.roundRect?.(x - r * 0.9, y - r * 0.78, r * 1.8, r * 1.56, r * 0.22);
    if (!ctx.roundRect) ctx.rect(x - r * 0.9, y - r * 0.78, r * 1.8, r * 1.56);
    ctx.fill();
    ctx.fillStyle = '#9ed0e6';
    ctx.beginPath();
    ctx.arc(x + r * 0.36, y - r * 0.34, r * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7ba86a';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.78, y + r * 0.66);
    ctx.lineTo(x - r * 0.1, y - r * 0.1);
    ctx.lineTo(x + r * 0.72, y + r * 0.66);
    ctx.closePath();
    ctx.fill();
  }

  if (item.tipo === 'video') {
    ctx.fillStyle = '#2b2440';
    ctx.beginPath();
    ctx.roundRect?.(x - r, y - r * 0.72, r * 2, r * 1.44, r * 0.24);
    if (!ctx.roundRect) ctx.rect(x - r, y - r * 0.72, r * 2, r * 1.44);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#e8c46a';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.26, y - r * 0.4);
    ctx.lineTo(x + r * 0.5, y);
    ctx.lineTo(x - r * 0.26, y + r * 0.4);
    ctx.closePath();
    ctx.fill();
  }

  if (item.tipo === 'estrela') {
    desenharEstrela(ctx, x, y, r * 1.05, '#f2c94c');
    desenharEstrela(ctx, x, y, r * 0.55, '#fff3c4');
  }

  if (item.tipo === 'telefone') {
    ctx.fillStyle = '#20304a';
    ctx.beginPath();
    ctx.roundRect?.(x - r * 0.62, y - r, r * 1.24, r * 2, r * 0.28);
    if (!ctx.roundRect) ctx.rect(x - r * 0.62, y - r, r * 1.24, r * 2);
    ctx.fill();
    ctx.fillStyle = '#8fd3ff';
    ctx.beginPath();
    ctx.roundRect?.(x - r * 0.46, y - r * 0.76, r * 0.92, r * 1.36, r * 0.14);
    if (!ctx.roundRect) ctx.rect(x - r * 0.46, y - r * 0.76, r * 0.92, r * 1.36);
    ctx.fill();
    ctx.fillStyle = '#20304a';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.78, r * 0.12, 0, TAU);
    ctx.fill();
  }

  if (item.tipo === 'moeda') {
    ctx.fillStyle = '#d9a929';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.95, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8a6412';
    ctx.lineWidth = Math.max(1, passo * 0.06);
    ctx.stroke();
    ctx.strokeStyle = '#ffe08a';
    ctx.lineWidth = Math.max(1, passo * 0.045);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#8a6412';
    ctx.font = `bold ${Math.max(7, Math.round(passo * 0.34))}px "Roboto Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + passo * 0.02);
  }

  ctx.restore();
};

