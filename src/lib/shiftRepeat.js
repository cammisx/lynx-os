const DAY_MS = 86400000;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date) => {
  const base = startOfDay(date);
  base.setDate(base.getDate() - base.getDay());
  return base;
};

const parseUntil = (value) => {
  if (!value) return Infinity;
  const date = new Date(`${String(value).slice(0, 10)}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? Infinity : date.getTime();
};

export const isRepeating = (shift) =>
  shift?.repeticao === 'semanal' || shift?.repeticao === 'quinzenal';

/**
 * Occurrences of a shift that fall inside [windowStart, windowEnd).
 * Non-repeating shifts return a single occurrence.
 */
export const expandShift = (shift, windowStart, windowEnd) => {
  const start = new Date(shift?.inicio);
  const end = new Date(shift?.fim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

  if (!isRepeating(shift)) {
    return [{ shift, start: start.getTime(), end: end.getTime() }];
  }

  const dias = Array.isArray(shift.dias_semana) ? shift.dias_semana.map(Number) : [];
  if (!dias.length) return [];

  const duration = end.getTime() - start.getTime();
  const timeOffset = start.getTime() - startOfDay(start).getTime();
  const baseDay = startOfDay(start).getTime();
  const limit = parseUntil(shift.repetir_ate);
  const firstWeek = startOfWeek(start).getTime();
  const occurrences = [];
  const cursor = startOfDay(new Date(windowStart));

  while (cursor.getTime() < windowEnd) {
    const dayStart = cursor.getTime();
    const weeks = Math.round((startOfWeek(cursor).getTime() - firstWeek) / (7 * DAY_MS));
    const inRange = dayStart >= baseDay && dayStart <= limit;
    const inCycle = shift.repeticao === 'semanal' || weeks % 2 === 0;

    if (inRange && inCycle && dias.includes(cursor.getDay())) {
      const occStart = dayStart + timeOffset;
      occurrences.push({ shift, start: occStart, end: occStart + duration });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences;
};