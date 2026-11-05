import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Fecha turnos esquecidos: ocorrências com entrada registrada e sem saída,
// 2 horas após o fim previsto, ganham saída automática e geram uma notificação
// pedindo justificativa ao chatter.
//
// Pode rodar por automação agendada (sem usuário), por admin (varre a equipe
// inteira) ou por um chatter (varre apenas as próprias ocorrências).
// É idempotente: nunca duplica saída nem notificação para a mesma ocorrência.

const GRACE_MS = 2 * 60 * 60 * 1000;
const TZ = 'America/Sao_Paulo';
const PAGE = 500;

const pad = (value) => String(value).padStart(2, '0');

export const wallClockInTz = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
    second: Number(map.second),
  };
};

const tzOffsetMs = (utcMs) => {
  const wall = wallClockInTz(new Date(utcMs));
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - utcMs;
};

export const zonedToUtc = (dateKey, hours, minutes) => {
  const [year, month, day] = String(dateKey || '')
    .split('-')
    .map(Number);
  if (!year || !month || !day) return null;
  const guess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  return guess - tzOffsetMs(guess);
};

export const dateKeyInTz = (date) => {
  const wall = wallClockInTz(date);
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
};

/**
 * Início e fim previstos de uma ocorrência, preservando a duração do turno.
 * O horário de início é lido no fuso de São Paulo e aplicado ao dia da ocorrência.
 */
export const occurrenceWindow = (shift, dateKey) => {
  const start = new Date(shift?.inicio);
  const end = new Date(shift?.fim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const duration = end.getTime() - start.getTime();
  if (duration <= 0) return null;

  const wall = wallClockInTz(start);
  const occStart = zonedToUtc(dateKey, wall.hour, wall.minute);
  if (occStart === null) return null;

  return { start: occStart, end: occStart + duration };
};

/** Confere se a data da ocorrência realmente pertence à regra do turno. */
export const belongsToRule = (shift, dateKey) => {
  const start = new Date(shift?.inicio);
  if (Number.isNaN(start.getTime())) return false;

  const dias = Array.isArray(shift?.dias_semana) ? shift.dias_semana.map(Number) : [];
  if (!dias.length) return dateKeyInTz(start) === dateKey;

  const startKey = dateKeyInTz(start);
  if (dateKey < startKey) return false;

  const until = shift?.repetir_ate ? String(shift.repetir_ate).slice(0, 10) : null;
  if (until && dateKey > until) return false;

  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return dias.includes(weekday);
};

const dateLabel = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
};

const timeLabel = (ms) => {
  const wall = wallClockInTz(new Date(ms));
  return `${pad(wall.hour)}:${pad(wall.minute)}`;
};

/** Agrupa registros de ponto por ocorrência (shift_id + ocorrencia_data). */
export const buildOccurrences = (registros) => {
  const occurrences = new Map();

  for (const registro of registros) {
    if (!registro.shift_id || !registro.ocorrencia_data) continue;
    const key = `${registro.shift_id}|${registro.ocorrencia_data}`;
    const entry =
      occurrences.get(key) ||
      {
        key,
        shiftId: registro.shift_id,
        dateKey: registro.ocorrencia_data,
        usuarioId: registro.usuario_id,
        usuarioNome: registro.usuario_nome,
        modeloNome: registro.modelo_nome,
        entradaAt: null,
        saida: false,
        pausaAbertaAt: null,
      };

    const ts = new Date(registro.timestamp).getTime();
    if (Number.isNaN(ts)) continue;

    if (registro.tipo === 'entrada') {
      if (entry.entradaAt === null) entry.entradaAt = ts;
      entry.usuarioId = registro.usuario_id || entry.usuarioId;
      entry.usuarioNome = registro.usuario_nome || entry.usuarioNome;
      entry.modeloNome = registro.modelo_nome || entry.modeloNome;
    } else if (registro.tipo === 'pausa') {
      entry.pausaAbertaAt = ts;
    } else if (registro.tipo === 'retorno') {
      entry.pausaAbertaAt = null;
    } else if (registro.tipo === 'saida') {
      entry.saida = true;
      entry.pausaAbertaAt = null;
    }

    occurrences.set(key, entry);
  }

  return occurrences;
};

