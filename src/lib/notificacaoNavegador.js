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
export const mostrarNotificacaoNavegador = ({ titulo, corpo, tag, aoClicar }) => {
  if (!navegadorLigado()) return null;
  if (!navegadorSuportado() || window.Notification.permission !== 'granted') return null;
  // Aba na frente: o aviso do sistema só atrapalharia.
  if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
    return null;
  }

  try {
    const aviso = new window.Notification(titulo, {
      body: corpo,
      tag: tag || 'lynx-chat',
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
