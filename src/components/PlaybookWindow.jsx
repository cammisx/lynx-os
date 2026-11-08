import { useEffect, useMemo, useRef, useState } from 'react';
import Window from '@/components/Window';
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from '@/components/icons';
import usePlaybooks from '@/hooks/usePlaybooks';
import {
  TIPO_EMPRESA,
  itensVisiveis,
  pendenciasDaSecao,
  podeEditarPlaybook,
} from '@/lib/playbooks';
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

const estiloPergunta = {
  fontSize: 10,
  lineHeight: 1.4,
  color: 'var(--c1)',
  letterSpacing: '0.02em',
  opacity: 0.95,
};

const estiloResposta = {
  fontSize: 11.5,
  lineHeight: 1.55,
  color: 'var(--c3)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

/** Copia com a área de transferência moderna e, se ela não existir, no antigo. */
const copiarTexto = async (texto) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (falha) {
    /* segue para o plano B */
  }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch (falha) {
    return false;
  }
};

/** Uma pergunta com a resposta. Só ganha botão de copiar se a pergunta pedir. */
function ItemLeitura({ item }) {
  const [copiado, setCopiado] = useState(false);
  const relogio = useRef(null);

  useEffect(() => () => clearTimeout(relogio.current), []);

  const copiar = async () => {
    const ok = await copiarTexto(item.resposta);
    if (!ok) return;
    setCopiado(true);
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setCopiado(false), 1600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {item.pergunta ? <span style={estiloPergunta}>{item.pergunta}</span> : null}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ ...estiloResposta, flex: 1, minWidth: 0 }}>{item.resposta}</span>
        {item.copiar ? (
          <button
            type="button"
            onClick={copiar}
            title="Copiar resposta"
            style={{
              ...botaoBase,
              flexShrink: 0,
              padding: '3px 7px',
              fontSize: 9.5,
              gap: 4,
              color: copiado ? 'var(--ok)' : 'var(--c1)',
              border: `1px solid ${copiado ? 'color-mix(in srgb, var(--ok) 45%, transparent)' : dourado(28)}`,
              background: copiado
                ? 'color-mix(in srgb, var(--ok) 14%, transparent)'
                : dourado(8),
            }}
          >
            {copiado ? <CheckIcon size={10} /> : <CopyIcon size={10} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Leitura das diretrizes: seção por seção, pergunta por pergunta. */
function Leitura({ playbook }) {
  const secoes = (playbook?.secoes || [])
    .map((secao) => ({
      ...secao,
      itens: itensVisiveis(secao),
      texto: String(secao?.texto || ''),
    }))
    .filter((secao) => secao.itens.length || secao.texto.trim());

  if (!secoes.length) {
    return (
      <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--c2)', fontSize: 11, lineHeight: 1.6 }}>
        Este playbook ainda está em branco.
        <br />
        As perguntas aparecem aqui conforme forem respondidas.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {secoes.map((secao, indice) => (
        <div key={secao.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 11.5,
              letterSpacing: '0.06em',
              color: 'var(--c1)',
              paddingBottom: 5,
              borderBottom: `1px solid ${dourado(18)}`,
            }}
          >
            {secao.titulo || `Seção ${indice + 1}`}
          </span>

          {secao.texto.trim() ? <span style={estiloResposta}>{secao.texto}</span> : null}

          {secao.itens.map((item) => (
            <ItemLeitura key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Edição: só o admin chega aqui. */
function Edicao({ playbook, onSalvar, onCancelar, salvando }) {
  const [secoes, setSecoes] = useState(() =>
    (playbook.secoes || []).map((secao, indice) => ({
      id: secao.id || `s${indice + 1}`,
      titulo: secao.titulo || '',
      texto: secao.texto || '',
      itens: (secao.itens || []).map((item, ordem) => ({
        id: item.id || `s${indice + 1}q${ordem + 1}`,
        pergunta: item.pergunta || '',
        resposta: item.resposta || '',
        copiar: Boolean(item.copiar),
      })),
    }))
  );
  const [resumo, setResumo] = useState(playbook.resumo || '');

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

  const mudarSecao = (id, campoNome, valor) =>
    setSecoes((anterior) =>
      anterior.map((secao) => (secao.id === id ? { ...secao, [campoNome]: valor } : secao))
    );

  const adicionarSecao = () =>
    setSecoes((anterior) => [
      ...anterior,
      { id: `n${Date.now()}`, titulo: '', texto: '', itens: [] },
    ]);

  const removerSecao = (id) => setSecoes((anterior) => anterior.filter((secao) => secao.id !== id));

  const moverSecao = (indice, passo) => {
    setSecoes((anterior) => {
      const destino = indice + passo;
      if (destino < 0 || destino >= anterior.length) return anterior;
      const copia = [...anterior];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  };

  const mudarItem = (secaoId, itemId, campoNome, valor) =>
    setSecoes((anterior) =>
      anterior.map((secao) =>
        secao.id === secaoId
          ? {
              ...secao,
              itens: secao.itens.map((item) =>
                item.id === itemId ? { ...item, [campoNome]: valor } : item
              ),
            }
          : secao
      )
    );

  const adicionarItem = (secaoId) =>
    setSecoes((anterior) =>
      anterior.map((secao) =>
        secao.id === secaoId
          ? {
              ...secao,
              itens: [
                ...secao.itens,
                { id: `n${Date.now()}`, pergunta: '', resposta: '', copiar: false },
              ],
            }
          : secao
      )
    );

  const removerItem = (secaoId, itemId) =>
    setSecoes((anterior) =>
      anterior.map((secao) =>
        secao.id === secaoId
          ? { ...secao, itens: secao.itens.filter((item) => item.id !== itemId) }
          : secao
      )
    );

  const moverItem = (secaoId, indice, passo) =>
    setSecoes((anterior) =>
      anterior.map((secao) => {
        if (secao.id !== secaoId) return secao;
        const destino = indice + passo;
        if (destino < 0 || destino >= secao.itens.length) return secao;
        const itens = [...secao.itens];
        [itens[indice], itens[destino]] = [itens[destino], itens[indice]];
        return { ...secao, itens };
      })
    );

  const seta = (desativado) => ({
    ...botaoBase,
    padding: '3px 6px',
    fontSize: 10,
    opacity: desativado ? 0.3 : 0.9,
    cursor: desativado ? 'default' : 'pointer',
  });

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

      {secoes.map((secao, indice) => {
        const pendentes = pendenciasDaSecao(secao);
        return (
          <div
            key={secao.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 9,
              borderRadius: 9,
              border: `1px solid ${escuro(14)}`,
              background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                value={secao.titulo}
                onChange={(evento) => mudarSecao(secao.id, 'titulo', evento.target.value)}
                placeholder="Título da seção"
                style={{ ...campo, flex: 1, color: 'var(--c1)', fontWeight: 600 }}
              />
              {secao.itens.length ? (
                <span
                  title={
                    pendentes
                      ? `${pendentes} pergunta(s) sem resposta`
                      : 'Todas as perguntas respondidas'
                  }
                  style={{
                    fontSize: 9,
                    color: pendentes ? 'var(--c2)' : 'var(--ok)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pendentes ? `${pendentes} sem resposta` : 'completa'}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => moverSecao(indice, -1)}
                aria-label="Subir seção"
                disabled={indice === 0}
                style={seta(indice === 0)}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moverSecao(indice, 1)}
                aria-label="Descer seção"
                disabled={indice === secoes.length - 1}
                style={seta(indice === secoes.length - 1)}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removerSecao(secao.id)}
                aria-label="Remover seção"
                style={{ ...botaoBase, padding: '4px 6px', color: 'var(--c6)' }}
              >
                <TrashIcon size={11} />
              </button>
            </div>

            {secao.itens.map((item, ordem) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  padding: 8,
                  borderRadius: 8,
                  border: `1px solid ${escuro(10)}`,
                  background: 'color-mix(in srgb, var(--c8) 35%, transparent)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <input
                    value={item.pergunta}
                    onChange={(evento) => mudarItem(secao.id, item.id, 'pergunta', evento.target.value)}
                    placeholder="Pergunta"
                    style={{ ...campo, flex: 1, fontSize: 10.5, color: 'var(--c1)' }}
                  />
                  <button
                    type="button"
                    onClick={() => mudarItem(secao.id, item.id, 'copiar', !item.copiar)}
                    aria-pressed={item.copiar}
                    title={
                      item.copiar
                        ? 'Botão de copiar ligado nesta resposta'
                        : 'Ligar botão de copiar nesta resposta'
                    }
                    style={{
                      ...botaoBase,
                      padding: '3px 6px',
                      gap: 3,
                      fontSize: 9,
                      color: item.copiar ? 'var(--c1)' : 'var(--c2)',
                      border: `1px solid ${item.copiar ? dourado(45) : escuro(18)}`,
                      background: item.copiar ? dourado(14) : escuro(6),
                    }}
                  >
                    <CopyIcon size={10} />
                    {item.copiar ? 'copiar' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => moverItem(secao.id, ordem, -1)}
                    aria-label="Subir pergunta"
                    disabled={ordem === 0}
                    style={seta(ordem === 0)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moverItem(secao.id, ordem, 1)}
                    aria-label="Descer pergunta"
                    disabled={ordem === secao.itens.length - 1}
                    style={seta(ordem === secao.itens.length - 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removerItem(secao.id, item.id)}
                    aria-label="Remover pergunta"
                    style={{ ...botaoBase, padding: '3px 6px', color: 'var(--c6)' }}
                  >
                    <TrashIcon size={10} />
                  </button>
                </div>
                <textarea
                  value={item.resposta}
                  onChange={(evento) => mudarItem(secao.id, item.id, 'resposta', evento.target.value)}
                  placeholder="Resposta (em branco, a pergunta não aparece na leitura)"
                  rows={2}
                  style={{ ...campo, lineHeight: 1.45 }}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => adicionarItem(secao.id)}
              style={{ ...botaoBase, alignSelf: 'flex-start', padding: '4px 9px', fontSize: 9.5 }}
            >
              <PlusIcon size={10} /> Pergunta
            </button>

            {/* Seção antiga guardada como texto corrido: continua aqui para ser lida ou limpa. */}
            {secao.texto ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 8.5, color: 'var(--c2)', opacity: 0.8 }}>
                  Texto corrido (formato antigo)
                </span>
                <textarea
                  value={secao.texto}
                  onChange={(evento) => mudarSecao(secao.id, 'texto', evento.target.value)}
                  rows={3}
                  style={{ ...campo, lineHeight: 1.45, fontSize: 10.5 }}
                />
              </div>
            ) : null}
          </div>
        );
      })}

      <button
        type="button"
        onClick={adicionarSecao}
        style={{ ...botaoBase, alignSelf: 'flex-start', padding: '5px 10px' }}
      >
        <PlusIcon size={11} /> Seção
      </button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 2 }}>
        <button
          type="button"
          onClick={onCancelar}
          style={{ ...botaoBase, color: 'var(--c2)', border: `1px solid ${escuro(18)}`, background: escuro(6) }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={() => onSalvar({ secoes, resumo })}
          style={{ ...botaoBase, opacity: salvando ? 0.6 : 1 }}
        >
          {salvando ? 'Salvando…' : 'Salvar playbook'}
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
