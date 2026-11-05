/**
 * Sons de notificação disponíveis no shell.
 * Arquivos em /public/sons (créditos e licenças em public/sons/CREDITOS.md).
 */
export const SONS = [
  {
    id: 'suave',
    nome: 'Toque suave',
    arquivo: '/sons/notificacao-suave.mp3',
    descricao: 'Pop curto de mensagem, bem discreto.',
    licenca: 'CC0',
  },
  {
    id: 'alerta',
    nome: 'Alerta de status',
    arquivo: '/sons/alerta-concluido.mp3',
    descricao: 'Sino sintetizado com um whoosh curto.',
    licenca: 'CC BY 4.0 · Headphaze',
  },
  {
    id: 'scifi',
    nome: 'Mensagem sci-fi',
    arquivo: '/sons/sci-fi-mensagem.mp3',
    descricao: 'Bipe de interface futurista.',
    licenca: 'CC BY 4.0 · F.M.Audio',
  },
  {
    id: 'mensagem',
    nome: 'Olha a mensagem',
    arquivo: '/sons/olha-a-mensagem.mp3',
    descricao: 'A voz do meme, pra quem gosta de susto.',
    licenca: 'Sem licença declarada',
  },
];

export const SOM_PADRAO = 'suave';

export const somPorId = (id) => SONS.find((som) => som.id === id) || null;

const cache = new Map();

const elemento = (som) => {
  if (!som) return null;
  if (!cache.has(som.id)) {
    const audio = new Audio(som.arquivo);
    audio.preload = 'auto';
    cache.set(som.id, audio);
  }
  return cache.get(som.id);
};

/** Toca o som escolhido. Volume em 0..1. */
export const tocarSom = (id, volume = 0.6) => {
  const som = somPorId(id);
  if (!som) return;
  const audio = elemento(som);
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = Math.min(1, Math.max(0, volume));
    const promessa = audio.play();
    if (promessa?.catch) promessa.catch(() => {});
  } catch (error) {
    console.warn('[Som] não consegui tocar', error);
  }
};

/** Pré-carrega os arquivos para o primeiro aviso não atrasar. */
export const preaquecerSons = () => {
  SONS.forEach((som) => elemento(som));
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

/** Toca o som escolhido pelo usuário, respeitando o desligar e o volume. */
export const tocarNotificacao = () => {
  if (!preferencia.ativo) return;
  tocarSom(preferencia.som, preferencia.volume);
};
