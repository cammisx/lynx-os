import { base44 } from '@/api/base44Client';

/**
 * Conversa com as funções de backend das páginas.
 *
 * O "ao vivo" e o turno espontâneo dependem de service role: um chatter não
 * enxerga o ponto nem os turnos dos colegas, então quem responde se a página
 * está livre é o servidor, nunca o cliente.
 */

const corpo = (resposta) => resposta?.data || resposta || {};

export const carregarPaginas = async () => {
  const resposta = await base44.functions.invoke('paginasAoVivo', {});
  const dados = corpo(resposta);
  if (!dados?.ok) {
    const erro = new Error(dados?.error || 'Não foi possível carregar as páginas');
    erro.codigo = 'indisponivel';
    throw erro;
  }
  return Array.isArray(dados.paginas) ? dados.paginas : [];
};

/**
 * Começa um turno espontâneo numa página livre.
 * Devolve { ok, shift_id, fim_previsto, minutos_ate_proximo } ou
 * { ok: false, motivo, ocupante, error } quando alguém entrou antes.
 */
export const iniciarEspontaneo = async (modeloId) => {
  const resposta = await base44.functions.invoke('iniciarEspontaneo', {
    modelo_id: modeloId,
  });
  return corpo(resposta);
};

/**
 * Fecha turnos espontâneos abertos na página. Roda depois de qualquer entrada,
 * porque é a entrada de alguém que tira o espontâneo do ar.
 * Nunca deve atrapalhar a batida de ponto: falha em silêncio.
 */
export const encerrarEspontaneos = async ({ modeloId, shiftId }) => {
  if (!modeloId) return null;
  try {
    const resposta = await base44.functions.invoke('encerrarEspontaneos', {
      modelo_id: modeloId,
      shift_id: shiftId || '',
    });
    return corpo(resposta);
  } catch (error) {
    console.warn('[encerrarEspontaneos]', error);
    return null;
  }
};
