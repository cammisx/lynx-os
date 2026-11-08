import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { notificarNovoShift } from '@/lib/notificacoes';
import GlassSelect from '@/components/GlassSelect';
import DateTimePicker, { formatDateKey } from '@/components/DateTimePicker';
import RepeatFields from '@/components/shifts/RepeatFields';
import { buildChatterNames } from '@/lib/chatterNames';
import { useAuth } from '@/lib/AuthContext';
import { ehAdmin } from '@/lib/chat';
import { conflitosDeTurno, descreverConflito } from '@/lib/vagas';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

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

export default function ShiftForm({
  users,
  models,
  chatters,
  shift,
  defaultDate,
  defaults = null,
  onCancel,
  onSaved,
}) {
  const shiftModel = shift?.modelo_id ? models.find((item) => item.id === shift.modelo_id) : null;
  const archivedModel = shiftModel?.arquivada ? shiftModel : null;
  const activeModels = models.filter((model) => !model.arquivada);

  const [modeloId, setModeloId] = useState(
    archivedModel ? '' : shift?.modelo_id || defaults?.modeloId || ''
  );
  const [usuarioId, setUsuarioId] = useState(shift?.usuario_id || '');
  const [inicio, setInicio] = useState(() => {
    if (shift?.inicio) return new Date(shift.inicio);
    if (defaults?.inicio) return new Date(defaults.inicio);
    return atHour(defaultDate || new Date(), 8);
  });
  const [fim, setFim] = useState(() => {
    if (shift?.fim) return new Date(shift.fim);
    if (defaults?.inicio) return new Date(new Date(defaults.inicio).getTime() + 8 * 3600000);
    return atHour(defaultDate || new Date(), 16);
  });
  const [dias, setDias] = useState(() =>
    Array.isArray(shift?.dias_semana) ? shift.dias_semana.map(Number) : []
  );
  const [repetirAte, setRepetirAte] = useState(() =>
    shift?.repetir_ate ? new Date(`${String(shift.repetir_ate).slice(0, 10)}T00:00:00`) : null
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  /* Choques de agenda encontrados no último salvamento. Só o admin chega aqui:
     para o chatter o aviso é bloqueio, sem botão de seguir. */
  const [choques, setChoques] = useState([]);
  const { user } = useAuth();
  const souAdmin = ehAdmin(user);

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
        label:
          user?.nome_exibicao ||
          chatterNames[member.usuario_id] ||
          user?.full_name ||
          member.usuario_nome ||
          'Sem nome',
        prefix: identificador,
        hint: identificador ? '' : user?.email || '',
      };
    });

    if (usuarioId && usuarioId === shift?.usuario_id && !list.some((item) => item.value === usuarioId)) {
      const user = usersById[usuarioId];
      list.unshift({
        value: usuarioId,
        label:
          user?.nome_exibicao ||
          chatterNames[usuarioId] ||
          user?.full_name ||
          shift?.usuario_nome ||
          'Sem nome',
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

  const save = async (ciente = false) => {
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
    setChoques([]);
    setSaving(true);
    const usuario = usersById[usuarioId];
    const modelo = models.find((item) => item.id === modeloId);
    const payload = {
      usuario_id: usuarioId,
      usuario_nome:
        usuario?.nome_exibicao ||
        chatterNames[usuarioId] ||
        usuario?.full_name ||
        shift?.usuario_nome ||
        '',
      modelo_id: modeloId,
      modelo_nome: modelo?.nome || '',
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: shift?.status || 'agendado',
      dias_semana: [...dias].sort((a, b) => a - b),
      repetir_ate: dias.length > 0 && repetirAte ? formatDateKey(repetirAte) : null,
      aceite: shift?.aceite || 'pendente',
    };

    // Mudou modelo, chatter, horário ou repetição? O turno precisa ser
    // confirmado de novo por quem vai cumpri-lo.
    const mudouRegra =
      shift &&
      (shift.usuario_id !== payload.usuario_id ||
        shift.modelo_id !== payload.modelo_id ||
        new Date(shift.inicio).getTime() !== new Date(payload.inicio).getTime() ||
        new Date(shift.fim).getTime() !== new Date(payload.fim).getTime() ||
        JSON.stringify(shift.dias_semana || []) !== JSON.stringify(payload.dias_semana || []) ||
        String(shift.repetir_ate || '') !== String(payload.repetir_ate || ''));

    /* Uma modelo, um chatter por horário. O choque é sempre comparado dentro
       da mesma modelo: o mesmo chatter pode cobrir duas modelos ao mesmo tempo. */
    let agenda = [];
    try {
      agenda = asList(
        await base44.entities.Shift.filter({ modelo_id: modeloId }, '-inicio', 500)
      );
    } catch (falha) {
      console.warn('[ShiftForm] agenda da modelo', falha);
    }
    const conflitos = conflitosDeTurno({
      candidato: payload,
      existentes: agenda,
      ignorarId: shift?.id || '',
    });

    if (conflitos.length && !ciente) {
      setSaving(false);
      if (!souAdmin) {
        setError(
          `Esse horário já tem gente escalada nesta modelo: ${descreverConflito(conflitos[0])}.`
        );
        return;
      }
      setChoques(conflitos);
      return;
    }

    if (conflitos.length) {
      payload.sobreposicao = {
        consentida: true,
        por: user?.id || '',
        nome: user?.full_name || user?.email || '',
        em: new Date().toISOString(),
        turnos: conflitos.slice(0, 30).map((choque) => ({
          shift_id: choque.shiftId,
          usuario_nome: choque.usuarioNome,
          inicio: new Date(choque.inicio).toISOString(),
          fim: new Date(choque.fim).toISOString(),
        })),
      };
    }

    try {
      if (shift) {
        const patch = mudouRegra
          ? { ...payload, aceite: 'pendente', aceite_em: null, motivo_recusa: '' }
          : payload;
        await base44.entities.Shift.update(shift.id, patch);
        if (mudouRegra) {
          notificarNovoShift(base44, patch, shift.id, { force: true }).catch((error) =>
            console.warn('[notificarNovoShift]', error)
          );
        }
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
          <span style={{ fontSize: 11, color: 'var(--erro)' }}>
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
        {choques.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '9px 10px',
              borderRadius: 9,
              border: '1px solid color-mix(in srgb, var(--erro) 45%, transparent)',
              background: 'color-mix(in srgb, var(--erro) 12%, transparent)',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--erro)' }}>
              Esta modelo já tem chatter nesse horário
            </span>
            {choques.slice(0, 3).map((choque) => (
              <span
                key={`${choque.shiftId}-${choque.inicio}`}
                style={{ fontSize: 10.5, color: 'var(--c3)', lineHeight: 1.4 }}
              >
                {descreverConflito(choque)}
              </span>
            ))}
            {choques.length > 3 && (
              <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.75 }}>
                e mais {choques.length - 3} horário(s)
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.85, lineHeight: 1.4 }}>
              Salvar assim mesmo fica registrado no turno como sobreposição consentida.
            </span>
          </div>
        )}
        {error && <span style={{ fontSize: 11, color: 'var(--erro)' }}>{error}</span>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="md-btn" onClick={onCancel} style={cancelStyle}>
            Cancelar
          </button>
          <button
            type="button"
            className="md-primary"
            onClick={() => save(choques.length > 0)}
            disabled={saving}
            style={primaryStyle}
          >
            {saving ? 'Salvando…' : choques.length ? 'Ciente, salvar assim' : 'Salvar'}
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