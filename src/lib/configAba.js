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
