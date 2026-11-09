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

/* Os premios sao emoji: o desenho vetorial ficava sujo no tamanho de celula do
   tabuleiro. O aro do tempo continua sendo desenhado por cima do emoji. */
export const EMOJI_ITEM = {
  berinjela: '🍆',
  foto: '📷',
  video: '🎥',
  estrela: '⭐',
  telefone: '📱',
  moeda: '💰',
};

const FONTE_EMOJI =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

export const desenharItem = (ctx, item, passo, agora) => {
  const x = item.x * passo + passo / 2;
  const y = item.y * passo + passo / 2;
  const restante = Math.max(0, Math.min(1, (item.expira - agora) / item.duracao));

  ctx.save();

  /* Aro do tempo que sobra. */
  ctx.beginPath();
  ctx.arc(x, y, passo * 0.485, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.max(1, passo * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, passo * 0.485, -Math.PI / 2, -Math.PI / 2 + TAU * restante);
  ctx.strokeStyle = restante < 0.25 ? '#ff7b7b' : 'rgba(224,192,110,0.85)';
  ctx.stroke();

  const emoji = EMOJI_ITEM[item.tipo] || '❓';
  ctx.font = `${Math.max(11, Math.round(passo * 0.82))}px ${FONTE_EMOJI}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(emoji, x, y + passo * 0.03);

  ctx.restore();
};
