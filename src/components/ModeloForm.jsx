import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import ChatterRow from '@/components/models/ChatterRow';

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  color: 'var(--c3)',
  fontSize: 12,
  padding: '8px 10px',
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

export default function ModeloForm({ users, model, onCancel, onSaved }) {
  const [nome, setNome] = useState(model?.nome || '');
  const [selected, setSelected] = useState(
    () => new Set((model?.chatters || []).map((chatter) => chatter.usuario_id))
  );
  const [saving, setSaving] = useState(false);
  const [ids, setIds] = useState(() =>
    Object.fromEntries(
      (model?.chatters || []).map((chatter) => [chatter.usuario_id, chatter.identificador || ''])
    )
  );
  const [errors, setErrors] = useState({});

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setIdentificador = (id, value) => {
    const digits = value.replace(/\D/g, '').slice(0, 2);
    setIds((prev) => ({ ...prev, [id]: digits }));
    setErrors((prev) => (prev[id] ? { ...prev, [id]: '' } : prev));
  };

  const save = async () => {
    const cleanName = nome.trim();
    if (!cleanName || saving) return;

    const chosen = users.filter((user) => selected.has(user.id));
    const nextErrors = {};
    const counts = {};

    chosen.forEach((user) => {
      const value = ids[user.id] || '';
      counts[value] = (counts[value] || 0) + 1;
      if (!/^\d{2}$/.test(value)) nextErrors[user.id] = 'Informe 2 dígitos';
    });
    chosen.forEach((user) => {
      const value = ids[user.id] || '';
      if (!nextErrors[user.id] && counts[value] > 1) {
        nextErrors[user.id] = 'ID repetido nesta modelo';
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const chatters = chosen.map((user) => ({
        usuario_id: user.id,
        usuario_nome: user.full_name || user.email || '',
        identificador: ids[user.id] || '',
      }));
      if (model) {
        await base44.entities.Modelo.update(model.id, { nome: cleanName, chatters });
      } else {
        await base44.entities.Modelo.create({ nome: cleanName, chatters });
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'var(--font-main)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.7 }}>Nome da modelo</span>
        <input
          style={inputStyle}
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Ex.: Modelo Aurora"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.7 }}>Chatters</span>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 190,
            overflowY: 'auto',
            border: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
            borderRadius: 8,
            padding: 6,
          }}
        >
          {users.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.6, padding: 4 }}>
              Nenhum usuário encontrado.
            </span>
          )}
          {users.map((user) => (
            <ChatterRow
              key={user.id}
              user={user}
              checked={selected.has(user.id)}
              identificador={ids[user.id] || ''}
              error={errors[user.id]}
              onToggle={() => toggle(user.id)}
              onIdentificadorChange={(value) => setIdentificador(user.id, value)}
            />
          ))}
        </div>
      </div>

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