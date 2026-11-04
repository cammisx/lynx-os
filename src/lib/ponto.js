export const localDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

export const occurrenceKey = (shiftId, dateKey) => `${shiftId}|${dateKey}`;

/**
 * Groups point records per occurrence (shift_id + ocorrencia_data) so the widget
 * can tell whether there is an open entry, an open pause and how much was paused.
 */
export const buildPontoIndex = (registros) => {
  const index = {};
  const sorted = [...(Array.isArray(registros) ? registros : [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  sorted.forEach((registro) => {
    const key = occurrenceKey(registro.shift_id, registro.ocorrencia_data);
    const entry =
      index[key] ||
      {
        key,
        shiftId: registro.shift_id,
        dateKey: registro.ocorrencia_data,
        modeloId: '',
        modeloNome: '',
        entrada: null,
        saida: null,
        pausaAberta: null,
        pausasMs: 0,
      };

    const ts = new Date(registro.timestamp).getTime();
    if (registro.modelo_nome) entry.modeloNome = registro.modelo_nome;
    if (registro.modelo_id) entry.modeloId = registro.modelo_id;

    if (registro.tipo === 'entrada') {
      entry.entrada = ts;
      entry.saida = null;
      entry.pausaAberta = null;
      entry.pausasMs = 0;
    } else if (registro.tipo === 'pausa') {
      if (entry.entrada && !entry.pausaAberta) entry.pausaAberta = ts;
    } else if (registro.tipo === 'retorno') {
      if (entry.pausaAberta) {
        entry.pausasMs += ts - entry.pausaAberta;
        entry.pausaAberta = null;
      }
    } else if (registro.tipo === 'saida') {
      if (entry.pausaAberta) {
        entry.pausasMs += ts - entry.pausaAberta;
        entry.pausaAberta = null;
      }
      entry.saida = ts;
    }

    index[key] = entry;
  });

  return index;
};

export const durationLabel = (ms) => {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return hours < 1 ? `${minutes}min` : `${hours}h ${minutes}min`;
};

export const countdownLabel = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return 'agora';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  if (days >= 1) return `${days}d ${Math.floor((totalMin % 1440) / 60)}h`;
  if (totalMin >= 60) return `${Math.floor(totalMin / 60)}h ${totalMin % 60}min`;
  return `${totalMin}min`;
};

export const clockLabel = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};