/**
 * Relatório semanal de vendas de um chatter, sempre de segunda a domingo.
 *
 * O PDF segue a estética do app: fundo escuro do crepúsculo, vidro fosco
 * simulado em painéis translúcidos, dourado da marca e Roboto Mono.
 *
 * O documento é a prestação de contas do chatter: cada venda com bruto,
 * líquido e a comissão dele, mais os totais. A parte da agência fica fora.
 */

import { jsPDF } from 'jspdf';
import { calcularVenda, moeda, pctChatter } from '@/lib/financeiro';

/** Segunda-feira da semana da data de referência, na meia-noite local. */
export const inicioDaSemana = (referencia = new Date()) => {
  const data = new Date(referencia);
  const deslocamento = (data.getDay() + 6) % 7;
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() - deslocamento);
};

export const fimDaSemana = (inicio) =>
  new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 7);

export const somarSemanas = (inicio, semanas) =>
  new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + semanas * 7);

const dd = (valor) => String(valor).padStart(2, '0');

export const diaMes = (data) => `${dd(new Date(data).getDate())}/${dd(new Date(data).getMonth() + 1)}`;

export const semanaLabel = (inicio) => {
  const fim = new Date(fimDaSemana(inicio).getTime() - 1);
  return `${diaMes(inicio)} a ${dd(fim.getDate())}/${dd(fim.getMonth() + 1)}/${fim.getFullYear()}`;
};

export const semanaCurta = (inicio) => {
  const fim = new Date(fimDaSemana(inicio).getTime() - 1);
  return `${diaMes(inicio)} – ${diaMes(fim)}`;
};

export const diasDaSemana = (inicio) =>
  Array.from({ length: 7 }, (_, indice) => {
    const data = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice);
    return {
      data,
      chave: `${data.getFullYear()}-${dd(data.getMonth() + 1)}-${dd(data.getDate())}`,
      label: `${dd(data.getDate())}/${dd(data.getMonth() + 1)}`,
      nome: data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
    };
  });

export const vendasDaSemana = (vendas = [], inicio) => {
  const de = inicio.getTime();
  const ate = fimDaSemana(inicio).getTime();
  return vendas
    .filter((venda) => {
      const quando = new Date(venda?.ocorrido_em).getTime();
      return Number.isFinite(quando) && quando >= de && quando < ate;
    })
    .sort((a, b) => new Date(a.ocorrido_em) - new Date(b.ocorrido_em));
};

export const resumoSemana = (vendas = [], modelo, chatter) => {
  const resumo = {
    vendas: vendas.length,
    bruto: 0,
    liquido: 0,
    comissao: 0,
    pct: pctChatter(chatter),
    porTipo: new Map(),
  };
  vendas.forEach((venda) => {
    const contas = calcularVenda(venda, modelo, chatter);
    resumo.bruto += contas.bruto;
    resumo.liquido += contas.liquido;
    resumo.comissao += contas.chatter;
    const tipo = venda?.tipo || 'Outros';
    resumo.porTipo.set(tipo, (resumo.porTipo.get(tipo) || 0) + contas.bruto);
  });
  return resumo;
};

/* ------------------------------------------------------------------ */
/* Estética                                                           */
/* ------------------------------------------------------------------ */

const OURO = [240, 148, 58];
const MAGENTA = [200, 56, 122];
const ROXO = [155, 63, 168];

const mistura = (a, b, t) => a.map((valor, indice) => Math.round(valor + (b[indice] - valor) * t));

const PAPEL = {
  tinta: [255, 255, 255],
  texto: [232, 219, 228],
  suave: [168, 142, 158],
  fraco: [122, 100, 116],
  ouro: OURO,
};

const MARGEM = 14;
const LARGURA = 210;
const ALTURA = 297;
const CONTEUDO = LARGURA - MARGEM * 2;

const FONTE = 'RobotoMono';
const FONTE_ALTERNATIVA = 'courier';

let fontesEmCache = null;

const paraBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  const passo = 0x8000;
  for (let inicio = 0; inicio < bytes.length; inicio += passo) {
    binario += String.fromCharCode(...bytes.subarray(inicio, inicio + passo));
  }
  return btoa(binario);
};

const TAMANHO_MINIMO_FONTE = 20000;

/** Confere a assinatura do arquivo: se o servidor devolver o index.html no lugar
 *  da fonte, o jsPDF quebra ao desenhar o texto. */
