import { paraData } from '@/lib/chat';

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
    /* Nunca em loop: um áudio que se repete sozinho vira barulho sem fim. */
    audio.loop = false;
    audio.addEventListener('ended', () => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (erro) {
        // elemento ainda sem metadata
      }
      if (tocando === audio) tocando = null;
    });
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

/* Freio de segurança: nenhum som toca mais de N vezes por minuto, aconteça o
   que acontecer na origem do aviso. */
const toques = [];
const LIMITE_TOQUES = 6;
const JANELA_TOQUES = 60000;

/** Toca o som escolhido. Volume em 0..1. */
export const tocarSom = (id, volume = 0.6) => {
  const som = somPorId(id);
  if (!som) return;
  const audio = elemento(som);
  if (!audio) return;

  /* O mesmo som ainda em reprodução não é reiniciado: empilhar play() no
     mesmo elemento é o que fazia o ZAP parecer que repetia sem parar. */
  const tocandoAgora = !audio.paused && !audio.ended && audio.currentTime > 0.05;
  if (tocando === audio && tocandoAgora) return;

  const agoraMs = Date.now();
  while (toques.length && agoraMs - toques[0] > JANELA_TOQUES) toques.shift();
  if (toques.length >= LIMITE_TOQUES) {
    console.warn('[Som] muitos avisos seguidos, segurando o som por ora');
    return;
  }
  toques.push(agoraMs);

  if (tocando && tocando !== audio) parar(tocando);
  tocando = audio;

  try {
    audio.volume = Math.min(1, Math.max(0, volume));
    if (audio.currentTime > 0) audio.currentTime = 0;
    console.debug('[Som] tocou', som.id, new Date().toISOString());
    const promessa = audio.play();
    if (promessa?.catch) {
      promessa.catch((erro) => console.warn('[Som] navegador barrou o áudio:', erro?.name));
    }
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

/**
 * O carimbo do banco vem em UTC sem fuso; lido direto, ficava 3h no futuro em
 * São Paulo e toda pendência antiga parecia nova. Timestamp muito à frente do
 * relógio local também é ignorado, para não depender de relógio sincronizado.
 */
const chegouDepoisDe = (carimbo, desde) => {
  if (!carimbo) return false;
  const quando = paraData(carimbo).getTime();
  if (!Number.isFinite(quando)) return false;
  if (quando > Date.now() + 60000) return false;
  return quando > desde;
};

/** Marca os ids como conhecidos e diz se algum deles é novidade de verdade. */
/**
 * Só avisa de notificação que nasceu depois de a página abrir. Antes disso o
 * sino voltava a soar a cada recarregamento por causa das pendências antigas.
 */
export const avaliarNotificacoesNovas = (itens = [], desde = 0) => {
  const lista = (itens || [])
    .map((item) => (typeof item === 'string' ? { id: item } : item))
    .filter((item) => item?.id);
  const novos = lista.filter((item) => !avisadas.has(item.id));
  lista.forEach((item) => avisadas.add(item.id));

  if (!avisosIniciados) {
    avisosIniciados = true;
    return false;
  }

  return novos.some((item) => chegouDepoisDe(item.created_date, desde));
};

/** Toca o som escolhido pelo usuário, respeitando o desligar e o volume. */
export const tocarNotificacao = () => {
  if (!preferencia.ativo) return;
  const agora = Date.now();
  if (agora - ultimoToque < INTERVALO_MINIMO) return;
  ultimoToque = agora;
  tocarSom(preferencia.som, preferencia.volume);
};

/* ------------------------------------------------------------------ */
/* Som de mensagem do chat (independente do som de notificação)        */
/* ------------------------------------------------------------------ */

let preferenciaChat = { som: 'mensagem', ativo: true, volume: 0.6 };

export const definirPreferenciaSomChat = (dados = {}) => {
  preferenciaChat = { ...preferenciaChat, ...dados };
};

export const lerPreferenciaSomChat = () => preferenciaChat;

/**
 * Onde a pessoa está olhando: null (painel fechado), 'lista' (lista de
 * conversas) ou o id do canal aberto. Se ela já está no canal, a mensagem
 * não precisa de som.
 */
let focoDoChat = null;
export const definirFocoDoChat = (valor) => {
  focoDoChat = valor || null;
};

export const lerFocoDoChat = () => focoDoChat;

const vistas = new Set();
let vistasIniciadas = false;
let ultimoToqueChat = 0;
const INTERVALO_MINIMO_CHAT = 2400;

/**
 * Compara a lista de mensagens com o que já foi visto e devolve a mensagem
 * mais recente que chegou agora, de outra pessoa, ou null.
 *
 * `desde` é o instante em que a página abriu: o histórico carregado depois
 * disso é antigo e não pode soar. Sem esse corte, cada recarregamento tocava o
 * som para as mensagens que já estavam lá.
 */
export const avaliarMensagensChat = (mensagens = [], euId, desde = 0) => {
  const lista = (mensagens || []).filter((mensagem) => mensagem?.id);
  const novas = lista.filter((mensagem) => !vistas.has(mensagem.id));
  lista.forEach((mensagem) => vistas.add(mensagem.id));

  const chegouAgora = (mensagem) => chegouDepoisDe(mensagem.created_date, desde);

  if (!vistasIniciadas) {
    vistasIniciadas = true;
    return null;
  }

  const deOutros = novas.filter(
    (mensagem) =>
      mensagem.autor_id &&
      mensagem.autor_id !== euId &&
      !mensagem.apagada &&
      chegouAgora(mensagem)
  );
  return deOutros.length ? deOutros[deOutros.length - 1] : null;
};

export const tocarSomChat = () => {
  if (!preferenciaChat.ativo) return;
  const agoraMs = Date.now();
  if (agoraMs - ultimoToqueChat < INTERVALO_MINIMO_CHAT) return;
  ultimoToqueChat = agoraMs;
  tocarSom(preferenciaChat.som, preferenciaChat.volume);
};

export const mensagemEmFoco = (canalId) => focoDoChat !== null && focoDoChat === canalId;
