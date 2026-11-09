/**
 * Desenho do SOLICITACAO DE MIDIA em canvas puro.
 *
 * Fica separado do componente para poder ser aberto num teste de tela sem
 * React. As cores sao fixas de proposito: canvas nao entende var(--cor) nem
 * color-mix, e era exatamente isso que deixava a cobrinha antiga preta.
 */

/* O tabuleiro acompanha o tema: a mesma peça muda de fundo no claro e no
   escuro. Canvas não entende var(--cor), então as duas paletas moram aqui. */
export const PALETA = {
  escuro: {
    fundo: '#171021',
    grade: 'rgba(255,255,255,0.045)',
    borda: 'rgba(214,178,94,0.28)',
    aro: 'rgba(255,255,255,0.10)',
    veu: 'rgba(6,4,11,0.62)',
    cartao: 'rgba(16,10,23,0.88)',
  },
  claro: {
    fundo: '#F7F2FB',
    grade: 'rgba(38,16,52,0.07)',
    borda: 'rgba(120,80,20,0.30)',
    aro: 'rgba(38,16,52,0.14)',
    veu: 'rgba(28,18,38,0.12)',
    cartao: 'rgba(255,255,255,0.94)',
  },
};

export const FUNDO = PALETA.escuro.fundo;
export const LINHA_GRADE = PALETA.escuro.grade;
export const BORDA = PALETA.escuro.borda;
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

/* Quando a borda e aberta a cobra atravessa o tabuleiro: duas celulas seguidas
   do corpo ficam em lados opostos da tela. Ligar as duas num traco so fazia a
   cobra esticar pelo tabuleiro inteiro (parecia que ela crescia e ainda passava
   por cima de si mesma). Aqui a sequencia e cortada nesses saltos: cada pedaco
   e desenhado sozinho e a cobra reaparece do outro lado com o mesmo tamanho. */
const cortarSaltos = (pontos, passo) => {
  const pedacos = [];
  let atual = [pontos[0]];
  for (let i = 1; i < pontos.length; i += 1) {
    const antes = pontos[i - 1];
    const ponto = pontos[i];
    const salto = Math.abs(ponto.x - antes.x) > passo * 1.5 || Math.abs(ponto.y - antes.y) > passo * 1.5;
    if (salto) {
      pedacos.push(atual);
      atual = [ponto];
    } else {
      atual.push(ponto);
    }
  }
  pedacos.push(atual);
  return pedacos;
};

/* Direcao real entre duas celulas, desfazendo o salto da borda: se a cabeca
   saltou de um lado para o outro, o sentido do movimento e o oposto do salto. */
const direcaoEntre = (de, para, passo) => {
  let dx = para.x - de.x;
  let dy = para.y - de.y;
  if (Math.abs(dx) > passo * 1.5) dx = -Math.sign(dx) * passo;
  if (Math.abs(dy) > passo * 1.5) dy = -Math.sign(dy) * passo;
  return { dx, dy };
};

const tracar = (ctx, pedacos, largura) => {
  pedacos.forEach((pedaco) => {
    if (pedaco.length > 1) {
      caminho(ctx, pedaco);
      ctx.stroke();
      return;
    }
    /* Pedaco de uma celula so (a cobra cortada dos dois lados da borda):
       desenha um ponto do mesmo tamanho do tronco. */
    const ponto = pedaco[0];
    ctx.beginPath();
    ctx.arc(ponto.x, ponto.y, largura / 2, 0, TAU);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  });
};

export const desenharCobra = (ctx, corpo, passo, pele, pelos) => {
  if (!corpo.length) return;
  const meio = passo / 2;
  const pontos = corpo.map((parte) => ({ x: parte.x * passo + meio, y: parte.y * passo + meio }));
  const pedacos = cortarSaltos(pontos, passo);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  /* Contorno mais escuro para o tronco destacar do fundo. */
  if (pontos.length > 1) {
    ctx.strokeStyle = pele.sombra;
    ctx.lineWidth = passo * 0.74;
    tracar(ctx, pedacos, passo * 0.74);
    ctx.strokeStyle = pele.cor;
    ctx.lineWidth = passo * 0.6;
    tracar(ctx, pedacos, passo * 0.6);
  }

  /* Bolas na base do rabo: enfeite, nao contam para a hitbox. */
  if (pontos.length > 1) {
    const rabo = pontos[pontos.length - 1];
    const antes = pontos[pontos.length - 2];
    const { dx, dy } = direcaoEntre(antes, rabo, passo);
    const angulo = Math.atan2(dy, dx);
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

  /* Cabeca: a glande, virada para onde a cobra anda de verdade (a direcao
     entre a cabeca e o pescoco, sem o salto da borda). */
  const cabeca = pontos[0];
  const anterior = pontos[1] || { x: cabeca.x - passo, y: cabeca.y };
  const direcao = direcaoEntre(anterior, cabeca, passo);
  const angulo = Math.atan2(direcao.dy, direcao.dx);
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

export const desenharItem = (ctx, item, passo, agora, paleta = PALETA.escuro) => {
  const x = item.x * passo + passo / 2;
  const y = item.y * passo + passo / 2;
  const restante = Math.max(0, Math.min(1, (item.expira - agora) / item.duracao));

  ctx.save();

  /* Aro do tempo que sobra. */
  ctx.beginPath();
  ctx.arc(x, y, passo * 0.485, 0, TAU);
  ctx.strokeStyle = paleta.aro;
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