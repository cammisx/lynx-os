/**
 * URLs vindas do banco (print de venda, anexo de chat) não são confiáveis:
 * um valor como "javascript:..." ou "data:text/html,..." viraria XSS armazenado
 * ao ser usado em href/src. Só http e https passam.
 */
const PROTOCOLO_PERMITIDO = /^https?:\/\//i;

export const urlSegura = (valor) => {
  if (!valor) return '';
  const texto = String(valor).trim();
  if (!texto || !PROTOCOLO_PERMITIDO.test(texto)) return '';
  try {
    const url = new URL(texto);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString();
  } catch {
    return '';
  }
};

export const urlSeguraOu = (valor, alternativa = '') => urlSegura(valor) || alternativa;
