/**
 * Atalhos para o conteúdo acompanhar a modelo na hora em que ela é
 * arquivada, restaurada ou excluída. Sempre arquiva, nunca apaga: o que
 * estiver escrito continua guardado para quando a modelo voltar.
 */
import { base44 } from '@/api/base44Client';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const conteudosDaModelo = async (modeloId) => {
  try {
    const lista = asList(await base44.entities.Conteudo.list('-created_date', 300, 0));
    return lista.filter((item) => item?.modelo_id === modeloId);
  } catch (falha) {
    console.warn('[Conteudo] leitura da modelo falhou', falha);
    return [];
  }
};

export const arquivarConteudoDaModelo = async (modeloId) => {
  if (!modeloId) return 0;
  const alvos = (await conteudosDaModelo(modeloId)).filter((item) => !item.arquivado);
  await Promise.all(
    alvos.map((item) =>
      base44.entities.Conteudo.update(item.id, {
        arquivado: true,
        arquivado_em: new Date().toISOString(),
      }).catch((falha) => console.warn('[Conteudo] arquivar', item.id, falha))
    )
  );
  return alvos.length;
};

export const restaurarConteudoDaModelo = async (modeloId) => {
  if (!modeloId) return 0;
  const alvos = (await conteudosDaModelo(modeloId)).filter((item) => item.arquivado);
  await Promise.all(
    alvos.map((item) =>
      base44.entities.Conteudo.update(item.id, { arquivado: false, arquivado_em: null }).catch(
        (falha) => console.warn('[Conteudo] restaurar', item.id, falha)
      )
    )
  );
  return alvos.length;
};
