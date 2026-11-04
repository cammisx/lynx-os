import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import RepeatFields from '@/components/shifts/RepeatFields';

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

export default function ShiftForm({ users, models, shift, defaultDate, onCancel, onSaved }) {
  const [usuarioId, setUsuarioId] = useState(shift?.usuario_id || '');
  const [modeloId, setModeloId] = useState(shift?.modelo_id || '');
  const [inicio, setInicio] = useState(() =>
    shift?.inicio ? toInput(shift.inicio) : toInput(atHour(defaultDate || new Date(), 8))
  );
  const [fim, setFim] = useState(() =>
    shift?.fim ? toInput(shift.fim) : toInput(atHour(defaultDate || new Date(), 16))
  );
  const [repeticao, setRepeticao] = useState(() => {
    if (!shift) return 'semanal';
    if (shift.repeticao === 'quinzenal') return 'quinzenal';
    if (shift.repeticao === 'semanal') return 'semanal';
    return 'unica';
  });
  const [dias, setDias] = useState(() => {
    if (Array.isArray(shift?.dias_semana) && shift.dias_semana.length > 0) {
      return shift.dias_semana.map(Number);
    }
    const base = inicio ? new Date(inicio) : new Date();
    return Number.isNaN(base.getTime()) ? [] : [base.getDay()];
  });
  const [repetirAte, setRepetirAte] = useState(() =>
    shift?.repetir_ate ? String(shift.repetir_ate).slice(0, 10) : ''
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleDia = (day) => {
    setDias((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const changeInicio = (value) => {
    const previousDay = inicio ? new Date(inicio).getDay() : null;
    setInicio(value);
    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return;
    const nextDay = next.getDay();
    setDias((prev) => (prev.length === 1 && prev[0] === previousDay ? [nextDay] : prev));
  };

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

    const active = repeticao !== 'unica';
    if (active) {
      if (dias.length === 0) {
        setError('Marque pelo menos um dia');
        return;
      }
      if (repetirAte && !(new Date(`${repetirAte}T23:59:59`).getTime() > start.getTime())) {
        setError('A data de repetição precisa ser depois do início.');
        return;
      }
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
      status: shift?.status || 'agendado',
      repeticao: active ? repeticao : 'nenhuma',
      dias_semana: [...dias].sort((a, b) => a - b),
      repetir_ate: active && repetirAte ? repetirAte : null,
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
            onChange={(event) => changeInicio(event.target.value)}
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

      <RepeatFields
        repeticao={repeticao}
        dias={dias}
        repetirAte={repetirAte}
        onRepeticaoChange={setRepeticao}
        onToggleDia={toggleDia}
        onRepetirAteChange={setRepetirAte}
      />

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