/**
 * Peças do editor de pintura: cores, papéis e conversões.
 *
 * O desenho vive em camadas de canvas. Exportar (baixar, enviar, fixar) sempre
 * junta as camadas visíveis na ordem em que estão na lista.
 */

export const CORES = [
  '#111111',
  '#ffffff',
  '#e5484d',
  '#f2a33c',
  '#f7d154',
  '#4cc38a',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#8d6e63',
];

export const FERRAMENTAS = [
  { id: 'selecionar', rotulo: 'Selecionar' },
  { id: 'pincel', rotulo: 'Pincel' },
  { id: 'borracha', rotulo: 'Borracha' },
  { id: 'balde', rotulo: 'Balde' },
  { id: 'conta-gotas', rotulo: 'Conta-gotas' },
  { id: 'linha', rotulo: 'Linha' },
  { id: 'retangulo', rotulo: 'Retângulo' },
  { id: 'elipse', rotulo: 'Elipse' },
];

export const ZOOMS = [0.25, 0.5, 1, 2, 4];

/** Ferramentas que desenham forma fechada e por isso aceitam preenchimento. */
export const COM_PREENCHIMENTO = ['retangulo', 'elipse'];

export const TRANSPARENTE = 'transparente';

/* As CORES acima são as dez padrão: são fixas, iguais para todo mundo e nunca
   entram na conta das personalizadas. A paleta de cada pessoa é 10 padrão +
   até 10 personalizadas, vinte no total. */
export const LIMITE_CORES_CUSTOM = 10;

/** Quantos passos de desfazer ficam guardados. */
export const LIMITE_HISTORICO = 15;

export const criarCanvas = (largura, altura) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(largura));
  canvas.height = Math.max(1, Math.round(altura));
  return canvas;
};

export const novoId = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Junta as camadas visíveis, respeitando opacidade, num canvas só. */
export const compor = (camadas, largura, altura, fundo = null) => {
  const alvo = criarCanvas(largura, altura);
  const ctx = alvo.getContext('2d');
  if (fundo) {
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, largura, altura);
  }
  (camadas || []).forEach((camada) => {
    if (!camada.visivel || !camada.canvas) return;
    ctx.globalAlpha = Number.isFinite(camada.opacidade) ? camada.opacidade : 1;
    ctx.drawImage(camada.canvas, 0, 0);
  });
  ctx.globalAlpha = 1;
  return alvo;
};

/** Baixa um canvas ou uma URL como .jpg (o fundo branco entra no lugar do alfa). */
export const baixarJpg = async (origem, nome = 'desenho') => {
  let canvas = origem;
  if (typeof origem === 'string') {
    const imagem = await new Promise((ok, falha) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => ok(img);
      img.onerror = () => falha(new Error('não consegui abrir a imagem'));
      img.src = origem;
    });
    canvas = criarCanvas(imagem.naturalWidth, imagem.naturalHeight);
    canvas.getContext('2d').drawImage(imagem, 0, 0);
  }

  const saida = criarCanvas(canvas.width, canvas.height);
  const ctx = saida.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, saida.width, saida.height);
  ctx.drawImage(canvas, 0, 0);

  const url = saida.toDataURL('image/jpeg', 0.92);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nome}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const canvasParaBlob = (canvas, tipo = 'image/png') =>
  new Promise((ok, falha) => {
    try {
      canvas.toBlob((blob) => (blob ? ok(blob) : falha(new Error('canvas vazio'))), tipo, 0.95);
    } catch (falhaCanvas) {
      falha(falhaCanvas);
    }
  });

export const paraArquivo = (blob, nome = 'desenho.png') =>
  new File([blob], nome, { type: blob?.type || 'image/png' });

/** Cor de um pixel em "rrggbb", a partir do canvas já composto. */
export const corDoPixel = (canvas, x, y) => {
  const ctx = canvas.getContext('2d');
  const dados = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  if (dados[3] === 0) return null;
  const hex = (n) => n.toString(16).padStart(2, '0');
  return `#${hex(dados[0])}${hex(dados[1])}${hex(dados[2])}`;
};

/**
 * Preenche a área da mesma cor a partir do ponto, com tolerância.
 * Devolve true quando pintou algo.
 */
