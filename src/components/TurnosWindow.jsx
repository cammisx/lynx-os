import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import ShiftForm from '@/components/shifts/ShiftForm';
import { emitShiftsChanged } from '@/lib/desktopEvents';

const DAY_MS = 86400000;

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const shortDate = (date) =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const formatMoment = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day} ${time}`;
};

const STATUS_COLOR = {
  agendado: 'var(--c1)',
  em_andamento: 'var(--c16)',
  concluido: 'var(--c2)',
  cancelado: '#ff6b6b',
};

const STATUS_LABEL = {
  agendado: 'agendado',
  em_andamento: 'em andamento',
  concluido: 'concluído',
  cancelado: 'cancelado',
};

const selectStyle = {
  height: 26,
  padding: '0 8px',
  borderRadius: 7,
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  color: 'var(--c3)',
  fontSize: 11,
  fontFamily: 'var(--font-main)',
  outline: 'none',
  cursor: 'pointer',
};

const navButton = {
  width: 24,
  height: 24,
  padding: 0,
  borderRadius: 6,
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  color: 'var(--c2)',
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const rowButton = {
  height: 24,
  padding: '0 8px',
  borderRadius: 6,
  border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
  color: 'var(--c2)',
  fontSize: 9,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
  transition: 'background-color 150ms ease',
};

const weekLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--c3)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

export default function TurnosWindow({ onClose }) {
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [modelFilter, setModelFilter] = useState('todas');
  const [shifts, setShifts] = useState([]);
  const [models, setModels] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const weekStartMs = anchor.getTime();

  const loadMeta = async () => {
    const [modelResult, userResult] = await Promise.all([
      base44.entities.Modelo.list(),
      base44.entities.User.list(),
    ]);
    setModels(asList(modelResult));
    setUsers(asList(userResult));
  };

  const loadShifts = async () => {
    const weekEnd = new Date(weekStartMs + 7 * DAY_MS);
    const query = {
      inicio: { $lt: weekEnd.toISOString() },
      fim: { $gt: new Date(weekStartMs).toISOString() },
    };
    if (modelFilter !== 'todas') query.modelo_id = modelFilter;
    const result = await base44.entities.Shift.filter(query, { sort: 'inicio', limit: 200 });
    setShifts(asList(result));
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadShifts();
  }, [weekStartMs, modelFilter]);

  const afterChange = async () => {
    setForm(null);
    await loadShifts();
    emitShiftsChanged();
  };

  const removeShift = async () => {
    if (!pendingDelete) return;
    await base44.entities.Shift.delete(pendingDelete.id);
    setPendingDelete(null);
    await loadShifts();
    emitShiftsChanged();
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const range = `${shortDate(days[0])} – ${shortDate(days[6])}`;

  return (
    <>
      <Window title="🗓️ Turnos" onClose={onClose} width={720} height={520}>
        {form ? (
          <ShiftForm
            users={users}
            models={models}
            shift={form === 'new' ? null : form}
            defaultDate={anchor}
            onCancel={() => setForm(null)}
            onSaved={afterChange}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                paddingBottom: 10,
                borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
              }}
            >
              <select
                style={selectStyle}
                value={modelFilter}
                onChange={(event) => setModelFilter(event.target.value)}
                aria-label="Filtrar por modelo"
              >
                <option value="todas">Todas</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.nome}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="md-btn"
                style={navButton}
                aria-label="Semana anterior"
                onClick={() => setAnchor((prev) => addDays(prev, -7))}
              >
                ‹
              </button>
              <span style={weekLabelStyle}>{range}</span>
              <button
                type="button"
                className="md-btn"
                style={navButton}
                aria-label="Próxima semana"
                onClick={() => setAnchor((prev) => addDays(prev, 7))}
              >
                ›
              </button>
              <button
                type="button"
                className="md-btn"
                style={{ ...navButton, width: 'auto', padding: '0 8px' }}
                onClick={() => setAnchor(startOfDay(new Date()))}
              >
                Hoje
              </button>

              <button
                type="button"
                className="md-primary"
                onClick={() => setForm('new')}
                style={{
                  marginLeft: 'auto',
                  height: 26,
                  padding: '0 12px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-main)',
                  cursor: 'pointer',
                }}
              >
                + Novo turno
              </button>
            </div>

            {shifts.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.6 }}>
                Nenhum turno nesta semana.
              </span>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shifts.map((shift) => {
                const color = STATUS_COLOR[shift.status] || 'var(--c2)';
                return (
                  <div
                    key={shift.id}
                    className="md-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--c3)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {shift.usuario_nome || 'Sem chatter'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--c2)' }}>
                        {shift.modelo_nome || 'Sem modelo'} · {formatMoment(shift.inicio)} –{' '}
                        {formatMoment(shift.fim)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color,
                          backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
                          borderRadius: 999,
                          padding: '2px 8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {STATUS_LABEL[shift.status] || shift.status}
                      </span>
                      <button
                        type="button"
                        className="md-btn"
                        style={rowButton}
                        onClick={() => setForm(shift)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="md-btn"
                        style={rowButton}
                        onClick={() => setPendingDelete(shift)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Window>

      {pendingDelete &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                width: 340,
                background: 'color-mix(in srgb, var(--c8) 72%, transparent)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                borderRadius: 12,
                boxShadow: '0 16px 56px rgba(0,0,0,0.5)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                fontFamily: 'var(--font-main)',
              }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--c3)' }}>
                Excluir o turno de {pendingDelete.usuario_nome || 'sem chatter'}?
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="md-btn"
                  onClick={() => setPendingDelete(null)}
                  style={cancelStyle}
                >
                  Cancelar
                </button>
                <button type="button" onClick={removeShift} style={dangerStyle}>
                  Excluir
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
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

const dangerStyle = {
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  border: '1px solid #ff6b6b',
  background: 'transparent',
  color: '#ff6b6b',
  fontSize: 11,
  fontWeight: 700,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};