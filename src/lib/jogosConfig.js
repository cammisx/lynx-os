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

import { PASSOS_COM_FRASE } from './sextingTextos.js';
import { TONS_PELE } from './solicitacaoMidia.js';

/* Versao do formato: se um dia mudar a regua dos recordes, subir aqui deixa
   claro que o valor antigo pode nao valer mais. */
export const VERSAO_JOGOS = 1;

export const JOGOS = ['2048', 'snake', 'campo', 'pokemon'];

/** Jogos que sairam do ar: os recordes antigos desses nao valem mais nada. */
const JOGOS_APOSENTADOS = ['breakout'];

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
  campoLargura: [5, 30],
  campoAltura: [5, 20],
};

export const JOGOS_PADRAO = {
  versao: VERSAO_JOGOS,
  /* `direcional`: mostra as setas de vidro na tela (util no celular). */
  geral: { direcional: true, pausarFora: true },
  '2048': { tamanho: 4, partidas: {}, vistos: [] },
  snake: { velocidade: 'normal', grade: 'media', paredes: 'morte', pele: 'morena', pelos: false },
  campo: { dificuldade: 'facil', largura: 9, altura: 9, minas: 10 },
  recordes: {},
};

/** Campo minado guarda MENOR tempo; todos os outros guardam MAIOR pontuacao. */
const MAIOR_MELHOR = { '2048': true, snake: true, pokemon: true, campo: false };

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
  const aposentado = (chave) => JOGOS_APOSENTADOS.some((jogo) => String(chave).startsWith(`${jogo}:`) || chave === jogo);
  return Object.fromEntries(
    Object.entries(bruto)
      .filter(([chave]) => !aposentado(chave))
      .filter(([, valor]) => Number.isFinite(Number(valor)) && Number(valor) >= 0)
      .slice(0, 200)
      .map(([chave, valor]) => [String(chave).slice(0, 60), Math.round(Number(valor))])
  );
};

/* ------------------------- partidas em andamento ------------------------- */

/**
 * Uma partida salva do 2048: o tabuleiro inteiro, os pontos e quando foi
 * mexida pela ultima vez. Só entra o que bate com o tamanho da grade e com
 * numeros que o jogo sabe desenhar; qualquer outra coisa e descartada.
 */
const POTENCIA_DE_DOIS = (valor) => valor === 0 || (valor > 0 && (valor & (valor - 1)) === 0);

const normalizarPartida = (bruto, tamanho) => {
  const celulas = Array.isArray(bruto?.celulas) ? bruto.celulas.map(Number) : null;
  if (!celulas || celulas.length !== tamanho * tamanho) return null;
  if (celulas.some((valor) => !Number.isFinite(valor) || valor < 0 || !POTENCIA_DE_DOIS(valor))) {
    return null;
  }
  const pontos = Number(bruto?.pontos);
  if (!Number.isFinite(pontos) || pontos < 0) return null;
  const atualizado = Number(bruto?.atualizado);
  return {
    celulas,
    pontos: Math.round(pontos),
    atualizado: Number.isFinite(atualizado) ? Math.round(atualizado) : 0,
  };
};

/** Chave de cada partida: o tamanho do tabuleiro (4x4 nao apaga o 6x6). */
const normalizarPartidas = (bruto) => {
  if (!bruto || typeof bruto !== 'object') return {};
  const saida = {};
  Object.entries(bruto)
    .slice(0, 8)
    .forEach(([chave, valor]) => {
      const tamanho = Math.round(Number(chave));
      if (!Number.isFinite(tamanho) || tamanho < LIMITES.tamanho2048[0] || tamanho > LIMITES.tamanho2048[1]) {
        return;
      }
      const partida = normalizarPartida(valor, tamanho);
      if (partida) saida[String(tamanho)] = partida;
    });
  return saida;
};

/**
 * Passos do SEXTING que ja mandaram recado. Fica na conta (nao no aparelho):
 * a fala aparece so na primeira vez, mesmo depois de fechar o jogo ou trocar
 * de celular. Restaurar as configuracoes limpa a lista.
 */
const normalizarVistos = (bruto) => {
  if (!Array.isArray(bruto)) return [];
  const limpos = bruto
    .map((valor) => Math.round(Number(valor)))
    .filter((valor) => PASSOS_COM_FRASE.includes(valor));
  return [...new Set(limpos)];
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
      partidas: normalizarPartidas(j2048.partidas),
      vistos: normalizarVistos(j2048.vistos),
    },
    snake: {
      velocidade: escolha(snake.velocidade, VELOCIDADES, JOGOS_PADRAO.snake.velocidade),
      grade: escolha(snake.grade, GRADES, JOGOS_PADRAO.snake.grade),
      paredes: escolha(snake.paredes, PAREDES, JOGOS_PADRAO.snake.paredes),
      /* Pele e pelos sao so visual: nao entram na chave do recorde. */
      pele: escolha(snake.pele, TONS_PELE, JOGOS_PADRAO.snake.pele),
      pelos: typeof snake.pelos === 'boolean' ? snake.pelos : JOGOS_PADRAO.snake.pelos,
    },
    campo: normalizarCampo(base.campo),
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

/* -------------------------- partidas em andamento -------------------------- */

/** A partida salva de um jogo no tamanho em uso, ou null se nao houver. */
export const partidaDoJogo = (config, jogo, tamanho) => {
  if (jogo !== '2048') return null;
  const salva = (config || JOGOS_PADRAO)['2048']?.partidas?.[String(tamanho)];
  return salva || null;
};

/**
 * Grava (ou apaga, com `partida` nulo) o tabuleiro em andamento.
 * Devolve o MESMO objeto quando nada mudou, para quem chama nao escrever no
 * banco a toa.
 */
export const gravarPartida = (config, jogo, tamanho, partida) => {
  if (jogo !== '2048') return config;
  const atual = normalizarJogos(config);
  const chave = String(tamanho);
  const partidas = { ...(atual['2048']?.partidas || {}) };

  if (!partida) {
    if (!partidas[chave]) return config;
    delete partidas[chave];
  } else {
    const limpa = normalizarPartida(partida, tamanho);
    if (!limpa) return config;
    if (JSON.stringify(partidas[chave] || null) === JSON.stringify(limpa)) return config;
    partidas[chave] = limpa;
  }

  return normalizarJogos({ ...atual, '2048': { ...atual['2048'], partidas } });
};

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

  /* Partidas em andamento: vale a que foi mexida por ultimo (empate fica com
     a de mais pontos). Assim abrir no celular continua de onde parou no PC. */
  const partidas = { ...(doBanco['2048']?.partidas || {}) };
  Object.entries(doLocal['2048']?.partidas || {}).forEach(([chave, partida]) => {
    const outra = partidas[chave];
    const maisNova =
      !outra ||
      partida.atualizado > outra.atualizado ||
      (partida.atualizado === outra.atualizado && partida.pontos > outra.pontos);
    if (maisNova) partidas[chave] = partida;
  });

  /* Recados ja vistos: a uniao dos dois lados. Uma fala que apareceu no PC
     nao volta a aparecer no celular. */
  const vistos = [...new Set([...(doBanco['2048']?.vistos || []), ...(doLocal['2048']?.vistos || [])])];

  return {
    ...doBanco,
    '2048': { ...doBanco['2048'], partidas, vistos },
    recordes,
  };
};
