/**
 * Notificação do navegador (aquela que aparece no canto do sistema, fora da
 * aba). Vem desligada: só passa a acontecer depois que a pessoa liga nas
 * configurações do chat E autoriza no navegador.
 *
 * A escolha fica espelhada em localStorage porque o aviso de mensagem nova
 * chega no tempo real do chat, longe do painel de configurações.
 */

export const CHAVE_NAVEGADOR = 'lynx:notificar-navegador';

export const navegadorSuportado = () =>
  typeof window !== 'undefined' && typeof window.Notification !== 'undefined';

export const permissaoDoNavegador = () => {
  if (!navegadorSuportado()) return 'indisponivel';
  return window.Notification.permission;
};

export const serviceWorkerSuportado = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

/**
 * Situação do service worker, para a tela de configurações poder dizer a
 * verdade em vez de fingir que o aviso está ligado.
 *   'inicial' | 'ok' | 'erro' | 'sem-suporte'
 */
let estadoWorker = { situacao: serviceWorkerSuportado() ? 'inicial' : 'sem-suporte', mensagem: '' };
const ouvintesWorker = new Set();

export const lerEstadoServiceWorker = () => estadoWorker;

export const ouvirEstadoServiceWorker = (ouvinte) => {
  ouvintesWorker.add(ouvinte);
  return () => ouvintesWorker.delete(ouvinte);
};

const definirEstadoWorker = (situacao, mensagem = '') => {
  estadoWorker = { situacao, mensagem };
  ouvintesWorker.forEach((ouvinte) => {
    try {
      ouvinte(estadoWorker);
    } catch (erro) {
      // ouvinte quebrado não derruba o resto
    }
  });
};

/**
 * Onde a pessoa está. É o que explica a maioria dos casos em que o pedido de
 * permissão "não aparece": no iPhone fora da Tela de Início a Apple não deixa
 * perguntar, e dentro do navegador de outro app (Instagram, WhatsApp) quase
 * todo navegador bloqueia a permissão sem avisar.
 */
export const ambienteDoNavegador = () => {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const instalado =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches === true ||
      navigator.standalone === true);
  const dentroDeApp = /(Instagram|FBAN|FBAV|FB_IAB|Messenger|WhatsApp|LinkedIn|Twitter|TikTok|Line\/)/i.test(
    ua
  );
  const navegador = /Edg\//.test(ua)
    ? 'Edge'
    : /SamsungBrowser/.test(ua)
      ? 'Samsung Internet'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'outro';
  return {
    ios,
    android,
    instalado,
    dentroDeApp,
    navegador,
    sistema: ios ? 'iPhone/iPad' : android ? 'Android' : 'computador',
  };
};

/** Linha curta para a tela de configurações mostrar o que está acontecendo. */
export const resumoDoAmbiente = () => {
  const ambiente = ambienteDoNavegador();
  const partes = [`${ambiente.sistema} · ${ambiente.navegador}`];
  if (ambiente.ios && !ambiente.instalado) partes.push('fora da Tela de Início');
  if (ambiente.dentroDeApp) partes.push('dentro de outro app');
  partes.push(`permissão: ${permissaoDoNavegador()}`);
  partes.push(`worker: ${estadoWorker.situacao}`);
  return partes.join(' · ');
};

const explicarFalha = (erro) => {
  const nome = erro?.name || '';
  const texto = String(erro?.message || erro || '');
  if (nome === 'SecurityError' || /mime|content type/i.test(texto)) {
    return 'o servidor entregou o arquivo do worker com o tipo errado';
  }
  if (/401|403|unauthor/i.test(texto)) return 'o servidor pediu login para entregar o worker';
  return texto || 'erro desconhecido';
};

/** Guarda a ação de cada notificação mostrada, para o clique do sistema achar. */
const cliques = new Map();
let ponteLigada = false;
let registroPromessa = null;

/**
 * Registra o service worker uma vez só. Sem ele, no celular nada aparece: o
 * Android simplesmente ignora `new Notification()`.
 */
export const registrarServiceWorker = () => {
  if (!serviceWorkerSuportado()) return Promise.resolve(null);
  if (registroPromessa) return registroPromessa;
  registroPromessa = (async () => {
    try {
      const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      definirEstadoWorker('ok');
      return registro;
    } catch (erro) {
      console.warn('[navegador] service worker', erro?.message || erro);
      definirEstadoWorker('erro', explicarFalha(erro));
      /* Outra tentativa depois de um tempo: no primeiro carregamento a sessão
         pode ainda não estar pronta para o servidor entregar o arquivo. */
      registroPromessa = null;
      return null;
    }
  })();
  return registroPromessa;
};

