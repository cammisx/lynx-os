import { useState } from 'react';
import { base44 } from '@/api/base44Client';

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

const labelStyle = { fontSize: 10, color: 'var(--c2)', opacity: 0.7 };

const cleanCommission = (value) => {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  const [int, ...rest] = normalized.split('.');
  if (rest.length === 0) return int.slice(0, 3);
  return `${int.slice(0, 3)}.${rest.join('').slice(0, 1)}`;
};

export default function ChatterForm({ user, chatter, onCancel, onSaved }) {
  const [nome, setNome] = useState(
    chatter?.nome_exibicao || user?.full_name || user?.email || ''
  );
  const [comissao, setComissao] = useState(
    chatter && chatter.comissao !== undefined && chatter.comissao !== null ? String(chatter.comissao) : ''
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    const cleanName = nome.trim();
    const parsed = Number(String(comissao).replace(',', '.'));

    if (!cleanName) {
      setError('Informe o nome de exibição.');
      return;
    }
    if (comissao === '' || Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      setError('A comissão precisa estar entre 0 e 100.');
      return;
    }

    setError('');
    setSaving(true);
    const payload = {
      usuario_id: user.id,
      usuario_email: user.email || '',
      nome_exibicao: cleanName,
      comissao: Math.round(parsed * 10) / 10,
      ativo: true,
    };

    try {
      if (chatter) await base44.entities.Chatter.update(chatter.id, payload);
      else await base44.entities.Chatter.create(payload);
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'var(--font-main)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c3)' }}>
          {user?.full_name || user?.email}
        </span>
        <span style={{ fontSize: 11, color: 'var(--c2)' }}>{user?.email}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelStyle}>Nome de exibição</span>
        <input
          style={inputStyle}
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Ex.: Ana"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelStyle}>Comissão (%)</span>
        <div style={{ position: 'relative' }}>
          <input
            style={{ ...inputStyle, paddingRight: 26 }}
            value={comissao}
            onChange={(event) => setComissao(cleanCommission(event.target.value))}
            inputMode="decimal"
            placeholder="0"
          />
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 11,
              color: 'var(--c1)',
              pointerEvents: 'none',
            }}
          >
            %
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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