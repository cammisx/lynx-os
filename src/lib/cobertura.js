import { emitNotificationsChanged } from '@/lib/desktopEvents';
import { nomeDaPessoa } from '@/lib/pessoas';
import { conflitosDeTurno } from '@/lib/vagas';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const hora = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const dia = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/** Marca uma única ocorrência como cancelada, sem matar a repetição do turno. */
export async function cancelarOcorrencia(base44, shiftId, dateKey, info = {}) {
  if (!shiftId || !dateKey) return null;
  const shift = await base44.entities.Shift.get(shiftId);
  if (!shift) return null;

  const existentes = Array.isArray(shift.cancelamentos) ? shift.cancelamentos : [];
  const jaCancelado = existentes.some(
    (item) => (typeof item === 'string' ? item : item?.data) === dateKey
  );

  if (jaCancelado) return shift;

  const patch = {
    cancelamentos: [
      ...existentes,
      { data: dateKey, cancelado_em: new Date().toISOString(), ...info },
    ],
  };

  // Turno avulso (sem dias da semana) não tem outra ocorrência: cancela inteiro.
  if (!(Array.isArray(shift.dias_semana) && shift.dias_semana.length)) {
    patch.status = 'cancelado';
  }

  return base44.entities.Shift.update(shiftId, patch);
}

/** Todo mundo vinculado à modelo, mesmo sem turno marcado. */
export async function chattersDaModelo(base44, modeloId) {
  if (!modeloId) return [];
  try {
    const modelo = await base44.entities.Modelo.get(modeloId);
    const lista = Array.isArray(modelo?.chatters) ? modelo.chatters : [];
    return lista
      .filter((chatter) => chatter?.usuario_id)
      .map((chatter) => ({
        usuario_id: chatter.usuario_id,
        usuario_nome: chatter.usuario_nome || '',
      }));
  } catch (error) {
    console.warn('[Cobertura] modelo', error);
    return [];
  }
}

/** Avisa os chatters da modelo que o horário ficou livre. */
export async function avisarHorarioDisponivel(
  base44,
  { shift, dateKey, inicio, fim, modeloNome, modeloId, solicitacaoId, excluir = [] }
) {
  const chatters = await chattersDaModelo(base44, modeloId || shift?.modelo_id);
  const ignorar = new Set(excluir.filter(Boolean));
  const alvos = chatters.filter((chatter) => !ignorar.has(chatter.usuario_id));
  if (!alvos.length) return [];

  const descricao = `${dia(inicio)} · ${hora(inicio)}–${hora(fim)}`;
  const criadas = await Promise.all(
    alvos.map((chatter) =>
      base44.entities.Notificacao.create({
        usuario_id: chatter.usuario_id,
        titulo: `Horário disponível em ${modeloNome || shift?.modelo_nome || 'modelo'}`,
        mensagem: `${descricao} ficou livre. Toque para ver os detalhes e cobrir.`,
        tipo: 'horario_disponivel',
        status: 'pendente',
        lida: false,
        criado_por_automacao: true,
        shift_id: shift?.id || '',
        ocorrencia_data: dateKey || '',
        solicitacao_id: solicitacaoId || '',
        modelo_id: modeloId || shift?.modelo_id || '',
        modelo_nome: modeloNome || shift?.modelo_nome || '',
        turno_inicio: new Date(inicio).toISOString(),
        turno_fim: new Date(fim).toISOString(),
      })
    )
  );

  emitNotificationsChanged();
  return criadas;
}

/** Turnos da modelo, do mais antigo para o mais novo. Serve para saber quem chegou antes. */
const agendaDaModelo = async (base44, modeloId) => {
  if (!modeloId) return [];
  try {
    return asList(await base44.entities.Shift.filter({ modelo_id: modeloId }, '-inicio', 500));
  } catch (error) {
    console.warn('[Cobertura] agenda', error);
    return [];
  }
};

const maisAntigo = (a, b) => {
  const dataA = new Date(a?.created_date || 0).getTime();
  const dataB = new Date(b?.created_date || 0).getTime();
  return dataA - dataB;
};

/**
 * Cria o turno de quem se ofereceu e fecha as notificações daquele horário.
 *
 * Uma modelo tem um chatter por horário, então a cobertura passa pela mesma
 * conferência do formulário. Dois cliques ao mesmo tempo podem criar dois
 * turnos, porque o banco não tem trava: depois de criar, o turno perde a
 * disputa e se apaga sozinho se já existia alguém cobrindo antes dele.
 */
export async function criarCobertura(base44, { notification, usuario, inicio, fim }) {
  const modeloId = notification?.modelo_id || '';
  const candidato = {
    modelo_id: modeloId,
    usuario_id: usuario?.id || '',
    inicio: new Date(inicio).toISOString(),
    fim: new Date(fim).toISOString(),
  };

  const antes = await agendaDaModelo(base44, modeloId);
  const choques = conflitosDeTurno({ candidato, existentes: antes });
  if (choques.length) {
    throw new Error(
      `${choques[0].usuarioNome || 'Outra pessoa'} já está cobrindo esse horário nesta modelo.`
    );
  }

  const turno = await base44.entities.Shift.create({
    usuario_id: usuario?.id || '',
    usuario_nome: usuario ? nomeDaPessoa(usuario) : '',
    modelo_id: notification?.modelo_id || '',
    modelo_nome: notification?.modelo_nome || '',
    inicio: new Date(inicio).toISOString(),
    fim: new Date(fim).toISOString(),
    status: 'agendado',
    aceite: 'aceito',
    aceite_em: new Date().toISOString(),
    repeticao: 'nenhuma',
  });

  /* Corrida: quem criou primeiro fica com o horário. */
  const depois = await agendaDaModelo(base44, modeloId);
  const rivais = conflitosDeTurno({
    candidato,
    existentes: depois.filter((item) => item.id !== turno.id),
  })
    .map((choque) => depois.find((item) => item.id === choque.shiftId))
    .filter(Boolean);

  const perdeu = rivais.some((rival) => maisAntigo(rival, turno) < 0);
  if (perdeu) {
    await base44.entities.Shift.delete(turno.id).catch((error) =>
      console.warn('[Cobertura] desfazer', error)
    );
    throw new Error(
      `${rivais[0]?.usuario_nome || 'Outra pessoa'} cobriu esse horário antes de você.`
    );
  }

  try {
    await base44.entities.Notificacao.update(notification.id, {
      status: 'resolvida',
      lida: true,
      resposta: 'coberto',
    });
  } catch (error) {
    console.warn('[Cobertura] notificacao', error);
  }

  // Quem chegou depois não precisa mais ver o mesmo horário livre.
  if (notification?.shift_id && notification?.ocorrencia_data) {
    try {
      const pendentes = asList(
        await base44.entities.Notificacao.filter(
          { tipo: 'horario_disponivel', status: 'pendente' },
          '-created_date',
          100
        )
      ).filter(
        (item) =>
          item.id !== notification.id &&
          item.shift_id === notification.shift_id &&
          item.ocorrencia_data === notification.ocorrencia_data
      );
      await Promise.all(
        pendentes.map((item) =>
          base44.entities.Notificacao.update(item.id, {
            status: 'resolvida',
            lida: true,
            resposta: 'coberto por outra pessoa',
          })
        )
      );
    } catch (error) {
      console.warn('[Cobertura] limpar pendentes', error);
    }
  }

  emitNotificationsChanged();
  return turno;
}
