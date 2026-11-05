const DAY_MS = 86400000;

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseUntil = (value) => {
  if (!value) return Infinity;
  const date = new Date(`${String(value).slice(0, 10)}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? Infinity : date.getTime();
};

export const sortDays = (dias) => (Array.isArray(dias) ? dias.map(Number).sort((a, b) => a - b) : []);

export const daysLabel = (dias) => sortDays(dias).map((day) => WEEKDAY_LABELS[day]).join(', ');

export const hasWeekdays = (shift) => sortDays(shift?.dias_semana).length > 0;

/** Chave local AAAA-MM-DD, sem depender de fuso. */
export const dayKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

/** Dias cancelados individualmente (folga aprovada, por exemplo). */
export const diasCancelados = (shift) =>
  new Set(
    (Array.isArray(shift?.cancelamentos) ? shift.cancelamentos : [])
      .map((item) => (typeof item === 'string' ? item : item?.data))
      .filter(Boolean)
  );

export const isDiaCancelado = (shift, valor) => diasCancelados(shift).has(dayKey(valor));

/** Horários diferentes só naquele dia (redução de horário aprovada). */
export const ajustesPorDia = (shift) => {
  const mapa = new Map();
  (Array.isArray(shift?.ajustes) ? shift.ajustes : []).forEach((item) => {
    if (!item?.data) return;
    const inicio = new Date(item.inicio).getTime();
    const fim = new Date(item.fim).getTime();
    if (Number.isNaN(inicio) || Number.isNaN(fim) || fim <= inicio) return;
    mapa.set(item.data, { inicio, fim });
  });
  return mapa;
};

/**
 * Occurrences of a shift that fall inside [windowStart, windowEnd).
 * No marked weekdays means a single occurrence on the start date.
 */
export const expandShift = (shift, windowStart, windowEnd) => {
  const start = new Date(shift?.inicio);
  const end = new Date(shift?.fim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

  const cancelados = diasCancelados(shift);
  const ajustes = ajustesPorDia(shift);

  const dias = sortDays(shift.dias_semana);
  if (!dias.length) {
    const chave = dayKey(start);
    if (cancelados.has(chave)) return [];
    const ajuste = ajustes.get(chave);
    if (ajuste) return [{ shift, start: ajuste.inicio, end: ajuste.fim, ajustado: true }];
    return [{ shift, start: start.getTime(), end: end.getTime() }];
  }

  const duration = end.getTime() - start.getTime();
  const timeOffset = start.getTime() - startOfDay(start).getTime();
  const baseDay = startOfDay(start).getTime();
  const limit = parseUntil(shift.repetir_ate);
  const occurrences = [];
  const cursor = startOfDay(new Date(windowStart));

  while (cursor.getTime() < windowEnd) {
    const dayStart = cursor.getTime();

    if (dayStart >= baseDay && dayStart <= limit && dias.includes(cursor.getDay())) {
      const chave = dayKey(dayStart);
      if (!cancelados.has(chave)) {
        const ajuste = ajustes.get(chave);
        const occStart = dayStart + timeOffset;
        occurrences.push(
          ajuste
            ? { shift, start: ajuste.inicio, end: ajuste.fim, ajustado: true }
            : { shift, start: occStart, end: occStart + duration }
        );
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences;
};