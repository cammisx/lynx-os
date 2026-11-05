import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Mostrador ao vivo das páginas. Para cada modelo em que a pessoa está
// atribuída, devolve quem está com ponto aberto (e desde quando) e qual é o
// próximo turno marcado naquela página.
//
// Roda com service role porque o chatter não enxerga o ponto nem os turnos
// dos colegas: é a única fonte confiável do "está livre agora".

const TZ = 'America/Sao_Paulo';
const PAGE = 500;
const DAY_MS = 86400000;
const JANELA_DIAS = 7;
const REGISTRO_JANELA_MS = 48 * 60 * 60 * 1000;
// Entrada esquecida (sem saída) não segura a página para sempre.
const REGISTRO_ESQUECIDO_MS = 18 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

const lista = (resultado: any) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

export const wallClockInTz = (date: Date) => {
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

  const map: Record<string, string> = {};
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

export const tzOffsetMs = (utcMs: number) => {
  const wall = wallClockInTz(new Date(utcMs));
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - utcMs;
};

export const zonedToUtc = (dateKey: string, hours: number, minutes: number) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const guess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  return guess - tzOffsetMs(guess);
};

export const dateKeyInTz = (value: Date | number | string) => {
  const wall = wallClockInTz(new Date(value));
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
};

const keyPlusDays = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const base = new Date(Date.UTC(year, month - 1, day + days));
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
};

const weekdayOfKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const sortDays = (dias: any) => (Array.isArray(dias) ? dias.map(Number).sort((a, b) => a - b) : []);

const diasCancelados = (shift: any) =>
  new Set(
    (Array.isArray(shift?.cancelamentos) ? shift.cancelamentos : [])
      .map((item: any) => (typeof item === 'string' ? item : item?.data))
      .filter(Boolean)
  );

const ajustesPorDia = (shift: any) => {
  const mapa = new Map<string, { start: number; end: number }>();
  (Array.isArray(shift?.ajustes) ? shift.ajustes : []).forEach((item: any) => {
    if (!item?.data) return;
    const start = new Date(item.inicio).getTime();
    const end = new Date(item.fim).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return;
    mapa.set(String(item.data), { start, end });
  });
  return mapa;
};

