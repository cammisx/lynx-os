/**
 * Conversão de datas vindas do backend.
 *
 * O backend devolve `created_date` em UTC mas sem o sufixo de fuso
 * ("2026-11-05T15:55:12.680000"). O JavaScript lê uma string dessas como hora
 * local, então 12:55 em São Paulo aparecia como 15:55. Aqui a string sem fuso é
 * marcada como UTC e o navegador de quem está acessando decide o resto.
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

export const horaLocal = (valor) => {
  const data = paraData(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const diaCurtoLocal = (valor) => {
  const data = paraData(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};