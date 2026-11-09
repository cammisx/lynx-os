/**
 * Abrir e fechar o menu de clique direito por código, para quem precisa
 * mostrar o menu em vez de esperar o clique (o tutorial da Pixie faz isso).
 *
 * O que o menu mostra continua sendo decidido pelos coletores de sempre: aqui
 * a gente só dispara o mesmo evento que o botão direito dispara, no elemento
 * onde a pessoa estaria clicando.
 */

const AVISO_FECHAR = 'lynx:fechar-menu-contexto';

/* Um item que deve chamar a atenção ao abrir (usado no tutorial). */
let destaquePedido = null;

export const pedirDestaqueMenu = (id) => {
  destaquePedido = id || null;
};

export const consumirDestaqueMenu = () => {
  const id = destaquePedido;
  destaquePedido = null;
  return id;
};

export const fecharMenuContexto = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AVISO_FECHAR));
};

export const assinarFecharMenu = (fn) => {
  if (typeof window === 'undefined') return () => {};
  const ouvir = () => fn();
  window.addEventListener(AVISO_FECHAR, ouvir);
  return () => window.removeEventListener(AVISO_FECHAR, ouvir);
};

/**
 * Abre o menu de clique direito como se a pessoa tivesse clicado ali. O alvo
 * é o desktop inteiro: os coletores reconhecem a mesa e trazem os atalhos.
 */
export const abrirMenuContextoEm = (x, y) => {
  if (typeof window === 'undefined') return;
  const alvo = document.querySelector('[data-desktop]') || document.body;
  alvo.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: Math.round(x),
      clientY: Math.round(y),
      button: 2,
    })
  );
};
