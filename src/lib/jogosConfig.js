/**
 * Configuracoes e recordes dos jogos da janela Jogos.
 *
 * Tudo mora num unico campo do User (`jogos_config`, uma string JSON), na
 * parte compartilhada do perfil: as regras escolhidas no computador valem no
 * celular e os recordes acompanham a pessoa, nao o aparelho.
 *
 * O recorde e POR CONFIGURACAO. Um 4x4 do 2048 nao disputa com um 6x6, um
 * campo minado dificil nao apaga o tempo do facil. Para isso cada recorde tem
 * uma chave montada a partir das regras em uso (ver `chaveRecorde`).
 *
 * Este arquivo e puro: nada de React, nada de banco. Quem grava e o perfil.
 */

/* Versao do formato: se um dia mudar a regua dos recordes, subir aqui deixa
   claro que o valor antigo pode nao valer mais. */
export const VERSAO_JOGOS = 1;

export const JOGOS = ['2048', 'snake', 'campo', 'breakout', 'pokemon'];

export const VELOCIDADES = ['lenta', 'normal', 'rapida'];
export const GRADES = ['pequena', 'media', 'grande'];
export const PAREDES = ['morte', 'atravessa'];
export const DIFICULDADES = ['facil', 'medio', 'dificil', 'personalizado'];

/** Tabuleiros classicos do campo minado. O personalizado usa os numeros soltos. */
export const CAMPO_PRESETS = {
  facil: { largura: 9, altura: 9, minas: 10 },
  medio: { largura: 16, altura: 16, minas: 40 },
  dificil: { largura: 30, altura: 16, minas: 99 },
};

export const LIMITES = {
  tamanho2048: [3, 6],
  meta2048: [1024, 16384],
  campoLargura: [5, 30],
  campoAltura: [5, 20],
  vidasBreakout: [1, 9],
  fileirasBreakout: [3, 6],
};

export const JOGOS_PADRAO = {
  versao: VERSAO_JOGOS,
  /* `direcional`: mostra as setas de vidro na tela (util no celular). */
  geral: { direcional: true, pausarFora: true },
  '2048': { tamanho: 4, meta: 2048 },
  snake: { velocidade: 'normal', grade: 'media', paredes: 'morte' },
  campo: { dificuldade: 'facil', largura: 9, altura: 9, minas: 10 },
  breakout: { vidas: 5, velocidade: 'normal', fileiras: 5 },
  recordes: {},
};

/** Campo minado guarda MENOR tempo; todos os outros guardam MAIOR pontuacao. */
const MAIOR_MELHOR = { '2048': true, snake: true, breakout: true, pokemon: true, campo: false };

const inteiro = (valor, [min, max], padrao) => {
  const numero = Math.round(Number(valor));
  if (!Number.isFinite(numero)) return padrao;
  return Math.min(max, Math.max(min, numero));
};

const escolha = (valor, lista, padrao) => (lista.includes(valor) ? valor : padrao);

/** Numeros do campo minado: cada dificuldade manda nos seus proprios limites. */
const normalizarCampo = (bruto = {}) => {
  const dificuldade = escolha(bruto.dificuldade, DIFICULDADES, 'facil');
  if (dificuldade !== 'personalizado') {
    return { ...CAMPO_PRESETS[dificuldade], dificuldade };
  }
  const largura = inteiro(bruto.largura, LIMITES.campoLargura, CAMPO_PRESETS.facil.largura);
  const altura = inteiro(bruto.altura, LIMITES.campoAltura, CAMPO_PRESETS.facil.altura);
  /* Deixa sempre pelo menos 9 casas livres: sem isso o primeiro clique seguro
     e a contagem de minas nao fecham. */
  const minas = inteiro(bruto.minas, [1, Math.max(1, largura * altura - 9)], CAMPO_PRESETS.facil.minas);
  return { dificuldade, largura, altura, minas };
};

/** Recordes: numero finito e nao negativo, no maximo 200 chaves (defesa). */
const normalizarRecordes = (bruto) => {
  if (!bruto || typeof bruto !== 'object') return {};
  return Object.fromEntries(
    Object.entries(bruto)
      .filter(([, valor]) => Number.isFinite(Number(valor)) && Number(valor) >= 0)
      .slice(0, 200)
      .map(([chave, valor]) => [String(chave).slice(0, 60), Math.round(Number(valor))])
  );
};

/**
 * Recebe o que veio do banco (ou nada) e devolve uma configuracao completa,
 * com todo valor fora da regua voltando para o padrao. Nunca lanca.
 */