export const preencherArea = (ctx, largura, altura, x, y, cor, tolerancia = 32) => {
  const alvoX = Math.round(x);
  const alvoY = Math.round(y);
  if (alvoX < 0 || alvoY < 0 || alvoX >= largura || alvoY >= altura) return false;

  const imagem = ctx.getImageData(0, 0, largura, altura);
  const dados = imagem.data;
  const indice = (px, py) => (py * largura + px) * 4;
  const inicio = indice(alvoX, alvoY);
  const base = [dados[inicio], dados[inicio + 1], dados[inicio + 2], dados[inicio + 3]];

  const rgb = /^#?([0-9a-f]{6})$/i.exec(String(cor).trim());
  if (!rgb) return false;
  const valor = parseInt(rgb[1], 16);
  const novo = [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255, 255];

  const parecido = (pos) => {
    const d = Math.abs(dados[pos] - base[0]) +
      Math.abs(dados[pos + 1] - base[1]) +
      Math.abs(dados[pos + 2] - base[2]) +
      Math.abs(dados[pos + 3] - base[3]);
    return d <= tolerancia * 4;
  };

  if (
    base[0] === novo[0] &&
    base[1] === novo[1] &&
    base[2] === novo[2] &&
    base[3] === novo[3]
  ) {
    return false;
  }

  const pilha = [[alvoX, alvoY]];
  const vistos = new Uint8Array(largura * altura);

  while (pilha.length) {
    const [px, py] = pilha.pop();
    let x1 = px;
    while (x1 >= 0 && !vistos[py * largura + x1] && parecido(indice(x1, py))) x1 -= 1;
    x1 += 1;

    let acima = false;
    let abaixo = false;

    while (x1 < largura && !vistos[py * largura + x1] && parecido(indice(x1, py))) {
      const pos = indice(x1, py);
      dados[pos] = novo[0];
      dados[pos + 1] = novo[1];
      dados[pos + 2] = novo[2];
      dados[pos + 3] = novo[3];
      vistos[py * largura + x1] = 1;

      if (py > 0) {
        const subiu = !vistos[(py - 1) * largura + x1] && parecido(indice(x1, py - 1));
        if (subiu && !acima) pilha.push([x1, py - 1]);
        acima = subiu;
      }
      if (py < altura - 1) {
        const desceu = !vistos[(py + 1) * largura + x1] && parecido(indice(x1, py + 1));
        if (desceu && !abaixo) pilha.push([x1, py + 1]);
        abaixo = desceu;
      }
      x1 += 1;
    }
  }

  ctx.putImageData(imagem, 0, 0);
  return true;
};

/** Traz um arquivo remoto como blob (para reenviar um desenho já fixado). */
export const urlParaBlob = async (url) => {
  const resposta = await fetch(url, { mode: 'cors' });
  if (!resposta.ok) throw new Error('não consegui baixar a imagem');
  return resposta.blob();
};

/* ---------- cores ---------- */

export const hexParaRgb = (hex) => {
  const limpo = String(hex || '').replace('#', '').trim();
  if (limpo.length !== 6) return { r: 0, g: 0, b: 0 };
  const valor = parseInt(limpo, 16);
  return { r: (valor >> 16) & 255, g: (valor >> 8) & 255, b: valor & 255 };
};

export const rgbParaHex = (r, g, b) => {
  const um = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${um(r)}${um(g)}${um(b)}`;
};

/** HSV (h 0–360, s e v 0–1) para hexadecimal. */
export const hsvParaHex = (h, s, v) => {
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
  return rgbParaHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
};

/** Hexadecimal para HSV. */
export const hexParaHsv = (hex) => {
  const { r, g, b } = hexParaRgb(hex);
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
};

/** Branco no rótulo, preto no rótulo: usado para texto sobre a cor. */
export const contraste = (hex) => {
  const { r, g, b } = hexParaRgb(hex);
  const luz = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luz > 0.62 ? '#111111' : '#ffffff';
};

/** Cópia reduzida do canvas, para caber na mesa sem pesar o banco. */
export const reduzirCanvas = (canvas, maxLado = 720) => {
  const maior = Math.max(canvas.width, canvas.height);
  if (maior <= maxLado) return canvas;
  const escala = maxLado / maior;
  const copia = criarCanvas(
    Math.max(1, Math.round(canvas.width * escala)),
    Math.max(1, Math.round(canvas.height * escala))
  );
  const ctx = copia.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, copia.width, copia.height);
  return copia;
};

/** Retângulo normalizado (largura e altura sempre positivas). */
export const normalizarRetangulo = (a, b) => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(b.x - a.x),
  h: Math.abs(b.y - a.y),
});
