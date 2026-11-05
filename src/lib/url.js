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