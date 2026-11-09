import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Window from '@/components/Window';
import { useIsMobile } from '@/hooks/use-mobile';
import { BackIcon } from '@/components/chat/chatIcons';
import { CheckIcon, CopyIcon, PencilIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { EstrategiaIcon } from '@/components/icons';
import useEstrategias from '@/hooks/useEstrategias';
import { useAuth } from '@/lib/AuthContext';
import { useMarcarSujo } from '@/components/desktop/JanelaContext';
import {
  copiarTexto,
  estrategiaVazia,
  itemVazio,
  moverItem,
  podeEditarEstrategia,
  problemasDaEstrategia,
} from '@/lib/estrategias';

/**
 * Estratégias: os textos prontos do atendimento.
 *
 * O admin cria a estratégia, escreve as mensagens (cada uma com o seu bloco de
 * copiar) e pode explicar cada uma num campo de instruções que NÃO é copiado.
 * O chatter abre a mesma janela e só lê e copia.
 *
 * No celular a lista e a estratégia não cabem lado a lado: aparece uma por vez,
 * com o "‹ Estratégias" para voltar.
 */
const escuro = (valor) => `color-mix(in srgb, var(--c2) ${valor}%, transparent)`;
const dourado = (valor) => `color-mix(in srgb, var(--c1) ${valor}%, transparent)`;

const botaoBase = {
  display: 'inline-flex',
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

const campoStyle = {
  width: '100%',
  padding: '7px 9px',
  borderRadius: 8,
  border: `1px solid ${escuro(20)}`,
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  lineHeight: 1.5,
  outline: 'none',
  resize: 'vertical',
};

const rotuloStyle = {
  fontSize: 9.5,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

/** Um bloco de mensagem com o botão de copiar colado nele. */
function BlocoMensagem({ texto, indice }) {
  const [copiado, setCopiado] = useState(false);
  const relogio = useRef(null);

  useEffect(() => () => clearTimeout(relogio.current), []);

  const copiar = async () => {
    const ok = await copiarTexto(texto);
    if (!ok) return;
    setCopiado(true);
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setCopiado(false), 1600);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 11,
        border: `1px solid ${dourado(18)}`,
        background: 'color-mix(in srgb, var(--c8) 40%, transparent)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 6px 5px 10px',
          borderBottom: `1px solid ${dourado(12)}`,
          background: dourado(6),
        }}
      >
        <span style={{ ...rotuloStyle, flex: 1 }}>Mensagem {indice + 1}</span>
        <button
          type="button"
          onClick={copiar}
          style={{
            ...botaoBase,
            padding: '4px 9px',
            fontSize: 9.5,
            color: copiado ? 'var(--ok)' : 'var(--c1)',
            borderColor: copiado ? 'color-mix(in srgb, var(--ok) 40%, transparent)' : dourado(30),
          }}
          aria-label={`Copiar a mensagem ${indice + 1}`}
        >
          {copiado ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div
        style={{
          padding: '10px 12px',
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--c3)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          userSelect: 'text',
        }}
      >
        {texto}
      </div>
    </div>
  );
}

/** Caixa de instruções: só para ler, sem botão de copiar. */
function BlocoInstrucoes({ texto }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 10px',
        borderRadius: 9,
        border: `1px dashed ${escuro(22)}`,
        background: escuro(4),
      }}
    >
      <span style={rotuloStyle}>Instruções</span>
      <span
        style={{
          fontSize: 11,
          lineHeight: 1.55,
          color: 'var(--c2)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {texto}
      </span>
    </div>
  );
}

