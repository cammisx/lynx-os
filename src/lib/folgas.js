import { cancelarOcorrencia, avisarHorarioDisponivel } from '@/lib/cobertura';
import { dayKey } from '@/lib/shiftRepeat';

/** Data (YYYY-MM-DD) da ocorrência afetada pelo pedido. */
export const chaveDaOcorrencia = (pedido) =>
  pedido?.ocorrencia_data || dayKey(pedido?.turno_inicio);

/**
 * Aplica um pedido aprovado na grade.
 * Folga: cancela só aquela ocorrência e avisa os chatters da modelo.
 * Redução: grava o ajuste de horário naquela data.
 */
export async function aplicarFolgaAprovada(base44, pedido) {
  if (!pedido?.shift_id) return null;
  const chave = chaveDaOcorrencia(pedido);

  if (pedido.tipo === 'reducao') {
    const turno = await base44.entities.Shift.get(pedido.shift_id);
    const ajustes = Array.isArray(turno?.ajustes) ? turno.ajustes : [];
    await base44.entities.Shift.update(pedido.shift_id, {
      ajustes: [
        ...ajustes,
        {
          data: chave,
          inicio: pedido.entrada_solicitada,
          fim: pedido.saida_solicitada,
          solicitacao_id: pedido.id,
          chatter_id: pedido.usuario_id,
        },
      ],
    });
    return turno;
  }

  const turno = await cancelarOcorrencia(base44, pedido.shift_id, chave, {
    motivo: 'folga aprovada',
    solicitacao_id: pedido.id,
    chatter_id: pedido.usuario_id,
  });

  // Avisar a modelo é acessório: se falhar, a folga já está aplicada.
  try {
    await avisarHorarioDisponivel(base44, {
      shift: turno,
      dateKey: chave,
      inicio: pedido.turno_inicio,
      fim: pedido.turno_fim,
      modeloId: pedido.modelo_id,
      modeloNome: pedido.modelo_nome,
      solicitacaoId: pedido.id,
      excluir: [pedido.usuario_id],
    });
  } catch (error) {
    console.warn('[Folga] aviso de horário disponível', error);
  }

  return turno;
}