/** O registro pronto para mostrar notificação (espera o worker ativar). */
const registroPronto = async () => {
  if (!serviceWorkerSuportado()) return null;
  const registro = await registrarServiceWorker();
  if (!registro) return null;
  if (registro.active) return registro;
  try {
    const tempo = new Promise((resolver) => setTimeout(() => resolver(null), 3000));
    const pronto = await Promise.race([navigator.serviceWorker.ready, tempo]);
    return pronto || registro;
  } catch (erro) {
    return registro;
  }
};

/** Clique na notificação do sistema volta para a ação que a criou. */
const ligarPonte = () => {
  if (ponteLigada || !serviceWorkerSuportado()) return;
  navigator.serviceWorker.addEventListener('message', (evento) => {
    const dados = evento?.data;
    if (dados?.tipo !== 'lynx-notificacao-clique') return;
    const acao = cliques.get(dados.tag);
    if (typeof acao === 'function') {
      try {
        acao();
      } catch (erro) {
        console.warn('[navegador] clique', erro?.message || erro);
      }
    }
  });
  ponteLigada = true;
};

export const navegadorLigado = () => {
  try {
    return window.localStorage.getItem(CHAVE_NAVEGADOR) === '1';
  } catch (erro) {
    return false;
  }
};

export const lembrarNavegadorLigado = (ligado) => {
  try {
    window.localStorage.setItem(CHAVE_NAVEGADOR, ligado ? '1' : '0');
  } catch (erro) {
    // sem storage: vale só nesta aba
  }
};

/** Pede a permissão do navegador. Devolve true só se ficou autorizado. */
export const pedirPermissaoDoNavegador = async () => {
  if (!navegadorSuportado()) return false;
  if (window.Notification.permission === 'granted') {
    registrarServiceWorker();
    return true;
  }
  if (window.Notification.permission === 'denied') return false;
  try {
    /* O pedido sai na mesma respiração do clique: se houver qualquer espera
       antes, o Safari e alguns navegadores de celular ignoram a pergunta. */
    const resposta = await window.Notification.requestPermission();
    registrarServiceWorker();
    return resposta === 'granted';
  } catch (erro) {
    console.warn('[navegador] permissão', erro?.message || erro);
    return false;
  }
};

/**
 * Mostra a notificação do sistema, se a pessoa ligou e autorizou.
 * `aoClicar` recebe o clique para abrir a conversa.
 */
export const mostrarNotificacaoNavegador = async ({ titulo, corpo, tag, aoClicar, forcar = false }) => {
  if (!navegadorLigado()) return { ok: false, motivo: 'o aviso do navegador está desligado' };
  if (!navegadorSuportado()) return { ok: false, motivo: 'este navegador não tem notificação de sistema' };
  if (window.Notification.permission !== 'granted') {
    return { ok: false, motivo: 'a permissão do navegador não está liberada' };
  }
  // Aba na frente: o aviso do sistema só atrapalharia (o teste é exceção).
  if (
    !forcar &&
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible' &&
    document.hasFocus()
  ) {
    return { ok: false, motivo: 'a aba está na frente' };
  }

  const chave = tag || 'lynx-chat';
  if (typeof aoClicar === 'function') {
    cliques.set(chave, aoClicar);
    ligarPonte();
  }

  /* Caminho do celular (e o preferido no computador): quem mostra é o service
     worker, então a notificação continua aparecendo com o app atrás. */
  const registro = await registroPronto();
  if (registro?.showNotification) {
    try {
      await registro.showNotification(titulo, {
        body: corpo,
        tag: chave,
        data: { tag: chave, url: typeof location !== 'undefined' ? location.href : '/' },
      });
      return { ok: true, motivo: '' };
    } catch (erro) {
      console.warn('[navegador] notificação pelo service worker', erro?.message || erro);
    }
  }

  /* Último recurso: a notificação da página, que é o que o computador sempre usou. */
  try {
    const aviso = new window.Notification(titulo, {
      body: corpo,
      tag: chave,
      silent: false,
    });
    aviso.onclick = () => {
      try {
        window.focus();
        aoClicar?.();
      } catch (erro) {
        // sem janela para focar
      }
      aviso.close();
    };
    setTimeout(() => {
      try {
        aviso.close();
      } catch (erro) {
        // já fechada
      }
    }, 8000);
    return { ok: true, motivo: '' };
  } catch (erro) {
    console.warn('[navegador] notificação', erro?.message || erro);
    return { ok: false, motivo: `o navegador barrou a notificação (${explicarFalha(erro)})` };
  }
};
