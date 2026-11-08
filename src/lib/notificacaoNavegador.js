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
      return registro;
    } catch (erro) {
      console.warn('[navegador] service worker', erro?.message || erro);
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
  /* O pedido é o momento certo de preparar o service worker: nasce de um
     clique, então vale em qualquer navegador. */
  registrarServiceWorker();
  if (window.Notification.permission === 'granted') return true;
  if (window.Notification.permission === 'denied') return false;
  try {
    const resposta = await window.Notification.requestPermission();
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
export const mostrarNotificacaoNavegador = async ({ titulo, corpo, tag, aoClicar }) => {
  if (!navegadorLigado()) return null;
  if (!navegadorSuportado() || window.Notification.permission !== 'granted') return null;
  // Aba na frente: o aviso do sistema só atrapalharia.
  if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
    return null;
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
      return registro;
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
    return aviso;
  } catch (erro) {
    console.warn('[navegador] notificação', erro?.message || erro);
    return null;
  }
};
