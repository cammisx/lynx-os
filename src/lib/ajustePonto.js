import { emitShiftsChanged } from '@/lib/desktopEvents';
import { nomeDaPessoa } from '@/lib/pessoas';

const iso = (data) => (data ? new Date(data).toISOString() : '');
const mesmoHorario = (registro, data) =>
  !!registro?.timestamp && !!data && new Date(registro.timestamp).getTime() === data.getTime();

const criarRegistro = (base44, ocorrencia, usuario, tipo, quando) =>
  base44.entities.RegistroPonto.create({
    shift_id: ocorrencia.shiftId,
    ocorrencia_data: ocorrencia.dateKey,
    usuario_id: usuario?.id || '',
    usuario_nome: usuario ? nomeDaPessoa(usuario) : '',
    modelo_id: ocorrencia.modeloId || '',
    modelo_nome: ocorrencia.modeloNome || '',
    tipo,
    timestamp: iso(quando),
  });

/**
 * Aplica uma correção de ponto direto nos registros do turno.
 * Usado quando o chatter corrige o turno que está acontecendo agora:
 * a alteração entra na hora, sem passar pelo admin.
 *
 * Entrada e saída usam o único registro do tipo; as pausas usam o id
 * de cada batida para saber o que atualizar (ou criar, se não existir).
 */
export default async function aplicarAjustePonto(
  base44,
  {
    ocorrencia,
    registros = [],
    entrada = null,
    saida = null,
    pausas = [],
    usuario = null,
    fecharTurno = false,
  }
) {
  if (!ocorrencia?.shiftId) return { aplicados: [], fechou: false };

  const aplicados = [];

  const entradaAtual = registros.find((registro) => registro.tipo === 'entrada') || null;
  const saidaAtual = [...registros].reverse().find((registro) => registro.tipo === 'saida') || null;

  if (entrada) {
    if (!entradaAtual) {
      await criarRegistro(base44, ocorrencia, usuario, 'entrada', entrada);
      aplicados.push('entrada');
    } else if (!mesmoHorario(entradaAtual, entrada)) {
      await base44.entities.RegistroPonto.update(entradaAtual.id, { timestamp: iso(entrada) });
      aplicados.push('entrada');
    }
  }

  if (saida) {
    if (!saidaAtual) {
      await criarRegistro(base44, ocorrencia, usuario, 'saida', saida);
      aplicados.push('saida');
    } else if (!mesmoHorario(saidaAtual, saida)) {
      await base44.entities.RegistroPonto.update(saidaAtual.id, { timestamp: iso(saida) });
      aplicados.push('saida');
    }
  }

  for (const item of pausas) {
    if (item?.inicio) {
      if (item.pausaId) {
        const registro = registros.find((row) => row.id === item.pausaId);
        if (!mesmoHorario(registro, item.inicio)) {
          await base44.entities.RegistroPonto.update(item.pausaId, { timestamp: iso(item.inicio) });
          aplicados.push('pausa');
        }
      } else {
        await criarRegistro(base44, ocorrencia, usuario, 'pausa', item.inicio);
        aplicados.push('pausa');
      }
    }

    if (item?.fim) {
      if (item.retornoId) {
        const registro = registros.find((row) => row.id === item.retornoId);
        if (!mesmoHorario(registro, item.fim)) {
          await base44.entities.RegistroPonto.update(item.retornoId, { timestamp: iso(item.fim) });
          aplicados.push('retorno');
        }
      } else {
        await criarRegistro(base44, ocorrencia, usuario, 'retorno', item.fim);
        aplicados.push('retorno');
      }
    }
  }

  // Saída corrigida num turno que estava aberto: fecha o turno junto.
  if (saida && saidaAtual === null && fecharTurno) {
    try {
      await base44.entities.Shift.update(ocorrencia.shiftId, {
        status: 'concluido',
        fim_real: iso(saida),
      });
    } catch (error) {
      console.warn('[AjustePonto] não consegui fechar o turno', error);
    }
  }

  emitShiftsChanged();
  return { aplicados, fechou: !!(saida && fecharTurno) };
}

/** Descreve a correção em uma frase, para a notificação. */
export const descreverAjuste = ({ entrada, saida, pausas = [], hora }) => {
  const pedacos = [];
  if (entrada) pedacos.push(`entrada ${hora(entrada)}`);
  if (saida) pedacos.push(`saída ${hora(saida)}`);
  pausas.forEach((item, indice) => {
    if (!item.inicio) return;
    pedacos.push(
      `pausa ${indice + 1} ${hora(item.inicio)}–${item.fim ? hora(item.fim) : 'aberta'}`
    );
  });
  return pedacos;
};
