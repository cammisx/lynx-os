/**
 * Sons de notificação disponíveis no shell.
 * Arquivos em /public/sons (créditos e licenças em public/sons/CREDITOS.md).
 */
export const SONS = [
  {
    id: 'suave',
    nome: 'POP',
    arquivo: '/sons/notificacao-suave.mp3',
    licenca: 'CC0',
  },
  {
    id: 'alerta',
    nome: 'SAMURAI',
    arquivo: '/sons/alerta-concluido.mp3',
    licenca: 'CC BY 4.0 · Headphaze',
  },
  {
    id: 'scifi',
    nome: 'ALIEN',
    arquivo: '/sons/sci-fi-mensagem.mp3',
    licenca: 'CC BY 4.0 · F.M.Audio',
  },
  {
    id: 'mensagem',
    nome: 'ZAP',
    arquivo: '/sons/olha-a-mensagem.mp3',
    licenca: 'Sem licença declarada',
  },
];

export const SOM_PADRAO = 'suave';

export const somPorId = (id) => SONS.find((som) => som.id === id) || null;

const cache = new Map();

/** Só um som toca por vez: o anterior é cortado quando outro começa. */
let tocando = null;

const elemento = (som) => {
  if (!som) return null;
  if (!cache.has(som.id)) {
    const audio = new Audio(som.arquivo);
    audio.preload = 'auto';
    cache.set(som.id, audio);
  }
  return cache.get(som.id);
};

/** Pré-carrega os arquivos para o primeiro aviso não atrasar. */
export const preaquecerSons = () => {
  SONS.forEach((som) => elemento(som));
};

const parar = (audio) => {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (error) {
    // elemento sem metadata ainda: nada a fazer
  }
};

/** Toca o som escolhido. Volume em 0..1. */
export const tocarSom = (id, volume = 0.6) => {
  const som = somPorId(id);
  if (!som) return;
  const audio = elemento(som);
  if (!audio) return;

  if (tocando && tocando !== audio) parar(tocando);
  tocando = audio;

  try {
    audio.volume = Math.min(1, Math.max(0, volume));
    if (audio.currentTime > 0) audio.currentTime = 0;
    console.debug('[Som] tocou', som.id, new Date().toISOString());
    const promessa = audio.play();
    if (promessa?.catch) promessa.catch(() => {});
  } catch (error) {
    console.warn('[Som] não consegui tocar', error);
  }
};

/**
 * Preferência em memória, sincronizada pelo hook usePreferenciaSom.
 * Fica aqui para qualquer parte do shell tocar o som sem precisar de contexto.
 */
let preferencia = { som: SOM_PADRAO, ativo: true, volume: 0.6 };

export const definirPreferenciaSom = (dados = {}) => {
  preferencia = { ...preferencia, ...dados };
};

export const lerPreferenciaSom = () => preferencia;

/**
 * O shell tem mais de uma tela lendo notificações (barra de tarefas e widgets),
 * então o controle de "já avisei" fica aqui, compartilhado, e não em cada hook.
 */
const avisadas = new Set();
let avisosIniciados = false;
let ultimoToque = 0;

const INTERVALO_MINIMO = 2500;

/** Marca os ids como conhecidos e diz se algum deles é novidade de verdade. */
export const avaliarNotificacoesNovas = (ids = []) => {
  const lista = ids.filter(Boolean);
  const novos = lista.filter((id) => !avisadas.has(id));
  lista.forEach((id) => avisadas.add(id));

  if (!avisosIniciados) {
    avisosIniciados = true;
    return false;
  }
  return novos.length > 0;
};

/** Toca o som escolhido pelo usuário, respeitando o desligar e o volume. */
export const tocarNotificacao = () => {
  if (!preferencia.ativo) return;
  const agora = Date.now();
  if (agora - ultimoToque < INTERVALO_MINIMO) return;
  ultimoToque = agora;
  tocarSom(preferencia.som, preferencia.volume);
};
