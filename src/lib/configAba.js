/**
 * Qual aba a janela de Configurações deve abrir.
 *
 * Existe porque o atalho "Preferências" pode chegar antes de a janela montar
 * (quando ela ainda está fechada): aí o pedido fica guardado aqui e a janela
 * consome ao nascer.
 */
let abaPedida = null;

export const pedirAbaConfig = (aba) => {
  abaPedida = aba || null;
};

export const consumirAbaConfig = () => {
  const aba = abaPedida;
  abaPedida = null;
  return aba;
};

export const AVISO_ABA_CONFIG = 'lynx:config-aba';

/**
 * Como abrir a janela de Configurações, registrado por quem manda nas janelas
 * (o dashboard no computador, a casca no celular). Assim qualquer canto do
 * sistema pede uma aba sem conhecer o gerenciador de janelas.
 */
let abridor = null;

export const registrarAbridorConfig = (fn) => {
  abridor = typeof fn === 'function' ? fn : null;
  return () => {
    if (abridor === fn) abridor = null;
  };
};

/** Pede a aba, avisa a janela que já está aberta e manda abrir/focar. */
export const abrirConfigNaAba = (aba) => {
  pedirAbaConfig(aba);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AVISO_ABA_CONFIG, { detail: aba || null }));
  }
  abridor?.(aba);
};
