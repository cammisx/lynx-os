import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ChatterRow from '@/components/models/ChatterRow';

// Menor centavo (01–99) livre na modelo, para o novo chatter já entrar válido.
const proximoLivre = (ocupados) => {
  const usados = new Set((ocupados || []).filter(Boolean));
  for (let numero = 1; numero <= 99; numero += 1) {
    const codigo = String(numero).padStart(2, '0');
    if (!usados.has(codigo)) return codigo;
  }
  return '';
};

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
  const [saveError, setSaveError] = useState('');
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
    const faltando = adminIds.filter((id) => !selected.has(id));
    if (faltando.length === 0) return;

    const proximo = new Set(selected);
    faltando.forEach((id) => proximo.add(id));
    setSelected(proximo);

    // Admin entra em todas as modelos já com um centavo livre.
    setIds((prev) => {
      const atual = { ...prev };
      const ocupados = [...proximo].map((id) => atual[id] || '');
      faltando.forEach((id) => {
        if (atual[id]) return;
        const livre = proximoLivre(ocupados);
        if (!livre) return;
        atual[id] = livre;
        ocupados.push(livre);
      });
      return atual;
    });
  }, [adminIds, model]);
  const [errors, setErrors] = useState({});
  const [nomeError, setNomeError] = useState('');

  const toggle = (id) => {
    if (adminIds.includes(id)) return;
    const estavaMarcado = selected.has(id);
    const proximo = new Set(selected);
    if (estavaMarcado) proximo.delete(id);
    else proximo.add(id);
    setSelected(proximo);

    // Quem entra agora ganha o próximo centavo livre (pode trocar depois).
    if (!estavaMarcado && !ids[id]) {
      const livre = proximoLivre([...proximo].map((chave) => ids[chave] || ''));
      if (livre) setIds((prev) => ({ ...prev, [id]: livre }));
    }
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
    setSaveError('');
    const members = chosen.map((chatter) => ({
      usuario_id: chatter.usuario_id,
      usuario_nome: chatter.nome,
      identificador: ids[chatter.usuario_id] || '',
    }));
    const percentual = Math.min(100, Math.max(0, Number(comissaoAgencia.replace(',', '.')) || 0));
    const dados = { nome: cleanName, chatters: members, comissao_agencia: percentual };

    try {
      // O backend grava com service role; sem ele, o RLS deixa o formulário
      // salvar sem nada mudar na entidade.
      let gravou = false;
      try {
        const resposta = await base44.functions.invoke('salvarModelo', {
          ...dados,
          id: model?.id,
        });
        const retorno = resposta?.data;
        if (retorno?.ok) gravou = true;
        else if (retorno?.error) {
          setSaveError(retorno.error);
          return;
        }
      } catch (falha) {
        console.warn('[Modelos] gravação pelo backend falhou, tentando direto', falha?.message || falha);
      }

      if (!gravou) {
        if (model) await base44.entities.Modelo.update(model.id, dados);
        else await base44.entities.Modelo.create(dados);
      }

      await onSaved();
    } catch (falha) {
      setSaveError(falha?.message || 'Não consegui salvar a modelo.');
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

      {saveError && (
        <span style={{ fontSize: 10.5, color: '#ff6b6b', lineHeight: 1.5 }}>{saveError}</span>
      )}

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