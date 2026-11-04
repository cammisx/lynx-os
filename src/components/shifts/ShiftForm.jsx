import { useState } from 'react';
import { base44 } from '@/api/base44Client';

const controlStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  color: 'var(--c3)',
  fontSize: 12,
  padding: '7px 9px',
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

const labelStyle = {
  fontSize: 10,
  color: 'var(--c2)',
  opacity: 0.7,
};

const pad = (value) => String(value).padStart(2, '0');

const toInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const atHour = (date, hour) => {
  const base = new Date(date);
  base.setHours(hour, 0, 0, 0);
  return base;
};

const STATUS_OPTIONS = [
  { value: 'agendado', label: 'agendado' },
  { value: 'em_andamento', label: 'em andamento' },
  { value: 'concluido', label: 'concluído' },
  { value: 'cancelado', label: 'cancelado' },
];

export default function ShiftForm({ users, models, shift, defaultDate, onCancel, onSaved }) {
  const [usuarioId, setUsuarioId] = useState(shift?.usuario_id || '');
  const [modeloId, setModeloId] = useState(shift?.modelo_id || '');
  const [inicio, setInicio] = useState(() =>
    shift?.inicio ? toInput(shift.inicio) : toInput(atHour(defaultDate || new Date(), 8))
  );
  const [fim, setFim] = useState(() =>
    shift?.fim ? toInput(shift.fim) : toInput(atHour(defaultDate || new Date(), 16))
  );
  const [status, setStatus] = useState(shift?.status || 'agendado');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!usuarioId || !modeloId) {
      setError('Chatter e modelo são obrigatórios.');
      return;
    }
    if (!inicio || !fim) {
      setError('Informe o início e o fim do turno.');
      return;
    }
    const start = new Date(inicio);
    const end = new Date(fim);
    if (end.getTime() <= start.getTime()) {
      setError('O fim precisa ser depois do início.');
      return;
    }

    setError('');
    setSaving(true);
    const usuario = users.find((item) => item.id === usuarioId);
    const modelo = models.find((item) => item.id === modeloId);
    const payload = {
      usuario_id: usuarioId,
      usuario_nome: usuario?.full_name || usuario?.email || shift?.usuario_nome || '',
      modelo_id: modeloId,
      modelo_nome: modelo?.nome || '',
      inicio: start.toISOString(),
      fim: end.toISOString(),
      status,
    };

    try {
      if (shift) await base44.entities.Shift.update(shift.id, payload);
      else await base44.entities.Shift.create(payload);
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--font-main)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Chatter</span>
        <select
          style={controlStyle}
          value={usuarioId}
          onChange={(event) => setUsuarioId(event.target.value)}
        >
          <option value="">Selecione…</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name || user.email}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Modelo</span>
        <select
          style={controlStyle}
          value={modeloId}
          onChange={(event) => setModeloId(event.target.value)}
        >
          <option value="">Selecione…</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.nome}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
          <span style={labelStyle}>Início</span>
          <input
            type="datetime-local"
            style={controlStyle}
            value={inicio}
            onChange={(event) => setInicio(event.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
          <span style={labelStyle}>Fim</span>
          <input
            type="datetime-local"
            style={controlStyle}
            value={fim}
            onChange={(event) => setFim(event.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Status</span>
        <select
          style={controlStyle}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
        {error && <span style={{ fontSize: 11, color: '#ff6b6b' }}>{error}</span>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="md-btn" onClick={onCancel} style={cancelStyle}>
            Cancelar
          </button>
          <button
            type="button"
            className="md-primary"
            onClick={save}
            disabled={saving}
            style={primaryStyle}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const cancelStyle = {
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
  color: 'var(--c2)',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};

const primaryStyle = {
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};