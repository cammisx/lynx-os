import { expandShift } from '@/lib/shiftRepeat';

export const DAY_MS = 86400000;
export const AVISO_ANTECEDENCIA_MS = 6 * 60 * 60 * 1000;

export const ACEITE_LABEL = {
  pendente: 'Aguardando confirmação',
  aceito: 'Aceito',
  recusado: 'Recusado',
  nao_confirmado: 'Não confirmado',
};

export const ACEITE_COLOR = {
  pendente: 'var(--c16)',
  aceito: '#4ade80',
  recusado: 'var(--erro)',
  nao_confirmado: 'var(--c2)',
};

export const aceiteOf = (shift) => shift?.aceite || 'pendente';

export const isRecusado = (shift) => aceiteOf(shift) === 'recusado';

export const isPendente = (shift) => aceiteOf(shift) === 'pendente';

/** Ocorrência em andamento ou a próxima que ainda não terminou. */
export const nextOccurrence = (shift, now = Date.now()) => {
  const from = now - DAY_MS;
  const occurrences = expandShift(shift, from, now + 60 * DAY_MS);
  return occurrences.find((occurrence) => occurrence.end > now) || null;
};

/** Ocorrência em andamento ou a próxima, para usar como alvo do aviso. */
export const occurrenceForAviso = (shift, now = Date.now()) => nextOccurrence(shift, now);

export const precisaAvisoPendente = (shift, now = Date.now()) => {
  if (!isPendente(shift)) return false;
  const occurrence = occurrenceForAviso(shift, now);
  if (!occurrence) return false;
  return occurrence.start - now <= AVISO_ANTECEDENCIA_MS;
};
