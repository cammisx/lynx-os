/**
 * Família tipográfica do sistema.
 *
 * Três opções, todas carregadas de uma vez no CSS: Mono (o padrão, cara de
 * terminal), Clássica (Inter, mais neutra) e Redonda (Poppins, mais amigável).
 * A escolha troca as duas variáveis que o app inteiro usa: --font-main (texto
 * de tudo) e --font-display (títulos de janela e de modal).
 *
 * Vale por usuário: fica no User (campo fonte_app) e no localStorage, e o
 * index.html aplica antes do React para não piscar a fonte antiga.
 */
export const FONTES_APP = [
  {
    id: 'mono',
    nome: 'Mono',
    familia: "'Roboto Mono', 'Courier New', monospace",
    familiaDisplay: "'Inter', system-ui, sans-serif",
    dica: 'Cara de terminal, do jeito que sempre foi',
  },
  {
    id: 'classica',
    nome: 'Clássica',
    familia: "'Inter', system-ui, sans-serif",
    familiaDisplay: "'Inter', system-ui, sans-serif",
    dica: 'Neutra e leve, cansa menos em texto comprido',
  },
  {
    id: 'redonda',
    nome: 'Redonda',
    familia: "'Poppins', system-ui, sans-serif",
    familiaDisplay: "'Poppins', system-ui, sans-serif",
    dica: 'Geométrica e amigável, ocupa um pouco mais de largura',
  },
];

export const FONTE_APP_PADRAO = 'mono';

export const CHAVE_FONTE_APP = 'lynx:fonte-app';

export const fonteAppPorId = (id) =>
  FONTES_APP.find((fonte) => fonte.id === id) || FONTES_APP[0];

export const fonteAppValida = (id) => fonteAppPorId(id).id;

/** Escolha guardada no navegador, lida antes do banco responder. */
export const fonteAppDoNavegador = () => {
  try {
    const bruto = window.localStorage.getItem(CHAVE_FONTE_APP);
    return bruto ? fonteAppValida(bruto) : '';
  } catch (erro) {
    return '';
  }
};

export const aplicarFonteApp = (id) => {
  const fonte = fonteAppPorId(id);
  const root = document.documentElement;
  root.setAttribute('data-fonte-app', fonte.id);
  root.style.setProperty('--font-main', fonte.familia);
  root.style.setProperty('--font-display', fonte.familiaDisplay);
  try {
    window.localStorage.setItem(CHAVE_FONTE_APP, fonte.id);
  } catch (erro) {
    // sem storage a escolha vale só nesta sessão
  }
  window.dispatchEvent(new CustomEvent('lynx:fonte-app'));
  return fonte;
};
