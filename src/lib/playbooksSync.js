/**
 * Atalhos para o playbook acompanhar a modelo na hora em que ela é
 * arquivada, restaurada ou excluída. Sempre arquiva, nunca apaga: o texto
 * escrito continua guardado para quando a modelo voltar.
 */
import { base44 } from '@/api/base44Client';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const playbooksDaModelo = async (modeloId) => {
  const lista = asList(await base44.entities.Playbook.list('-created_date', 300, 0));
  return lista.filter((item) => item?.modelo_id === modeloId);
};

export const arquivarPlaybookDaModelo = async (modeloId) => {
  if (!modeloId) return 0;
  try {
    const alvos = (await playbooksDaModelo(modeloId)).filter((item) => !item.arquivado);
    await Promise.all(
      alvos.map((item) =>
        base44.entities.Playbook.update(item.id, {
          arquivado: true,
          arquivado_em: new Date().toISOString(),
        }).catch((falha) => console.warn('[Playbook] arquivar', item.id, falha))
      )
    );
    return alvos.length;
  } catch (falha) {
    console.warn('[Playbook] arquivar da modelo', falha);
    return 0;
  }
};

export const restaurarPlaybookDaModelo = async (modeloId) => {
  if (!modeloId) return 0;
  try {
    const alvos = (await playbooksDaModelo(modeloId)).filter((item) => item.arquivado);
    await Promise.all(
      alvos.map((item) =>
        base44.entities.Playbook.update(item.id, { arquivado: false, arquivado_em: null }).catch(
          (falha) => console.warn('[Playbook] restaurar', item.id, falha)
        )
      )
    );
    return alvos.length;
  } catch (falha) {
    console.warn('[Playbook] restaurar da modelo', falha);
    return 0;
  }
};