export const normalizarJogos = (bruto) => {
  const base = bruto && typeof bruto === 'object' ? bruto : {};
  const geral = base.geral || {};
  const j2048 = base['2048'] || {};
  const snake = base.snake || {};
  const breakout = base.breakout || {};

  return {
    versao: VERSAO_JOGOS,
    geral: {
      direcional:
        typeof geral.direcional === 'boolean' ? geral.direcional : JOGOS_PADRAO.geral.direcional,
      pausarFora:
        typeof geral.pausarFora === 'boolean' ? geral.pausarFora : JOGOS_PADRAO.geral.pausarFora,
    },
    '2048': {
      tamanho: inteiro(j2048.tamanho, LIMITES.tamanho2048, JOGOS_PADRAO['2048'].tamanho),
      meta: inteiro(j2048.meta, LIMITES.meta2048, JOGOS_PADRAO['2048'].meta),
    },
    snake: {
      velocidade: escolha(snake.velocidade, VELOCIDADES, JOGOS_PADRAO.snake.velocidade),
      grade: escolha(snake.grade, GRADES, JOGOS_PADRAO.snake.grade),
      paredes: escolha(snake.paredes, PAREDES, JOGOS_PADRAO.snake.paredes),
    },
    campo: normalizarCampo(base.campo),
    breakout: {
      vidas: inteiro(breakout.vidas, LIMITES.vidasBreakout, JOGOS_PADRAO.breakout.vidas),
      velocidade: escolha(breakout.velocidade, VELOCIDADES, JOGOS_PADRAO.breakout.velocidade),
      fileiras: inteiro(breakout.fileiras, LIMITES.fileirasBreakout, JOGOS_PADRAO.breakout.fileiras),
    },
    recordes: normalizarRecordes(base.recordes),
  };
};

/* ------------------------------ recordes ------------------------------ */

/** Chave do recorde: as regras que mudam o jogo entram nela. */
export const chaveRecorde = (jogo, config = JOGOS_PADRAO) => {
  const c = config || JOGOS_PADRAO;
  switch (jogo) {
    case '2048':
      return `2048:${c['2048']?.tamanho || 4}`;
    case 'snake':
      return `snake:${c.snake?.grade || 'media'}:${c.snake?.velocidade || 'normal'}:${
        c.snake?.paredes || 'morte'
      }`;
    case 'campo': {
      const campo = c.campo || {};
      if (campo.dificuldade === 'personalizado') {
        return `campo:custom:${campo.largura}x${campo.altura}x${campo.minas}`;
      }
      return `campo:${campo.dificuldade || 'facil'}`;
    }
    case 'breakout':
      return `breakout:${c.breakout?.fileiras || 5}:${c.breakout?.velocidade || 'normal'}:${
        c.breakout?.vidas || 5
      }`;
    case 'pokemon':
      return 'pokemon';
    default:
      return jogo;
  }
};

/** O melhor entre dois valores, respeitando se o jogo premia tempo ou pontos. */
export const melhorValor = (jogo, anterior, novo) => {
  const a = Number(anterior);
  const b = Number(novo);
  if (!Number.isFinite(b) || b < 0) return anterior;
  if (!Number.isFinite(a)) return Math.round(b);
  return MAIOR_MELHOR[jogo] === false ? Math.min(a, Math.round(b)) : Math.max(a, Math.round(b));
};

export const recordeDaConfig = (jogo, config = JOGOS_PADRAO) => {
  const valor = config?.recordes?.[chaveRecorde(jogo, config)];
  return Number.isFinite(valor) ? valor : null;
};

/**
 * Devolve uma configuracao nova com o recorde atualizado.
 * Se o valor nao bate o que ja existe, devolve o MESMO objeto: quem chama usa
 * a identidade para nao gravar a toa no banco.
 */
export const gravarRecorde = (config, jogo, valor) => {
  const atual = config || JOGOS_PADRAO;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return atual;

  const chave = chaveRecorde(jogo, atual);
  const anterior = atual.recordes?.[chave];
  const melhor = melhorValor(jogo, anterior, numero);
  if (melhor === anterior) return atual;

  return { ...atual, recordes: { ...(atual.recordes || {}), [chave]: melhor } };
};

export const apagarRecordes = (config) => ({ ...normalizarJogos(config), recordes: {} });

/* --------------------------- ponte com o banco --------------------------- */

/** Le a string gravada no User. Campo vazio ou lixo cai no padrao. */
export const lerJogos = (texto) => {
  if (!texto) return undefined;
  if (typeof texto === 'object') return normalizarJogos(texto);
  try {
    return normalizarJogos(JSON.parse(texto));
  } catch {
    return undefined;
  }
};

export const escreverJogos = (config) => {
  try {
    return JSON.stringify(normalizarJogos(config));
  } catch {
    return '';
  }
};

/**
 * Junta o que esta no aparelho com o que esta na conta.
 *
 * As regras do banco mandam (e a conta falando mais alto, e a pessoa acabou de
 * mexer nelas em algum lugar). Ja os recordes sao o melhor dos dois lados: um
 * aparelho velho nao pode apagar o recorde feito no outro.
 */
export const mesclarJogos = (local, remoto) => {
  const doLocal = normalizarJogos(local);
  if (!remoto) return doLocal;

  const doBanco = normalizarJogos(remoto);
  const recordes = { ...doLocal.recordes };
  Object.entries(doBanco.recordes).forEach(([chave, valor]) => {
    const anterior = recordes[chave];
    const tempo = chave.startsWith('campo:');
    recordes[chave] = Number.isFinite(anterior)
      ? tempo
        ? Math.min(anterior, valor)
        : Math.max(anterior, valor)
      : valor;
  });

  return { ...doBanco, recordes };
};