/** Confirmação em vidro, para excluir uma estratégia. */
function ConfirmarExcluir({ nome, onCancelar, onConfirmar }) {
  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape') onCancelar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCancelar]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9650,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCancelar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(380px, calc(100vw - 40px))',
          borderRadius: 14,
          border: `1px solid ${dourado(30)}`,
          background: 'color-mix(in srgb, var(--c8) 82%, transparent)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.04em', color: 'var(--c1)' }}>
          Excluir estratégia?
        </span>
        <span style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--c3)' }}>
          “{nome}” e todas as mensagens dela vão embora. Não dá para desfazer.
        </span>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancelar}
            style={{ ...botaoBase, border: `1px solid ${escuro(25)}`, background: 'transparent', color: 'var(--c3)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            style={{
              ...botaoBase,
              border: '1px solid color-mix(in srgb, var(--erro) 45%, transparent)',
              background: 'color-mix(in srgb, var(--erro) 18%, transparent)',
              color: 'var(--erro)',
              fontWeight: 700,
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Editor da estratégia inteira: nome, descrição e as mensagens. */
function EditorEstrategia({ inicial, salvando, aviso, onFechar, onSalvar }) {
  const [rascunho, setRascunho] = useState(inicial);
  const [problema, setProblema] = useState('');

  const mexer = (mudanca) => setRascunho((atual) => ({ ...atual, ...mudanca }));

  const mexerItem = (indice, mudanca) =>
    setRascunho((atual) => ({
      ...atual,
      itens: atual.itens.map((item, posicao) => (posicao === indice ? { ...item, ...mudanca } : item)),
    }));

  const tentar = () => {
    const problemas = problemasDaEstrategia(rascunho);
    if (problemas.length) {
      setProblema(problemas[0]);
      return;
    }
    setProblema('');
    onSalvar(rascunho);
  };

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        padding: 12,
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="glass-scroll"
        style={{
          width: 'min(620px, calc(100vw - 24px))',
          maxHeight: 'min(86vh, 700px)',
          overflowY: 'auto',
          borderRadius: 14,
          border: `1px solid ${dourado(30)}`,
          background: 'color-mix(in srgb, var(--c8) 88%, transparent)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            borderBottom: `1px solid ${dourado(16)}`,
            position: 'sticky',
            top: 0,
            background: 'color-mix(in srgb, var(--c8) 92%, transparent)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            zIndex: 1,
          }}
        >
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.04em', color: 'var(--c1)' }}>
            {rascunho.id ? 'Editar estratégia' : 'Nova estratégia'}
          </span>
          <button type="button" onClick={onFechar} style={{ ...botaoBase, padding: '4px 8px' }} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={rotuloStyle}>Nome *</span>
            <input
              type="text"
              value={rascunho.nome}
              onChange={(evento) => mexer({ nome: evento.target.value })}
              placeholder="Ex: Abordagem de assinante novo"
              style={campoStyle}
              autoFocus
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={rotuloStyle}>Descrição</span>
            <textarea
              rows={2}
              value={rascunho.descricao}
              onChange={(evento) => mexer({ descricao: evento.target.value })}
              placeholder="Para que serve esta estratégia (opcional)"
              style={campoStyle}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={rotuloStyle}>Mensagens</span>

            {rascunho.itens.map((item, indice) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  padding: 10,
                  borderRadius: 11,
                  border: `1px solid ${escuro(18)}`,
                  background: escuro(5),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flex: 1, ...rotuloStyle }}>Mensagem {indice + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setRascunho((atual) => ({ ...atual, itens: moverItem(atual.itens, indice, indice - 1) }))
                    }
                    disabled={indice === 0}
                    style={{ ...botaoBase, padding: '3px 7px', opacity: indice === 0 ? 0.35 : 1 }}
                    aria-label={`Subir a mensagem ${indice + 1}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRascunho((atual) => ({ ...atual, itens: moverItem(atual.itens, indice, indice + 1) }))
                    }
                    disabled={indice === rascunho.itens.length - 1}
                    style={{
                      ...botaoBase,
                      padding: '3px 7px',
                      opacity: indice === rascunho.itens.length - 1 ? 0.35 : 1,
                    }}
                    aria-label={`Descer a mensagem ${indice + 1}`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRascunho((atual) => ({
                        ...atual,
                        itens: atual.itens.filter((_, posicao) => posicao !== indice),
                      }))
                    }
                    style={{
                      ...botaoBase,
                      padding: '3px 7px',
                      border: '1px solid color-mix(in srgb, var(--erro) 35%, transparent)',
                      background: 'color-mix(in srgb, var(--erro) 12%, transparent)',
                      color: 'var(--erro)',
                    }}
                    aria-label={`Remover a mensagem ${indice + 1}`}
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={item.mensagem}
                  onChange={(evento) => mexerItem(indice, { mensagem: evento.target.value })}
                  placeholder="A mensagem que o time copia"
                  style={campoStyle}
                />
                <textarea
                  rows={2}
                  value={item.instrucoes}
                  onChange={(evento) => mexerItem(indice, { instrucoes: evento.target.value })}
                  placeholder="Instruções: quando usar, o que ajustar (opcional, não é copiado)"
                  style={{ ...campoStyle, fontSize: 11, color: 'var(--c2)' }}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => setRascunho((atual) => ({ ...atual, itens: [...atual.itens, itemVazio()] }))}
              style={{ ...botaoBase, alignSelf: 'flex-start' }}
            >
              <PlusIcon size={12} />
              Adicionar mensagem
            </button>
          </div>

          {problema || aviso ? (
            <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{problema || aviso}</span>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onFechar}
              style={{ ...botaoBase, border: `1px solid ${escuro(25)}`, background: 'transparent', color: 'var(--c3)' }}
            >
              Cancelar
            </button>
            <button type="button" onClick={tentar} disabled={salvando} style={{ ...botaoBase, fontWeight: 700 }}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function EstrategiasWindow({ onClose }) {
  const pequeno = useIsMobile();
  const { user } = useAuth();
  const { estrategias, carregando, erro, salvar, excluir, recarregar } = useEstrategias();
  const podeEditar = podeEditarEstrategia(user);

  const [ativaId, setAtivaId] = useState(null);
  const [verEstrategia, setVerEstrategia] = useState(false);
  const [editor, setEditor] = useState(null);
  const [aExcluir, setAExcluir] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');

  /* Fechar a janela com o editor aberto perde o rascunho: o shell pergunta. */
  useMarcarSujo(Boolean(editor));

  useEffect(() => {
    if (!estrategias.length) {
      setAtivaId(null);
      return;
    }
    if (!estrategias.some((item) => item.id === ativaId)) setAtivaId(estrategias[0].id);
  }, [estrategias, ativaId]);

  const ativa = estrategias.find((item) => item.id === ativaId) || null;
  const mostrarLista = !pequeno || !verEstrategia;

  const abrirEstrategia = (id) => {
    setAtivaId(id);
    setVerEstrategia(true);
  };

  const tentarSalvar = async (rascunho) => {
    setSalvando(true);
    setAviso('');
    try {
      const salva = await salvar(rascunho);
      setEditor(null);
      if (salva?.id) abrirEstrategia(salva.id);
    } catch (falha) {
      console.warn('[Estrategias] salvar', falha);
      setAviso('Não consegui salvar agora. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!aExcluir) return;
    const alvo = aExcluir;
    setAExcluir(null);
    try {
      await excluir(alvo.id);
      if (alvo.id === ativaId) setAtivaId(null);
    } catch (falha) {
      console.warn('[Estrategias] excluir', falha);
      setAviso('Não consegui excluir agora. Tente de novo.');
    }
  };

  return (
    <Window title="Estratégias" icon={EstrategiaIcon} onClose={onClose} width={880} height={620}>
      <div
        style={{
          display: 'flex',
          height: '100%',
          minHeight: 0,
          fontFamily: 'var(--font-main)',
          gap: 0,
        }}
      >
        {mostrarLista ? (
          <div
            className="glass-scroll"
            style={{
              width: pequeno ? '100%' : 262,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 12,
              overflowY: 'auto',
              borderRight: pequeno ? 'none' : `1px solid ${escuro(14)}`,
            }}
          >
            {podeEditar ? (
              <button
                type="button"
                onClick={() => {
                  setAviso('');
                  setEditor(estrategiaVazia());
                }}
                style={{ ...botaoBase, width: '100%', padding: '8px 10px' }}
              >
                <PlusIcon size={13} />
                Nova estratégia
              </button>
            ) : null}

            {erro ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 4 }}>
                <span style={{ fontSize: 10.5, color: 'var(--erro)', lineHeight: 1.5 }}>{erro}</span>
                <button type="button" onClick={recarregar} style={{ ...botaoBase, padding: '4px 8px', alignSelf: 'flex-start' }}>
                  Tentar de novo
                </button>
              </div>
            ) : null}

            {carregando ? (
              <span style={{ fontSize: 10.5, color: 'var(--c2)', padding: 4 }}>Carregando...</span>
            ) : null}

            {!carregando && !estrategias.length && !erro ? (
              <span style={{ fontSize: 10.5, color: 'var(--c2)', lineHeight: 1.55, padding: 4 }}>
                {podeEditar
                  ? 'Nenhuma estratégia ainda. Crie a primeira no botão acima.'
                  : 'Nenhuma estratégia publicada ainda.'}
              </span>
            ) : null}

            {estrategias.map((item) => {
              const selecionada = item.id === ativaId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => abrirEstrategia(item.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    padding: '9px 10px',
                    borderRadius: 10,
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: `1px solid ${selecionada ? dourado(45) : escuro(14)}`,
                    background: selecionada ? dourado(12) : escuro(4),
                    color: 'var(--c3)',
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: selecionada ? 'var(--c1)' : 'var(--c3)' }}>
                    {item.nome || 'Sem nome'}
                  </span>
                  {item.descricao ? (
                    <span
                      style={{
                        fontSize: 10,
                        lineHeight: 1.45,
                        color: 'var(--c2)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.descricao}
                    </span>
                  ) : null}
                  <span style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: escuro(45) }}>
                    {item.itens.length} {item.itens.length === 1 ? 'mensagem' : 'mensagens'}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {!mostrarLista ? (
          <div
            className="glass-scroll"
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexShrink: 0 }}>
              <button type="button" onClick={() => setVerEstrategia(false)} style={{ ...botaoBase, padding: '5px 9px' }}>
                <BackIcon size={13} />
                Estratégias
              </button>
            </div>
            <ConteudoEstrategia
              estrategia={ativa}
              podeEditar={podeEditar}
              onEditar={() => {
                setAviso('');
                setEditor({ ...ativa, itens: [...ativa.itens] });
              }}
              onExcluir={() => setAExcluir(ativa)}
            />
          </div>
        ) : (
          <div
            className="glass-scroll"
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
          >
            <ConteudoEstrategia
              estrategia={ativa}
              podeEditar={podeEditar}
              onEditar={() => {
                setAviso('');
                setEditor({ ...ativa, itens: [...ativa.itens] });
              }}
              onExcluir={() => setAExcluir(ativa)}
            />
          </div>
        )}
      </div>

      {editor ? (
        <EditorEstrategia
          inicial={editor}
          salvando={salvando}
          aviso={aviso}
          onFechar={() => {
            setEditor(null);
            setAviso('');
          }}
          onSalvar={tentarSalvar}
        />
      ) : null}

      {aExcluir ? (
        <ConfirmarExcluir
          nome={aExcluir.nome || 'esta estratégia'}
          onCancelar={() => setAExcluir(null)}
          onConfirmar={confirmarExclusao}
        />
      ) : null}
    </Window>
  );
}

/** A estratégia aberta: nome, descrição e as mensagens. */
function ConteudoEstrategia({ estrategia, podeEditar, onEditar, onExcluir }) {
  if (!estrategia) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontSize: 11,
          color: 'var(--c2)',
          textAlign: 'center',
        }}
      >
        Escolha uma estratégia na lista.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '0.03em', color: 'var(--c1)' }}>
            {estrategia.nome || 'Sem nome'}
          </span>
          {estrategia.descricao ? (
            <span style={{ fontSize: 11, lineHeight: 1.55, color: 'var(--c2)' }}>{estrategia.descricao}</span>
          ) : null}
        </div>
        {podeEditar ? (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={onEditar} style={botaoBase} aria-label="Editar estratégia">
              <PencilIcon size={12} />
              Editar
            </button>
            <button
              type="button"
              onClick={onExcluir}
              style={{
                ...botaoBase,
                border: '1px solid color-mix(in srgb, var(--erro) 35%, transparent)',
                background: 'color-mix(in srgb, var(--erro) 12%, transparent)',
                color: 'var(--erro)',
              }}
              aria-label="Excluir estratégia"
            >
              <TrashIcon size={12} />
            </button>
          </div>
        ) : null}
      </div>

      {estrategia.itens.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {estrategia.itens.map((item, indice) => (
            <div key={item.id || indice} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {item.mensagem ? <BlocoMensagem texto={item.mensagem} indice={indice} /> : null}
              {item.instrucoes ? <BlocoInstrucoes texto={item.instrucoes} /> : null}
            </div>
          ))}
        </div>
      ) : (
        <span style={{ fontSize: 10.5, color: 'var(--c2)' }}>Esta estratégia ainda não tem mensagens.</span>
      )}
    </div>
  );
}
