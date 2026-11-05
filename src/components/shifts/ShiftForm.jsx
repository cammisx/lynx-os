import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { notificarNovoShift } from '@/lib/notificacoes';
import GlassSelect from '@/components/GlassSelect';
import DateTimePicker, { formatDateKey } from '@/components/DateTimePicker';
import RepeatFields from '@/components/shifts/RepeatFields';
import { buildChatterNames } from '@/lib/chatterNames';

const labelStyle = {
  fontSize: 10,
  color: 'var(--c2)',
  opacity: 0.7,
};

const atHour = (date, hour) => {
  const base = new Date(date);
  base.setHours(hour, 0, 0, 0);
  return base;
};

export default function ShiftForm({ users, models, chatters, shift, defaultDate, onCancel, onSaved }) {
  const shiftModel = shift?.modelo_id ? models.find((item) => item.id === shift.modelo_id) : null;
  const archivedModel = shiftModel?.arquivada ? shiftModel : null;
  const activeModels = models.filter((model) => !model.arquivada);

  const [modeloId, setModeloId] = useState(archivedModel ? '' : shift?.modelo_id || '');
  const [usuarioId, setUsuarioId] = useState(shift?.usuario_id || '');
  const [inicio, setInicio] = useState(() =>
    shift?.inicio ? new Date(shift.inicio) : atHour(defaultDate || new Date(), 8)
  );
  const [fim, setFim] = useState(() =>
    shift?.fim ? new Date(shift.fim) : atHour(defaultDate || new Date(), 16)
  );
  const [dias, setDias] = useState(() =>
    Array.isArray(shift?.dias_semana) ? shift.dias_semana.map(Number) : []
  );
  const [repetirAte, setRepetirAte] = useState(() =>
    shift?.repetir_ate ? new Date(`${String(shift.repetir_ate).slice(0, 10)}T00:00:00`) : null
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const chatterNames = useMemo(() => buildChatterNames(chatters), [chatters]);

  const usersById = useMemo(() => {
    const map = {};
    users.forEach((user) => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  const selectedModel = activeModels.find((model) => model.id === modeloId) || null;
  const modelChatters = selectedModel?.chatters || [];

  const chatterOptions = useMemo(() => {
    const list = modelChatters.map((member) => {
      const user = usersById[member.usuario_id];
      const identificador = member.identificador || '';
      return {
        value: member.usuario_id,
        label: chatterNames[member.usuario_id] || user?.full_name || member.usuario_nome || 'Sem nome',
        prefix: identificador,
        hint: identificador ? '' : user?.email || '',
      };
    });

    if (usuarioId && usuarioId === shift?.usuario_id && !list.some((item) => item.value === usuarioId)) {
      const user = usersById[usuarioId];
      list.unshift({
        value: usuarioId,
        label: chatterNames[usuarioId] || user?.full_name || shift?.usuario_nome || 'Sem nome',
        prefix: '',
        hint: user?.email || '',
      });
    }

    return list;
  }, [modelChatters, usersById, chatterNames, usuarioId, shift]);

  const modelOptions = activeModels.map((model) => ({ value: model.id, label: model.nome }));

  const changeModelo = (id) => {
    setModeloId(id);
    const model = models.find((item) => item.id === id);
    const belongs = (model?.chatters || []).some((member) => member.usuario_id === usuarioId);
    if (!belongs) setUsuarioId('');
  };

  const toggleDia = (day) => {
    setDias((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const save = async () => {
    if (saving) return;
    if (!modeloId) {
      setError('Escolha uma modelo.');
      return;
    }
    if (!usuarioId) {
      setError('Selecione o chatter.');
      return;
    }
    if (!inicio || !fim) {
      setError('Informe o início e o fim do turno.');
      return;
    }
    if (fim.getTime() <= inicio.getTime()) {
      setError('O fim precisa ser depois do início.');
      return;
    }

    if (dias.length > 0 && repetirAte) {
      const limit = new Date(
        repetirAte.getFullYear(),
        repetirAte.getMonth(),
        repetirAte.getDate(),
        23,
        59,
        59
      );
      if (!(limit.getTime() > inicio.getTime())) {
        setError('A data de repetição precisa ser depois do início.');
        return;
      }
    }

    setError('');
    setSaving(true);
    const usuario = usersById[usuarioId];
    const modelo = models.find((item) => item.id === modeloId);
    const payload = {
      usuario_id: usuarioId,
      usuario_nome:
        chatterNames[usuarioId] || usuario?.full_name || shift?.usuario_nome || '',
      modelo_id: modeloId,
      modelo_nome: modelo?.nome || '',
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: shift?.status || 'agendado',
      dias_semana: [...dias].sort((a, b) => a - b),
      repetir_ate: dias.length > 0 && repetirAte ? formatDateKey(repetirAte) : null,
    };

    try {
      if (shift) {
        await base44.entities.Shift.update(shift.id, payload);
      } else {
        const created = await base44.entities.Shift.create(payload);
        if (created?.id) {
          // Avisa o chatter do turno novo sem travar o salvamento do formulário.
          notificarNovoShift(base44, payload, created.id).catch((error) =>
            console.warn('[notificarNovoShift]', error)
          );
        }
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--font-main)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Modelo</span>
        <GlassSelect
          value={modeloId}
          options={modelOptions}
          onChange={changeModelo}
          placeholder="Selecione…"
          emptyText="Nenhuma modelo disponível."
        />
        {archivedModel && !modeloId && (
          <span style={{ fontSize: 11, color: '#ff6b6b' }}>
            A modelo deste turno está arquivada, escolha outra
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Chatter</span>
        {!modeloId ? (
          <GlassSelect
            value=""
            options={[]}
            onChange={() => {}}
            placeholder="Escolha uma modelo primeiro"
            disabled
          />
        ) : modelChatters.length === 0 ? (
          <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.7 }}>
            Nenhum chatter atribuído a esta modelo. Atribua em Modelos.
          </span>
        ) : (
          <GlassSelect
            value={usuarioId}
            options={chatterOptions}
            onChange={setUsuarioId}
            placeholder="Selecione…"
            emptyText="Nenhum chatter atribuído a esta modelo."
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <DateTimePicker label="Início" value={inicio} onChange={setInicio} mode="datetime" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <DateTimePicker label="Fim" value={fim} onChange={setFim} mode="datetime" />
        </div>
      </div>

      <RepeatFields
        dias={dias}
        repetirAte={repetirAte}
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