/**
 * Núcleo do fechamento, sem depender do SDK.
 * `entities` precisa de RegistroPonto.create e Notificacao.filter/create.
 */
export const processarFechamento = async ({ registros, shifts, now, scopeUserId, entities }) => {
  const shiftById = new Map((shifts || []).map((shift) => [shift.id, shift]));
  const occurrences = buildOccurrences(registros || []);

  let fechadas = 0;
  let notificacoesCriadas = 0;
  const erros = [];

  for (const entry of occurrences.values()) {
    if (entry.saida || entry.entradaAt === null) continue;
    if (!entry.usuarioId) continue;
    if (scopeUserId && entry.usuarioId !== scopeUserId) continue;

    const shift = shiftById.get(entry.shiftId);
    if (!shift) continue; // turno órfão: quem resolve isso é a limpeza de órfãos

    if (!belongsToRule(shift, entry.dateKey)) continue;

    const window = occurrenceWindow(shift, entry.dateKey);
    if (!window) continue;
    if (now < window.end + GRACE_MS) continue;

    const closeIso = new Date(window.end).toISOString();
    const modeloNome = entry.modeloNome || shift.modelo_nome || '—';

    try {
      if (entry.pausaAbertaAt !== null) {
        await entities.RegistroPonto.create({
          shift_id: entry.shiftId,
          ocorrencia_data: entry.dateKey,
          usuario_id: entry.usuarioId,
          usuario_nome: entry.usuarioNome || '',
          modelo_id: shift.modelo_id || '',
          modelo_nome: modeloNome,
          tipo: 'retorno',
          timestamp: closeIso,
          automatico: true,
        });
      }

      await entities.RegistroPonto.create({
        shift_id: entry.shiftId,
        ocorrencia_data: entry.dateKey,
        usuario_id: entry.usuarioId,
        usuario_nome: entry.usuarioNome || '',
        modelo_id: shift.modelo_id || '',
        modelo_nome: modeloNome,
        tipo: 'saida',
        timestamp: closeIso,
        automatico: true,
      });
      fechadas += 1;

      const existing = await entities.Notificacao.filter(
        { shift_id: entry.shiftId, ocorrencia_data: entry.dateKey },
        { limit: 1 }
      );
      const jaNotificado = Array.isArray(existing)
        ? existing.length > 0
        : (existing?.items || []).length > 0;

      if (!jaNotificado) {
        await entities.Notificacao.create({
          usuario_id: entry.usuarioId,
          titulo: 'Saída não registrada',
          mensagem: `Seu turno em ${modeloNome} de ${dateLabel(
            entry.dateKey
          )} foi encerrado automaticamente às ${timeLabel(
            window.end
          )} porque a saída não foi registrada. Informe o que aconteceu.`,
          tipo: 'turno_esquecido',
          shift_id: entry.shiftId,
          ocorrencia_data: entry.dateKey,
          status: 'pendente',
          criado_por_automacao: true,
        });
        notificacoesCriadas += 1;
      }
    } catch (error) {
      erros.push({ key: entry.key, error: error?.message || String(error) });
    }
  }

  return {
    ocorrencias_analisadas: occurrences.size,
    fechadas,
    notificacoes_criadas: notificacoesCriadas,
    erros,
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    // Sem usuário = execução por automação agendada. Admin varre a equipe toda.
    // Qualquer outro usuário só pode fechar as próprias ocorrências.
    const scopeUserId = user && user.role !== 'admin' ? user.id : null;

    const fetchAll = async (entity) => {
      const out = [];
      let skip = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities[entity].list(
          '-created_date',
          PAGE,
          skip
        );
        if (!batch || batch.length === 0) break;
        out.push(...batch);
        if (batch.length < PAGE) break;
        skip += PAGE;
      }
      return out;
    };

    const [registros, shifts] = await Promise.all([fetchAll('RegistroPonto'), fetchAll('Shift')]);

    const result = await processarFechamento({
      registros,
      shifts,
      now: Date.now(),
      scopeUserId,
      entities: base44.asServiceRole.entities,
    });

    return Response.json({
      ok: true,
      scope: scopeUserId ? 'usuario' : 'equipe',
      ...result,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
});