const pareceFonte = (buffer) => {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < TAMANHO_MINIMO_FONTE) return false;
  const assinatura = String.fromCharCode(...bytes.subarray(0, 4));
  if (assinatura === 'OTTO' || assinatura === 'true' || assinatura === 'ttcf') return true;
  return bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0;
};

const caminhosDaFonte = (arquivo) => {
  const base = import.meta?.env?.BASE_URL || '/';
  const caminhos = [
    `${base}fonts/${arquivo}`,
    `fonts/${arquivo}`,
    `/fonts/${arquivo}`,
  ];
  return [...new Set(caminhos.map((caminho) => caminho.replace(/\/{2,}/g, '/')))];
};

const baixarFonte = async (arquivo) => {
  let ultimoErro = null;
  for (const caminho of caminhosDaFonte(arquivo)) {
    try {
      const resposta = await fetch(caminho);
      if (!resposta.ok) throw new Error(`fonte indisponível (${resposta.status})`);
      const buffer = await resposta.arrayBuffer();
      if (!pareceFonte(buffer)) throw new Error('arquivo não é uma fonte válida');
      return paraBase64(buffer);
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  throw ultimoErro || new Error('fonte indisponível');
};

const carregarFontes = async (doc) => {
  try {
    if (!fontesEmCache) {
      const [normal, negrito] = await Promise.all([
        baixarFonte('RobotoMono-Regular.ttf'),
        baixarFonte('RobotoMono-Bold.ttf'),
      ]);
      fontesEmCache = { normal, negrito };
    }
    doc.addFileToVFS('RobotoMono-Regular.ttf', fontesEmCache.normal);
    doc.addFont('RobotoMono-Regular.ttf', FONTE, 'normal');
    doc.addFileToVFS('RobotoMono-Bold.ttf', fontesEmCache.negrito);
    doc.addFont('RobotoMono-Bold.ttf', FONTE, 'bold');
    // testa de verdade: se a fonte não servir, o PDF inteiro ia embora
    doc.setFont(FONTE, 'normal');
    doc.getStringUnitWidth('Aa');
    doc.setFont(FONTE, 'bold');
    doc.getStringUnitWidth('Aa');
    doc.setFont(FONTE, 'normal');
    return FONTE;
  } catch (erro) {
    fontesEmCache = null;
    doc.setFont(FONTE_ALTERNATIVA, 'normal');
    return FONTE_ALTERNATIVA;
  }
};

const fundoDoCrepusculo = (doc) => {
  const total = 74;
  const altura = ALTURA / total;
  for (let faixa = 0; faixa < total; faixa += 1) {
    const t = faixa / (total - 1);
    // noite -> roxo brilhante no meio -> noite funda embaixo
    const cor =
      t < 0.42
        ? mistura([22, 6, 16], [46, 14, 40], t / 0.42)
        : mistura([46, 14, 40], [17, 4, 13], (t - 0.42) / 0.58);
    doc.setFillColor(...cor);
    doc.rect(0, faixa * altura, LARGURA, altura + 0.35, 'F');
  }

  // filetes da marca
  doc.setFillColor(...OURO);
  doc.rect(0, 0, LARGURA, 0.9, 'F');
  doc.setFillColor(...MAGENTA);
  doc.rect(0, 0.9, LARGURA, 0.25, 'F');
};

const painel = (doc, x, y, largura, altura, { destaque = false, raio = 2.4 } = {}) => {
  doc.setFillColor(43, 15, 36);
  doc.roundedRect(x, y, largura, altura, raio, raio, 'F');
  doc.setFillColor(...mistura([43, 15, 36], [255, 255, 255], 0.04));
  doc.roundedRect(x, y, largura, altura, raio, raio, 'F');
  doc.setDrawColor(...(destaque ? OURO : mistura([70, 30, 55], [255, 255, 255], 0.1)));
  doc.setLineWidth(destaque ? 0.45 : 0.18);
  doc.roundedRect(x, y, largura, altura, raio, raio, 'S');
};

const texto = (doc, valor, x, y, opcoes = {}) => {
  const { tamanho = 9, cor = PAPEL.texto, negrito = false, alinhamento = 'left', espaco = 0 } = opcoes;
  const conteudo = String(valor ?? '');
  doc.setFont(undefined, negrito ? 'bold' : 'normal');
  doc.setFontSize(tamanho);
  doc.setTextColor(...cor);

  if (espaco) {
    // O jsPDF mede a largura sem o espaçamento extra das letras, então o texto
    // com charSpace e alinhamento à direita vazava pela borda do painel.
    const largura = doc.getTextWidth(conteudo) + espaco * Math.max(0, conteudo.length - 1);
    const deslocamento = alinhamento === 'right' ? -largura : alinhamento === 'center' ? -largura / 2 : 0;
    doc.setCharSpace(espaco);
    doc.text(conteudo, x + deslocamento, y, { align: 'left' });
    doc.setCharSpace(0);
    return;
  }

  doc.text(conteudo, x, y, { align: alinhamento });
};

const corta = (valor, limite) => {
  const texto_ = String(valor || '');
  return texto_.length > limite ? `${texto_.slice(0, limite - 1)}…` : texto_;
};

const dataHoraCurta = (iso) => {
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return '—';
  return `${dd(data.getDate())}/${dd(data.getMonth() + 1)} ${dd(data.getHours())}:${dd(data.getMinutes())}`;
};

const COLUNAS = [
  { titulo: 'DATA', largura: 26, alinhamento: 'left' },
  { titulo: 'COMPRADOR', largura: 50, alinhamento: 'left' },
  { titulo: 'TIPO', largura: 32, alinhamento: 'left' },
  { titulo: 'BRUTO', largura: 26, alinhamento: 'right' },
  { titulo: 'LÍQUIDO', largura: 26, alinhamento: 'right' },
  { titulo: 'COMISSÃO', largura: 22, alinhamento: 'right' },
];

const cabecalho = (doc, { modelo, chatter, inicio, compacto = false, titulo = 'Relatório semanal' }) => {
  if (compacto) {
    texto(doc, titulo.toUpperCase(), MARGEM, 16, {
      tamanho: 8,
      cor: PAPEL.ouro,
      negrito: true,
      espaco: 0.8,
    });
    texto(doc, `${modelo?.nome || '—'} · ${chatter?.nome || '—'} · ${semanaCurta(inicio)}`, MARGEM, 22, {
      tamanho: 8.5,
      cor: PAPEL.suave,
    });
    doc.setDrawColor(...mistura([70, 30, 55], [255, 255, 255], 0.12));
    doc.setLineWidth(0.15);
    doc.line(MARGEM, 26, LARGURA - MARGEM, 26);
    return 32;
  }

  texto(doc, 'LYNX OS', MARGEM, 13, {
    tamanho: 7.5,
    cor: PAPEL.ouro,
    negrito: true,
    espaco: 1.6,
  });
  texto(doc, 'financeiro', MARGEM + 17, 13, { tamanho: 7.5, cor: PAPEL.fraco, espaco: 0.4 });

  texto(doc, titulo, MARGEM, 26, {
    tamanho: 21,
    cor: PAPEL.tinta,
    negrito: true,
  });
  texto(doc, `${modelo?.nome || '—'}  ·  ${chatter?.nome || '—'}`, MARGEM, 33.5, {
    tamanho: 9.5,
    cor: PAPEL.suave,
  });

  // chip do período
  const chipLargura = 58;
  const chipX = LARGURA - MARGEM - chipLargura;
  doc.setFillColor(43, 15, 36);
  doc.roundedRect(chipX, 12, chipLargura, 15, 2.2, 2.2, 'F');
  doc.setDrawColor(...mistura(OURO, [43, 15, 36], 0.45));
  doc.setLineWidth(0.3);
  doc.roundedRect(chipX, 12, chipLargura, 15, 2.2, 2.2, 'S');
  texto(doc, 'SEMANA', chipX + chipLargura / 2, 17.2, {
    tamanho: 6.2,
    cor: PAPEL.fraco,
    alinhamento: 'center',
    espaco: 1.1,
  });
  texto(doc, semanaCurta(inicio), chipX + chipLargura / 2, 23.4, {
    tamanho: 9.5,
    cor: PAPEL.ouro,
    negrito: true,
    alinhamento: 'center',
  });

  doc.setDrawColor(...mistura([70, 30, 55], [255, 255, 255], 0.12));
  doc.setLineWidth(0.15);
  doc.line(MARGEM, 40, LARGURA - MARGEM, 40);
  return 46;
};

const cartoesDoResumo = (doc, y, resumo) => {
  const vao = 5;
  const largura = (CONTEUDO - vao * 2) / 3;
  const cartoes = [
    { titulo: 'VENDAS', valor: String(resumo.vendas), destaque: false },
    { titulo: 'TOTAL BRUTO', valor: moeda(resumo.bruto), destaque: false },
    { titulo: `COMISSÃO · ${resumo.pct}%`, valor: moeda(resumo.comissao), destaque: true },
  ];

  cartoes.forEach((cartao, indice) => {
    const x = MARGEM + (largura + vao) * indice;
    painel(doc, x, y, largura, 21, { destaque: cartao.destaque });
    texto(doc, cartao.titulo, x + 4, y + 6.4, {
      tamanho: 6.4,
      cor: cartao.destaque ? PAPEL.ouro : PAPEL.fraco,
      espaco: 0.9,
    });
    texto(doc, cartao.valor, x + 4, y + 15.4, {
      tamanho: 13,
      cor: cartao.destaque ? PAPEL.ouro : PAPEL.tinta,
      negrito: true,
    });
  });

  return y + 21;
};

const cabecalhoDaTabela = (doc, y) => {
  let x = MARGEM;
  COLUNAS.forEach((coluna) => {
    const posicao = coluna.alinhamento === 'right' ? x + coluna.largura - 1 : x;
    texto(doc, coluna.titulo, posicao, y, {
      tamanho: 6.4,
      cor: PAPEL.ouro,
      negrito: true,
      alinhamento: coluna.alinhamento,
      espaco: 0.6,
    });
    x += coluna.largura;
  });
  doc.setDrawColor(...mistura([70, 30, 55], [255, 255, 255], 0.16));
  doc.setLineWidth(0.15);
  doc.line(MARGEM, y + 2.6, LARGURA - MARGEM, y + 2.6);
  return y + 8;
};

/** Painel final de totais, igual para uma modelo ou para o total geral. */
const painelDeTotais = (doc, y, resumo, inicio) => {
  const alturaTotais = 34;
  painel(doc, MARGEM, y, CONTEUDO, alturaTotais, { destaque: true });

  // coluna esquerda: comissão do chatter
  texto(doc, 'COMISSÃO DO CHATTER', MARGEM + 6, y + 8, {
    tamanho: 6.6,
    cor: PAPEL.fraco,
    negrito: true,
    espaco: 1,
  });
  texto(doc, moeda(resumo.comissao), MARGEM + 6, y + 19.5, {
    tamanho: 16,
    cor: PAPEL.ouro,
    negrito: true,
  });
  texto(doc, `valor a receber · ${resumo.pct}% do líquido`, MARGEM + 6, y + 25.5, {
    tamanho: 7,
    cor: PAPEL.suave,
  });

  // divisória
  doc.setDrawColor(...mistura([70, 30, 55], [255, 255, 255], 0.14));
  doc.setLineWidth(0.15);
  doc.line(MARGEM + CONTEUDO * 0.54, y + 5, MARGEM + CONTEUDO * 0.54, y + alturaTotais - 5);

  // coluna direita: totais
  const direita = MARGEM + CONTEUDO - 6;
  texto(doc, 'TOTAIS DA SEMANA', direita, y + 8, {
    tamanho: 6.6,
    cor: PAPEL.fraco,
    negrito: true,
    alinhamento: 'right',
    espaco: 1,
  });
  texto(doc, `total bruto · ${moeda(resumo.bruto)}`, direita, y + 15.5, {
    tamanho: 8,
    cor: PAPEL.suave,
    alinhamento: 'right',
  });
  texto(doc, `total líquido · ${moeda(resumo.liquido)}`, direita, y + 21, {
    tamanho: 8,
    cor: PAPEL.suave,
    alinhamento: 'right',
  });
  texto(doc, `${resumo.vendas} venda(s) · ${semanaLabel(inicio)}`, direita, y + 27.5, {
    tamanho: 7,
    cor: PAPEL.fraco,
    alinhamento: 'right',
  });

  return y + alturaTotais;
};

/**
 * Uma seção = uma modelo com as vendas daquele chatter na semana.
 * Desenha na página atual; quem chama decide se precisa de página nova.
 */
const desenharSecao = (doc, { modelo, chatter, inicio, vendas }) => {
  const resumo = resumoSemana(vendas, modelo, chatter);

  fundoDoCrepusculo(doc);
  let y = cabecalho(doc, { modelo, chatter, inicio });
  y = cartoesDoResumo(doc, y + 6, resumo) + 12;

  const novaPagina = () => {
    doc.addPage();
    fundoDoCrepusculo(doc);
    y = cabecalho(doc, { modelo, chatter, inicio, compacto: true });
    y = cabecalhoDaTabela(doc, y + 2);
  };

  y = cabecalhoDaTabela(doc, y);
  const alturaDaLinha = 7.2;

  if (!vendas.length) {
    painel(doc, MARGEM, y + 2, CONTEUDO, 18);
    texto(doc, 'Nenhuma venda registrada nesta semana.', MARGEM + 5, y + 12, {
      tamanho: 9,
      cor: PAPEL.suave,
    });
    y += 24;
  }

  vendas.forEach((venda, indice) => {
    if (y + alturaDaLinha > 246) novaPagina();

    const contas = calcularVenda(venda, modelo, chatter);
    if (indice % 2 === 0) {
      doc.setFillColor(...mistura([30, 9, 24], [255, 255, 255], 0.035));
      doc.rect(MARGEM - 2, y - 4.6, CONTEUDO + 4, alturaDaLinha, 'F');
    }

    const valores = [
      dataHoraCurta(venda.ocorrido_em),
      corta(venda.usuario_plataforma, 25),
      corta(venda.tipo || '—', 16),
      moeda(contas.bruto),
      moeda(contas.liquido),
      moeda(contas.chatter),
    ];

    let x = MARGEM;
    valores.forEach((valor, indiceColuna) => {
      const coluna = COLUNAS[indiceColuna];
      const posicao = coluna.alinhamento === 'right' ? x + coluna.largura - 1 : x;
      const ultima = indiceColuna === valores.length - 1;
      texto(doc, valor, posicao, y, {
        tamanho: 8.2,
        cor: ultima ? PAPEL.ouro : indiceColuna === 0 ? PAPEL.fraco : PAPEL.texto,
        negrito: ultima,
        alinhamento: coluna.alinhamento,
      });
      x += coluna.largura;
    });

    y += alturaDaLinha;
  });

  if (y + 34 + 10 > ALTURA - 16) novaPagina();
  y = painelDeTotais(doc, y + 8, resumo, inicio);

  return resumo;
};

const COLUNAS_TOTAL = [
  { titulo: 'MODELO', largura: 58, alinhamento: 'left' },
  { titulo: 'VENDAS', largura: 22, alinhamento: 'right' },
  { titulo: 'BRUTO', largura: 34, alinhamento: 'right' },
  { titulo: 'LÍQUIDO', largura: 34, alinhamento: 'right' },
  { titulo: 'COMISSÃO', largura: 34, alinhamento: 'right' },
];

/** Página final: soma de tudo que o chatter recebe, com a quebra por modelo. */
const desenharTotal = (doc, { chatter, inicio, resumos }) => {
  const total = resumos.reduce(
    (soma, item) => ({
      vendas: soma.vendas + item.vendas,
      bruto: soma.bruto + item.bruto,
      liquido: soma.liquido + item.liquido,
      comissao: soma.comissao + item.comissao,
      pct: item.pct,
    }),
    { vendas: 0, bruto: 0, liquido: 0, comissao: 0, pct: pctChatter(chatter) }
  );

  doc.addPage();
  fundoDoCrepusculo(doc);
  let y = cabecalho(doc, {
    modelo: { nome: 'Todas as modelos' },
    chatter,
    inicio,
    titulo: 'Total geral',
  });
  y = cartoesDoResumo(doc, y + 6, total) + 12;

  let x = MARGEM;
  COLUNAS_TOTAL.forEach((coluna) => {
    const posicao = coluna.alinhamento === 'right' ? x + coluna.largura - 1 : x;
    texto(doc, coluna.titulo, posicao, y, {
      tamanho: 6.4,
      cor: PAPEL.ouro,
      negrito: true,
      alinhamento: coluna.alinhamento,
      espaco: 0.6,
    });
    x += coluna.largura;
  });
  doc.setDrawColor(...mistura([70, 30, 55], [255, 255, 255], 0.16));
  doc.setLineWidth(0.15);
  doc.line(MARGEM, y + 2.6, LARGURA - MARGEM, y + 2.6);
  y += 8;

  const alturaDaLinha = 7.2;
  resumos.forEach((item, indice) => {
    if (y + alturaDaLinha > 246) {
      doc.addPage();
      fundoDoCrepusculo(doc);
      y = cabecalho(doc, {
        modelo: { nome: 'Todas as modelos' },
        chatter,
        inicio,
        compacto: true,
        titulo: 'Total geral',
      });
      y += 8;
    }

    if (indice % 2 === 0) {
      doc.setFillColor(...mistura([30, 9, 24], [255, 255, 255], 0.035));
      doc.rect(MARGEM - 2, y - 4.6, CONTEUDO + 4, alturaDaLinha, 'F');
    }

    const valores = [
      corta(item.modelo?.nome || '—', 28),
      String(item.vendas),
      moeda(item.bruto),
      moeda(item.liquido),
      moeda(item.comissao),
    ];

    let colunaX = MARGEM;
    valores.forEach((valor, indiceColuna) => {
      const coluna = COLUNAS_TOTAL[indiceColuna];
      const posicao = coluna.alinhamento === 'right' ? colunaX + coluna.largura - 1 : colunaX;
      const ultima = indiceColuna === valores.length - 1;
      texto(doc, valor, posicao, y, {
        tamanho: 8.2,
        cor: ultima ? PAPEL.ouro : indiceColuna === 0 ? PAPEL.texto : PAPEL.texto,
        negrito: ultima,
        alinhamento: coluna.alinhamento,
      });
      colunaX += coluna.largura;
    });

    y += alturaDaLinha;
  });

  if (y + 34 + 10 > ALTURA - 16) {
    doc.addPage();
    fundoDoCrepusculo(doc);
    y = cabecalho(doc, {
      modelo: { nome: 'Todas as modelos' },
      chatter,
      inicio,
      compacto: true,
      titulo: 'Total geral',
    });
  }
  y = painelDeTotais(doc, y + 8, total, inicio);

  return total;
};

/**
 * Monta e salva o PDF. Cada seção traz uma modelo e as vendas daquele chatter
 * na semana, já filtradas. Com mais de uma seção, entra a página de total.
 */
export const gerarRelatorioSemanal = async ({ modelo, chatter, inicio, vendas, secoes }) => {
  const lista = (secoes && secoes.length ? secoes : [{ modelo, vendas }]).filter(Boolean);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const fonte = await carregarFontes(doc);
  if (fonte !== FONTE_ALTERNATIVA) doc.setFont(fonte);

  const resumos = lista.map((secao, indice) => {
    if (indice > 0) doc.addPage();
    const resumo = desenharSecao(doc, { ...secao, chatter, inicio });
    return { ...resumo, modelo: secao.modelo };
  });

  const total = lista.length > 1 ? desenharTotal(doc, { chatter, inicio, resumos }) : null;

  // Rodapé em todas as páginas
  const totalPaginas = doc.getNumberOfPages();
  const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  for (let indice = 1; indice <= totalPaginas; indice += 1) {
    doc.setPage(indice);
    doc.setDrawColor(...mistura([70, 30, 55], [255, 255, 255], 0.1));
    doc.setLineWidth(0.15);
    doc.line(MARGEM, ALTURA - 16, LARGURA - MARGEM, ALTURA - 16);
    texto(doc, 'LYNX OS · financeiro', MARGEM, ALTURA - 11, {
      tamanho: 6.4,
      cor: PAPEL.fraco,
      espaco: 0.6,
    });
    texto(doc, `gerado em ${geradoEm}`, LARGURA / 2, ALTURA - 11, {
      tamanho: 6.4,
      cor: PAPEL.fraco,
      alinhamento: 'center',
    });
    texto(doc, `página ${indice} de ${totalPaginas}`, LARGURA - MARGEM, ALTURA - 11, {
      tamanho: 6.4,
      cor: PAPEL.fraco,
      alinhamento: 'right',
    });
  }

  const slug = (valor) =>
    String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

  const escopo = lista.length > 1 ? 'todas-as-modelos' : slug(lista[0]?.modelo?.nome);

  doc.save(
    `relatorio-semanal-${escopo}-${slug(chatter?.nome)}-${inicio.getFullYear()}-${dd(
      inicio.getMonth() + 1
    )}-${dd(inicio.getDate())}.pdf`
  );

  return { paginas: totalPaginas, resumo: resumos[0], resumos, total };
};
