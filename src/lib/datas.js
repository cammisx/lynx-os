/**
 * Conversão de datas do banco para o fuso de quem está acessando.
 *
 * O banco devolve alguns carimbos sem timezone (ex: "2026-11-05T15:55:12.68").
 * Nesse formato o JavaScript interpreta o valor como hora local, e a tela acaba
 * mostrando o UTC cru (15:55 em vez de 12:55 em São Paulo). Aqui assumimos UTC
 * quando a string não traz fuso; quando traz "Z" ou offset, ela manda.
 */

const SEM_FUSO = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export const paraData = (valor) => {
  if (valor instanceof Date) return valor;
  if (valor === null || valor === undefined || valor === '') return new Date(NaN);
  if (typeof valor === 'number') return new Date(valor);
  const texto = String(valor).trim();
  if (!SEM_FUSO.test(texto)) return new Date(texto);
  return new Date(`${texto.replace(' ', 'T')}Z`);
};

export const dataValida = (valor) => !Number.isNaN(paraData(valor).getTime());

/** Hora no fuso do navegador de quem está acessando. */
export const horaLocal = (valor) => {
  const data = paraData(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/** Data curta (dd/mm) no fuso de quem está acessando. */
export const diaCurtoLocal = (valor) => {
  const data = paraData(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/** Data e hora completas no fuso de quem está acessando. */
export const dataHoraLocal = (valor) => {
  const data = paraData(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};