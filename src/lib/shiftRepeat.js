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

/**
 * Occurrences of a shift that fall inside [windowStart, windowEnd).
 * No marked weekdays means a single occurrence on the start date.
 */
export const expandShift = (shift, windowStart, windowEnd) => {
  const start = new Date(shift?.inicio);
  const end = new Date(shift?.fim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

  const dias = sortDays(shift.dias_semana);
  if (!dias.length) {
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
      const occStart = dayStart + timeOffset;
      occurrences.push({ shift, start: occStart, end: occStart + duration });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences;
};