const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pad = (value) => String(value).padStart(2, '0');

const shortDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};

const clock = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const weekdayOf = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getDay();
};

const daysPhrase = (dias) => {
  const sorted = (Array.isArray(dias) ? dias : []).map(Number).sort((a, b) => a - b);
  const labels = sorted.map((dia) => WEEKDAY_LABELS[dia]).filter(Boolean);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
};

/**
 * Texto da notificação enviada ao chatter quando um turno é criado.
 * Turno com dias marcados repete toda semana; sem dias é uma data única.
 */
export const buildNovoShiftMessage = (shift = {}) => {
  const modelo = shift.modelo_nome ? `em ${shift.modelo_nome}` : 'em uma modelo';
  const horario = `das ${clock(shift.inicio)} às ${clock(shift.fim)}`;
  const dias = Array.isArray(shift.dias_semana) ? shift.dias_semana : [];

  if (!dias.length) {
    return `Novo turno ${modelo}: ${shortDate(shift.inicio)}, ${horario}.`;
  }

  const ate = shift.repetir_ate
    ? ` até ${shortDate(`${String(shift.repetir_ate).slice(0, 10)}T12:00:00`)}`
    : '';

  return `Novo turno ${modelo}: ${daysPhrase(dias)}, ${horario}, a partir de ${shortDate(
    shift.inicio
  )}${ate}.`;
};

export const novoShiftPayload = (shift, shiftId) => ({
  usuario_id: shift.usuario_id,
  titulo: 'Novo turno',
  mensagem: buildNovoShiftMessage(shift),
  tipo: 'novo_shift',
  shift_id: shiftId,
  status: 'pendente',
  criado_por_automacao: false,
  modelo_id: shift.modelo_id || '',
  ocorrencia_data: '',
});

/**
 * Cria a notificação de turno novo para o chatter, ignorando duplicidade.
 * A app não tem backend functions habilitado, então isso roda no cliente.
 */
export const notificarNovoShift = async (base44, shift, shiftId) => {
  if (!shift?.usuario_id || !shiftId) return null;

  const existentes = await base44.entities.Notificacao.filter(
    { shift_id: shiftId, tipo: 'novo_shift' },
    { limit: 1 }
  );
  const lista = Array.isArray(existentes) ? existentes : existentes?.items || [];
  if (lista.length > 0) return null;

  return base44.entities.Notificacao.create(novoShiftPayload(shift, shiftId));
};

export { weekdayOf };
