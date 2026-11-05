import { useEffect, useMemo, useState } from 'react';
import Window from '@/components/Window';
import { CheckIcon, CloseIcon, PencilIcon, PlusIcon, TrashIcon, UsersIcon } from '@/components/icons';
import usePlaybooks from '@/hooks/usePlaybooks';
import { TIPO_EMPRESA, podeEditarPlaybook } from '@/lib/playbooks';
import { useAuth } from '@/lib/AuthContext';

const escuro = (valor) =>
  `color-mix(in srgb, var(--c2) ${valor}%, transparent)`;

const dourado = (valor) =>
  `color-mix(in srgb, var(--c1) ${valor}%, transparent)`;

const botaoBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 8,
  border: `1px solid ${dourado(30)}`,
  background: dourado(10),
  color: 'var(--c1)',
  fontFamily: 'var(--font-main)',
  fontSize: 10.5,
  letterSpacing: '0.04em',
  cursor: 'pointer',
};

/** Leitura das diretrizes, seção por seção. */
function Leitura({ playbook }) {
  const secoes = (playbook?.secoes || []).filter((secao) => secao?.titulo || secao?.texto);
  if (!secoes.length) {
    return (
      <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--c2)', fontSize: 11 }}>
        Este playbook ainda está em branco.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {secoes.map((secao) => (
        <div key={secao.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              letterSpacing: '0.06em',
              color: 'var(--c1)',
            }}
          >
            {secao.titulo || 'Sem título'}
          </span>
          <span
            style={{
              fontSize: 11.5,
              lineHeight: 1.55,
              color: 'var(--c3)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {secao.texto || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Edição: só o admin chega aqui. */
function Edicao({ playbook, onSalvar, onCancelar, salvando }) {
  const [secoes, setSecoes] = useState(() =>
    (playbook.secoes || []).map((secao, indice) => ({ ...secao, id: secao.id || `s${indice + 1}` }))
  );
  const [resumo, setResumo] = useState(playbook.resumo || '');

  const mudar = (id, campo, valor) =>
    setSecoes((anterior) => anterior.map((secao) => (secao.id === id ? { ...secao, [campo]: valor } : secao)));

  const adicionar = () =>
    setSecoes((anterior) => [
      ...anterior,
      { id: `n${Date.now()}`, titulo: '', texto: '' },
    ]);

  const remover = (id) => setSecoes((anterior) => anterior.filter((secao) => secao.id !== id));

  const subir = (indice) => {
    if (indice <= 0) return;
    setSecoes((anterior) => {
      const copia = [...anterior];
      [copia[indice - 1], copia[indice]] = [copia[indice], copia[indice - 1]];
      return copia;
    });
  };

  const campo = {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 7,
    border: `1px solid ${escuro(20)}`,
    background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
    color: 'var(--c3)',
    fontFamily: 'var(--font-main)',
    fontSize: 11,
    outline: 'none',
    resize: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.85 }}>Resumo</span>
        <input
          value={resumo}
          onChange={(evento) => setResumo(evento.target.value)}
          placeholder="Para que serve este playbook"
          style={campo}
        />
      </div>

      {secoes.map((secao, indice) => (
        <div
          key={secao.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            padding: 9,
            borderRadius: 9,
            border: `1px solid ${escuro(14)}`,
            background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              value={secao.titulo}
              onChange={(evento) => mudar(secao.id, 'titulo', evento.target.value)}
              placeholder="Título da seção"
              style={{ ...campo, flex: 1, color: 'var(--c1)', fontWeight: 600 }}
            />
            <button
              type="button"
              onClick={() => subir(indice)}
              aria-label="Subir seção"
              disabled={indice === 0}
              style={{
                ...botaoBase,
                padding: '4px 6px',
                opacity: indice === 0 ? 0.35 : 0.9,
                cursor: indice === 0 ? 'default' : 'pointer',
              }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => remover(secao.id)}
              aria-label="Remover seção"
              style={{ ...botaoBase, padding: '4px 6px', color: 'var(--c6)' }}
            >
              <TrashIcon size={11} />
            </button>
          </div>
          <textarea
            value={secao.texto}
            onChange={(evento) => mudar(secao.id, 'texto', evento.target.value)}
            placeholder="Escreva a diretriz"
            rows={3}
            style={{ ...campo, lineHeight: 1.5 }}
          />
        </div>
      ))}

      <button type="button" onClick={adicionar} style={{ ...botaoBase, alignSelf: 'flex-start' }}>
        <PlusIcon size={11} /> Nova seção
      </button>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancelar}
          style={{ ...botaoBase, border: `1px solid ${escuro(20)}`, background: escuro(8), color: 'var(--c2)' }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSalvar({ secoes, resumo })}
          disabled={salvando}
          style={{ ...botaoBase, opacity: salvando ? 0.6 : 1 }}
        >
          <CheckIcon size={11} /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

export default function PlaybookWindow({ onClose }) {
  const { user } = useAuth();
  const { playbooks, carregando, erro, salvar, recarregar, nomeDe } = usePlaybooks();
  const podeEditar = podeEditarPlaybook(user);
  const [ativoId, setAtivoId] = useState(null);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!playbooks.length) {
      setAtivoId(null);
      return;
    }
    if (!playbooks.some((item) => item.id === ativoId)) setAtivoId(playbooks[0].id);
  }, [playbooks, ativoId]);

  const ativo = useMemo(
    () => playbooks.find((item) => item.id === ativoId) || null,
    [playbooks, ativoId]
  );

  return (
    <Window title="Playbook" icon={UsersIcon} onClose={onClose} width={760} height={540}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0, gap: 0 }}>
        {/* Lista de playbooks: empresa primeiro, depois as modelos. */}
        <div
          className="glass-scroll"
          style={{
            width: 196,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '2px 10px 10px 2px',
            overflowY: 'auto',
            borderRight: `1px solid ${escuro(14)}`,
          }}
        >
          {carregando && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.7 }}>Carregando…</span>
          )}

          {!carregando && !playbooks.length && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.5 }}>
              Nenhum playbook liberado para você ainda.
            </span>
          )}

          {playbooks.map((playbook) => {
            const escolhido = playbook.id === ativoId;
            return (
              <button
                key={playbook.id}
                type="button"
                onClick={() => {
                  setAtivoId(playbook.id);
                  setEditando(false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 1,
                  width: '100%',
                  padding: '7px 9px',
                  borderRadius: 8,
                  textAlign: 'left',
                  border: `1px solid ${escolhido ? dourado(50) : escuro(12)}`,
                  background: escolhido ? dourado(12) : 'color-mix(in srgb, var(--c8) 40%, transparent)',
                  color: escolhido ? 'var(--c1)' : 'var(--c3)',
                  fontFamily: 'var(--font-main)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 10.5, fontWeight: escolhido ? 700 : 500 }}>
                  {nomeDe(playbook)}
                </span>
                <span style={{ fontSize: 8.5, opacity: 0.7, letterSpacing: '0.05em' }}>
                  {playbook.tipo === TIPO_EMPRESA ? 'AGÊNCIA' : 'MODELO'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '2px 2px 2px 14px' }}>
          {erro && (
            <span style={{ fontSize: 10.5, color: 'var(--c6)', marginBottom: 8 }}>{erro}</span>
          )}

          {ativo ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-display)',
                      fontSize: 13,
                      letterSpacing: '0.05em',
                      color: 'var(--c1)',
                    }}
                  >
                    {nomeDe(ativo).toUpperCase()}
                  </span>
                  <span style={{ display: 'block', fontSize: 9, color: 'var(--c2)', opacity: 0.8 }}>
                    {ativo.resumo || 'Diretrizes'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={recarregar}
                  aria-label="Recarregar playbooks"
                  style={{ ...botaoBase, padding: '5px 8px', color: 'var(--c2)', border: `1px solid ${escuro(18)}`, background: escuro(6) }}
                >
                  Atualizar
                </button>
                {podeEditar && !editando && (
                  <button
                    type="button"
                    onClick={() => setEditando(true)}
                    aria-label="Editar playbook"
                    style={botaoBase}
                  >
                    <PencilIcon size={11} /> Editar
                  </button>
                )}
                {editando && (
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    aria-label="Sair da edição"
                    style={{ ...botaoBase, padding: '5px 8px', color: 'var(--c2)', border: `1px solid ${escuro(18)}`, background: escuro(6) }}
                  >
                    <CloseIcon size={11} />
                  </button>
                )}
              </div>

              <div className="glass-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 6 }}>
                {editando ? (
                  <Edicao
                    playbook={ativo}
                    salvando={salvando}
                    onCancelar={() => setEditando(false)}
                    onSalvar={async (dados) => {
                      setSalvando(true);
                      const ok = await salvar(ativo, dados);
                      setSalvando(false);
                      if (ok) setEditando(false);
                    }}
                  />
                ) : (
                  <Leitura playbook={ativo} />
                )}
              </div>
            </>
          ) : (
            !carregando && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c2)',
                  fontSize: 11,
                  textAlign: 'center',
                  padding: 20,
                  lineHeight: 1.6,
                }}
              >
                Selecione um playbook à esquerda.
              </div>
            )
          )}
        </div>
      </div>
    </Window>
  );
}