/** Ocorrências de um turno dentro de [fromMs, toMs), no fuso de São Paulo. */
export const expandOccurrences = (shift: any, fromMs: number, toMs: number) => {
  const start = new Date(shift?.inicio);
  const end = new Date(shift?.fim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

  const cancelados = diasCancelados(shift);
  const ajustes = ajustesPorDia(shift);
  const dias = sortDays(shift.dias_semana);
  const inicioKey = dateKeyInTz(start);

  if (!dias.length) {
    const ajuste = ajustes.get(inicioKey);
    if (!ajuste && cancelados.has(inicioKey)) return [];
    const occStart = ajuste ? ajuste.start : start.getTime();
    const occEnd = ajuste ? ajuste.end : end.getTime();
    if (occEnd <= fromMs || occStart >= toMs) return [];
    return [{ shift, key: inicioKey, start: occStart, end: occEnd }];
  }

  const duration = end.getTime() - start.getTime();
  const wall = wallClockInTz(start);
  const limiteKey = shift?.repetir_ate ? String(shift.repetir_ate).slice(0, 10) : null;
  const ocorrencias: any[] = [];

  let cursorKey = dateKeyInTz(fromMs);
  if (cursorKey < inicioKey) cursorKey = inicioKey;

  for (let i = 0; i <= JANELA_DIAS + 1; i += 1) {
    const key = keyPlusDays(cursorKey, i);
    if (limiteKey && key > limiteKey) break;
    if (!dias.includes(weekdayOfKey(key))) continue;
    if (cancelados.has(key)) continue;

    const ajuste = ajustes.get(key);
    const occStart = ajuste ? ajuste.start : zonedToUtc(key, wall.hour, wall.minute);
    if (occStart === null) continue;
    const occEnd = ajuste ? ajuste.end : occStart + duration;
    if (occEnd <= fromMs || occStart >= toMs) continue;

    ocorrencias.push({ shift, key, start: occStart, end: occEnd });
  }

  return ocorrencias;
};

/** Agrupa o ponto por ocorrência e devolve só as entradas ainda abertas. */
export const entradasAbertas = (registros: any[], now: number) => {
  const porChave = new Map<string, any>();

  const ordenados = [...(registros || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  ordenados.forEach((registro) => {
    if (!registro?.shift_id) return;
    const chave = `${registro.shift_id}|${registro.ocorrencia_data || ''}`;
    const item =
      porChave.get(chave) ||
      {
        chave,
        shiftId: registro.shift_id,
        modeloId: registro.modelo_id || '',
        modeloNome: registro.modelo_nome || '',
        usuarioId: registro.usuario_id || '',
        usuarioNome: registro.usuario_nome || '',
        entrada: null as number | null,
        saida: null as number | null,
        pausaAberta: null as boolean,
      };

    const ts = new Date(registro.timestamp).getTime();
    if (!Number.isNaN(ts)) {
      if (registro.tipo === 'entrada') {
        item.entrada = ts;
        item.saida = null;
      } else if (registro.tipo === 'saida') {
        item.saida = ts;
      } else if (registro.tipo === 'pausa') {
        item.pausaAberta = true;
      } else if (registro.tipo === 'retorno') {
        item.pausaAberta = false;
      }
    }

    if (registro.usuario_id) item.usuarioId = registro.usuario_id;
    if (registro.usuario_nome) item.usuarioNome = registro.usuario_nome;
    if (registro.modelo_id) item.modeloId = registro.modelo_id;
    if (registro.modelo_nome) item.modeloNome = registro.modelo_nome;

    porChave.set(chave, item);
  });

  return [...porChave.values()].filter(
    (item) =>
      item.entrada !== null &&
      item.saida === null &&
      now - item.entrada <= REGISTRO_ESQUECIDO_MS
  );
};

export const turnosVigentes = (shifts: any[], modeloId: string, fromMs: number, toMs: number) =>
  (shifts || [])
    .filter((shift) => shift?.modelo_id === modeloId && !shift?.avulso)
    .filter((shift) => shift?.aceite !== 'recusado')
    .filter((shift) => shift?.status !== 'cancelado')
    .flatMap((shift) => expandOccurrences(shift, fromMs, toMs))
    .sort((a, b) => a.start - b.start);

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });
    }

    const fetchWhere = async (entity: string, query: any, sort = '-created_date') => {
      const out: any[] = [];
      let skip = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities[entity].filter(query, sort, PAGE, skip);
        const items = lista(batch);
        out.push(...items);
        if (items.length < PAGE) break;
        skip += PAGE;
      }
      return out;
    };

    const now = Date.now();
    const [modelos, shifts, registros] = await Promise.all([
      fetchWhere('Modelo', {}),
      fetchWhere('Shift', {}, 'inicio'),
      fetchWhere(
        'RegistroPonto',
        { timestamp: { $gte: new Date(now - REGISTRO_JANELA_MS).toISOString() } },
        '-timestamp'
      ),
    ]);

    const minhas = (modelos || [])
      .filter((modelo) => !modelo?.arquivada)
      .filter((modelo) =>
        (Array.isArray(modelo?.chatters) ? modelo.chatters : []).some(
          (chatter: any) => chatter?.usuario_id === user.id
        )
      )
      .sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || '')));

    const abertas = entradasAbertas(registros, now);
    const janelaFim = now + JANELA_DIAS * DAY_MS;

    const paginas = minhas.map((modelo) => {
      const ocupantes = abertas
        .filter((item) => item.modeloId === modelo.id)
        .map((item) => ({
          usuario_id: item.usuarioId,
          usuario_nome: item.usuarioNome,
          desde: new Date(item.entrada).toISOString(),
          shift_id: item.shiftId,
          pausa: Boolean(item.pausaAberta),
        }));

      const ocorrencias = turnosVigentes(shifts, modelo.id, now, janelaFim);
      const agora = ocorrencias.find((occ) => occ.start <= now && occ.end > now) || null;
      const proximo = ocorrencias.find((occ) => occ.start > now) || null;

      const estado = ocupantes.length
        ? 'ocupada'
        : agora
        ? 'programado_sem_entrada'
        : 'livre';

      return {
        modelo_id: modelo.id,
        modelo_nome: modelo.nome || '',
        estado,
        ocupantes,
        livre_ate: proximo ? new Date(proximo.start).toISOString() : null,
        minutos_livres: proximo ? Math.max(0, Math.round((proximo.start - now) / 60000)) : null,
        proximo: proximo
          ? {
              shift_id: proximo.shift?.id || '',
              inicio: new Date(proximo.start).toISOString(),
              fim: new Date(proximo.end).toISOString(),
              usuario_id: proximo.shift?.usuario_id || '',
              usuario_nome: proximo.shift?.usuario_nome || '',
              confirmado: proximo.shift?.aceite === 'aceito',
            }
          : null,
        programado_agora: agora
          ? {
              shift_id: agora.shift?.id || '',
              inicio: new Date(agora.start).toISOString(),
              fim: new Date(agora.end).toISOString(),
              usuario_id: agora.shift?.usuario_id || '',
              usuario_nome: agora.shift?.usuario_nome || '',
            }
          : null,
      };
    });

    return Response.json({
      ok: true,
      agora: new Date(now).toISOString(),
      paginas,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
});
