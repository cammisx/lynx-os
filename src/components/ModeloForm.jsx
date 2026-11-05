import { useEffect, useMemo, useState } from 'react';
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

export default function ModeloForm({ chatters, model, onCancel, onSaved }) {
  const [nome, setNome] = useState(model?.nome || '');
  const [selected, setSelected] = useState(
    () => new Set((model?.chatters || []).map((chatter) => chatter.usuario_id))
  );
  const [saving, setSaving] = useState(false);
  const [comissaoAgencia, setComissaoAgencia] = useState(
    model?.comissao_agencia === null || model?.comissao_agencia === undefined
      ? '50'
      : String(model.comissao_agencia)
  );
  const [ids, setIds] = useState(() =>
    Object.fromEntries(
      (model?.chatters || []).map((chatter) => [chatter.usuario_id, chatter.identificador || ''])
    )
  );

  // Admin é chatter de todas as modelos: entra marcado e não pode ser desmarcado.
  const adminIds = useMemo(
    () => chatters.filter((chatter) => chatter.isAdmin).map((chatter) => chatter.usuario_id),
    [chatters]
  );

  useEffect(() => {
    if (model || adminIds.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      let changed = false;
      adminIds.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [adminIds, model]);
  const [errors, setErrors] = useState({});
  const [nomeError, setNomeError] = useState('');

  const toggle = (id) => {
    if (adminIds.includes(id)) return;
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
    if (saving) return;
    const cleanName = nome.trim();
    if (!cleanName) {
      setNomeError('Informe o nome da modelo.');
      return;
    }
    setNomeError('');

    const chosen = chatters.filter((chatter) => selected.has(chatter.usuario_id));
    const nextErrors = {};
    const counts = {};

    chosen.forEach((chatter) => {
      const value = ids[chatter.usuario_id] || '';
      counts[value] = (counts[value] || 0) + 1;
      if (!/^\d{2}$/.test(value)) nextErrors[chatter.usuario_id] = 'Informe 2 dígitos';
    });
    chosen.forEach((chatter) => {
      const value = ids[chatter.usuario_id] || '';
      if (!nextErrors[chatter.usuario_id] && counts[value] > 1) {
        nextErrors[chatter.usuario_id] = 'ID repetido nesta modelo';
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const members = chosen.map((chatter) => ({
        usuario_id: chatter.usuario_id,
        usuario_nome: chatter.nome,
        identificador: ids[chatter.usuario_id] || '',
      }));
      const percentual = Math.min(100, Math.max(0, Number(comissaoAgencia.replace(',', '.')) || 0));
      if (model) {
        await base44.entities.Modelo.update(model.id, {
          nome: cleanName,
          chatters: members,
          comissao_agencia: percentual,
        });
      } else {
        await base44.entities.Modelo.create({
          nome: cleanName,
          chatters: members,
          comissao_agencia: percentual,
        });
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
        {nomeError && <span style={{ fontSize: 10, color: '#ff6b6b' }}>{nomeError}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.7 }}>
          Comissão da agência sobre as vendas (% do líquido)
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            style={{ ...inputStyle, width: 86 }}
            value={comissaoAgencia}
            onChange={(event) => setComissaoAgencia(event.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="50"
            inputMode="numeric"
          />
          <span style={{ fontSize: 10.5, color: 'var(--c2)', lineHeight: 1.5 }}>
            Padrão 50%. A comissão do chatter sai de dentro dessa parte.
          </span>
        </div>
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
          {chatters.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.6, padding: 4 }}>
              Nenhum chatter cadastrado ainda.
            </span>
          )}
          {chatters.map((chatter) => (
            <ChatterRow
              key={chatter.usuario_id}
              nome={chatter.nome}
              checked={chatter.isAdmin || selected.has(chatter.usuario_id)}
              locked={chatter.isAdmin}
              identificador={ids[chatter.usuario_id] || ''}
              error={errors[chatter.usuario_id]}
              onToggle={() => toggle(chatter.usuario_id)}
              onIdentificadorChange={(value) => setIdentificador(chatter.usuario_id, value)}
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