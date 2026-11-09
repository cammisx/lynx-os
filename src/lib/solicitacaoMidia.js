/**
 * SOLICITACAO DE MIDIA (a cobrinha tematica): regras e numeros do jogo.
 *
 * Fica separado do componente para poder ser testado sem React: os itens com
 * tempo de tela e valor, o sorteio das moedas, os tons de pele e as frases do
 * fim de partida.
 */

/** Itens que aparecem no tabuleiro. `duracao` em ms, `peso` no sorteio. */
export const ITENS = {
  berinjela: { nome: 'Berinjela', pontos: 25, duracao: 15000, peso: 0.26 },
  foto: { nome: 'Foto', pontos: 50, duracao: 10000, peso: 0.22 },
  video: { nome: 'Vídeo', pontos: 100, duracao: 8000, peso: 0.16 },
  estrela: { nome: 'Estrela', pontos: 200, duracao: 5000, peso: 0.11 },
  telefone: { nome: 'Telefone', pontos: 500, duracao: 3000, peso: 0.07 },
  /* Moeda nao tem valor fixo: ver `sortearMoeda`. */
  moeda: { nome: 'Moeda', pontos: null, duracao: 15000, peso: 0.18 },
};

export const TIPOS_ITEM = Object.keys(ITENS);

/**
 * Faixas da moeda: a maior parte cai entre 50 e 250; os extremos sao raros.
 * Tudo em multiplos de 5.
 */
export const FAIXAS_MOEDA = [
  { min: 5, max: 45, peso: 8 },
  { min: 50, max: 250, peso: 70 },
  { min: 255, max: 380, peso: 15 },
  { min: 385, max: 500, peso: 7 },
];

const entre = (min, max, rnd) => min + Math.floor(rnd() * (max - min + 1));

/** Valor da moeda: multiplo de 5 entre 5 e 500, com sorteio por faixa. */
export const sortearMoeda = (rnd = Math.random) => {
  const total = FAIXAS_MOEDA.reduce((soma, faixa) => soma + faixa.peso, 0);
  let alvo = rnd() * total;
  const faixa = FAIXAS_MOEDA.find((f) => (alvo -= f.peso) <= 0) || FAIXAS_MOEDA[1];
  const passos = Math.floor((faixa.max - faixa.min) / 5) + 1;
  return faixa.min + entre(0, passos - 1, rnd) * 5;
};

/** Sorteia o proximo item pelo peso de cada tipo. */
export const sortearTipo = (rnd = Math.random) => {
  const total = TIPOS_ITEM.reduce((soma, tipo) => soma + ITENS[tipo].peso, 0);
  let alvo = rnd() * total;
  return TIPOS_ITEM.find((tipo) => (alvo -= ITENS[tipo].peso) <= 0) || 'berinjela';
};

/** Valor que o item paga ao ser pego (a moeda sorteia na hora). */
export const valorDoItem = (tipo, rnd = Math.random) =>
  ITENS[tipo]?.pontos ?? sortearMoeda(rnd);

/** Tons de pele do penis, do mais claro ao mais escuro. */
export const PELES = {
  clara: { nome: 'Clara', cor: '#f0c9a8', sombra: '#c99b78', glande: '#f2b3a0', pelos: '#4a2f1c' },
  bege: { nome: 'Bege', cor: '#e2b58c', sombra: '#b98a62', glande: '#e2a389', pelos: '#3f2716' },
  morena: { nome: 'Morena', cor: '#c68d5e', sombra: '#9b673e', glande: '#c07d68', pelos: '#33200f' },
  parda: { nome: 'Parda', cor: '#a06a3f', sombra: '#7a4d2b', glande: '#9b5f47', pelos: '#26160a' },
  negra: { nome: 'Negra', cor: '#70452a', sombra: '#4e2e18', glande: '#6b3d2c', pelos: '#1a0f06' },
};

export const TONS_PELE = Object.keys(PELES);

export const peleEscolhida = (tom) => PELES[tom] || PELES.morena;

/** Quanto valeu a partida. Ajuste fino aqui se quiser mudar o tom das frases. */
export const CORTES_FIM = { medio: 900, alto: 3000 };

export const FRASES_FIM = {
  baixo: 'Os cara tão tudo pobre hoje, tá louco',
  medio: 'Até que deu pra vender um pouquinho',
  alto: 'Hoje a comissão vem gorda',
};

export const classificacao = (pontos) => {
  const valor = Number(pontos) || 0;
  if (valor >= CORTES_FIM.alto) return 'alto';
  if (valor >= CORTES_FIM.medio) return 'medio';
  return 'baixo';
};

export const fraseDoFim = (pontos) => FRASES_FIM[classificacao(pontos)];

/** Legenda curta dos itens, usada na tela de inicio e nas configuracoes. */
export const LEGENDA_ITENS =
  'Berinjela 25 · Foto 50 · Vídeo 100 · Estrela 200 · Telefone 500 · Moedas de 5 a 500';

/** Texto da tela de inicio (o que a pessoa le antes de comecar). */
export const TEXTO_INICIO_SOLICITACAO =
  'Utilize as setas ou deslize o dedo para se movimentar pelo mapa e aperte Espaço ' +
  'para pausar. Alimente a cobrinha com conteúdo para fazer mais pontos!';

export const INSTRUCAO_SOLICITACAO =
  'Como jogar: setas do teclado, WASD, deslize o dedo ou use o direcional. ' +
  `Cada item fica só um tempo na tela: ${LEGENDA_ITENS}. ` +
  'A cobrinha cresce a cada item pego e a partida acaba se ela bater na borda ou em si mesma. ' +
  `A pele e os pelos são só enfeite: não mudam o jogo.`;
