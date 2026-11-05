import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Notifica o chatter quando um turno é inserido para ele.
// Chamada pelo formulário de turno logo após criar (ou reatribuir) um shift.
// Também funciona sem usuário, para uso por automação de entidade.

const TZ = 'America/Sao_Paulo';
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pad = (value) => String(value).padStart(2, '0');

const wallClockInTz = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
  };
};

const dateLabel = (date) => {
  const wall = wallClockInTz(date);
  return `${pad(wall.day)}/${pad(wall.month)}`;
};

const timeLabel = (date) => {
  const wall = wallClockInTz(date);
  return `${pad(wall.hour)}:${pad(wall.minute)}`;
};

const daysLabel = (dias) => {
  const list = (Array.isArray(dias) ? dias : [])
    .map(Number)
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);

  const names = list.map((day) => WEEKDAYS[day]);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
};

/** Monta o texto da notificação a partir do turno. Exportado para teste. */
export const buildNovoShiftMessage = (shift) => {
  const inicio = new Date(shift?.inicio);
  const fim = new Date(shift?.fim);
  const modelo = shift?.modelo_nome || 'uma modelo';
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return `Você recebeu um novo turno em ${modelo}.`;
  }

  const horario = `das ${timeLabel(inicio)} às ${timeLabel(fim)}`;
  const dias = Array.isArray(shift?.dias_semana) ? shift.dias_semana.filter((d) => d !== null) : [];
  const until = shift?.repetir_ate ? String(shift.repetir_ate).slice(0, 10) : '';
  const untilLabel = until
    ? dateLabel(new Date(`${until}T12:00:00`))
    : '';

  if (!dias.length) {
    return `Novo turno em ${modelo}: ${dateLabel(inicio)}, ${horario}.`;
  }

  const base = `Novo turno em ${modelo}: ${daysLabel(dias)}, ${horario}, a partir de ${dateLabel(inicio)}`;
  return untilLabel ? `${base} até ${untilLabel}.` : `${base}.`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Automação de entidade roda sem sessão; nesse caso o payload traz o shift.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ ok: false, error: 'Apenas admin pode notificar turnos' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const shift = body?.shift_id
      ? await base44.asServiceRole.entities.Shift.get(body.shift_id).catch(() => null)
      : body?.shift;

    if (!shift) {
      return Response.json({ ok: false, error: 'Turno não encontrado' }, { status: 404 });
    }

    if (!shift.usuario_id) {
      return Response.json({ ok: true, skipped: 'turno sem chatter' });
    }

    if (shift.status === 'cancelado') {
      return Response.json({ ok: true, skipped: 'turno cancelado' });
    }

    const existing = await base44.asServiceRole.entities.Notificacao.filter(
      { shift_id: shift.id, tipo: 'novo_shift' },
      { limit: 1 }
    );
    const jaNotificado = Array.isArray(existing)
      ? existing.length > 0
      : (existing?.items || []).length > 0;

    if (jaNotificado) {
      return Response.json({ ok: true, skipped: 'já notificado' });
    }

    const notificacao = await base44.asServiceRole.entities.Notificacao.create({
      usuario_id: shift.usuario_id,
      titulo: 'Novo turno',
      mensagem: buildNovoShiftMessage(shift),
      tipo: 'novo_shift',
      shift_id: shift.id,
      status: 'pendente',
      criado_por_automacao: !user,
    });

    return Response.json({ ok: true, notificacao_id: notificacao?.id || null });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
});
