import { base44 } from '@/api/base44Client';

/**
 * Presença do app: enquanto a janela está visível, o navegador avisa de tempos
 * em tempos que a pessoa está ali. É isso que o fechamento automático de turno
 * consulta, e não o chat: a pessoa pode estar trabalhando com a aba aberta e o
 * chat fechado.
 *
 * Grava no máximo uma vez por minuto, e nada com a aba escondida. Sem batida
 * por 5 minutos, o app considera a pessoa fora.
 */

export const INTERVALO_PULSO_MS = 90 * 1000;
export const GRAVAR_A_CADA_MS = 60 * 1000;

let ultimaGravacao = 0;
let registroId = '';

const agoraIso = () => new Date().toISOString();

/**
 * Uma batida. Devolve true quando realmente gravou.
 * Reaproveita a linha da pessoa (uma por usuário) para não encher a tabela.
 */
export async function baterPresenca(user, { forcar = false } = {}) {
  if (!user?.id) return false;
  if (typeof document !== 'undefined' && document.hidden && !forcar) return false;
  if (!forcar && Date.now() - ultimaGravacao < GRAVAR_A_CADA_MS) return false;

  ultimaGravacao = Date.now();
  const dados = {
    usuario_id: user.id,
    usuario_nome: user.full_name || user.email || '',
    visto_em: agoraIso(),
  };

  try {
    if (registroId) {
      await base44.entities.PresencaApp.update(registroId, { visto_em: dados.visto_em });
      return true;
    }
    const existentes = await base44.entities.PresencaApp.filter(
      { usuario_id: user.id },
      { sort: '-visto_em', limit: 1 }
    );
    const lista = Array.isArray(existentes) ? existentes : existentes?.items || [];
    if (lista[0]?.id) {
      registroId = lista[0].id;
      await base44.entities.PresencaApp.update(registroId, {
        visto_em: dados.visto_em,
        usuario_nome: dados.usuario_nome,
      });
      return true;
    }
    const criado = await base44.entities.PresencaApp.create(dados);
    registroId = criado?.id || '';
    return true;
  } catch (erro) {
    ultimaGravacao = 0;
    console.warn('[PresencaApp] batida falhou', erro?.message || erro);
    return false;
  }
}
