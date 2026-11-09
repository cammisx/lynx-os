import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons';
import { MODAL_CAIXA } from '@/lib/modalStyles';

/**
 * Gerenciador das tags do conteúdo.
 *
 * A tag é uma só para todas as modelos: aqui ela é renomeada ou apagada em
 * todos os itens de todos os conteúdos de uma vez, para não sobrar tag solta
 * num item e sumida do cadastro no outro.
 *
 * Quem mexe é o admin; o resto do sistema só lê a lista.
 */

const campo = {
  width: '100%',
  padding: '7px 9px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  fontWeight: 700,
  outline: 'none',
  boxSizing: 'border-box',
};

const botao = {
  padding: '5px 9px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 50%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 10.5,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export default function ModalTags({ uso = [], onRenomear, onExcluir, onFechar, ocupado = false }) {
  const [editando, setEditando] = useState(null);
  const [texto, setTexto] = useState('');
  const [confirmando, setConfirmando] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key !== 'Escape' || ocupado) return;
      if (editando) {
        setEditando(null);
        return;
      }
      onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [editando, onFechar, ocupado]);

  const abrirEdicao = (tag) => {
    setConfirmando(null);
    setErro('');
    setEditando(tag);
    setTexto(tag);
  };

  const gravar = async (antiga) => {
    const novo = texto.trim();
    if (!novo || novo.toUpperCase() === antiga) {
      setEditando(null);
      return;
    }
    setErro('');
    const resultado = await onRenomear(antiga, novo);
    if (resultado?.ok === false) {
      setErro(resultado.erro || 'Não consegui alterar a tag agora.');
      return;
    }
    setEditando(null);
  };

  const apagar = async (tag) => {
    setErro('');
    const resultado = await onExcluir(tag);
    if (resultado?.ok === false) {
      setErro(resultado.erro || 'Não consegui apagar a tag agora.');
      return;
    }
    setConfirmando(null);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !ocupado) onFechar();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Tags do conteúdo" style={{ ...MODAL_CAIXA, width: 520 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 12.5,
                letterSpacing: '0.04em',
                color: 'var(--c1)',
              }}
            >
              TAGS DO CONTEÚDO
            </span>
            <span style={{ fontSize: 10, color: 'var(--c2)' }}>
              Valem para todas as modelos · alterar ou apagar mexe nos itens também
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={ocupado}
            aria-label="Fechar"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 7,
              border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
              background: 'color-mix(in srgb, var(--c8) 50%, transparent)',
              color: 'var(--c3)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={12} />
          </button>
        </div>

        <div
          className="glass-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '10px 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}
        >
          {erro ? <span style={{ fontSize: 11, color: 'var(--erro)' }}>{erro}</span> : null}

          {!uso.length && (
            <span style={{ fontSize: 11, color: 'var(--c2)' }}>
              Nenhuma tag usada ainda. Elas aparecem aqui na medida em que forem criadas nos itens.
            </span>
          )}

          {uso.map((linha) => (
            <div
              key={linha.tag}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '9px 10px',
                borderRadius: 10,
                border: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editando === linha.tag ? (
                  <input
                    autoFocus
                    value={texto}
                    onChange={(evento) => setTexto(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter') {
                        evento.preventDefault();
                        gravar(linha.tag);
                      }
                    }}
                    aria-label={`Novo nome da tag ${linha.tag}`}
                    style={campo}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--c3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {linha.tag}
                  </span>
                )}
                <span style={{ fontSize: 9.5, color: 'var(--c2)', whiteSpace: 'nowrap' }}>
                  {linha.itens} item(ns) · {linha.modelos} modelo(s)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {editando === linha.tag ? (
                  <>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => gravar(linha.tag)}
                      style={{ ...botao, color: 'var(--c1)' }}
                    >
                      {ocupado ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button type="button" onClick={() => setEditando(null)} style={botao}>
                      Cancelar
                    </button>
                  </>
                ) : confirmando === linha.tag ? (
                  <>
                    <span style={{ fontSize: 10.5, color: 'var(--erro)', alignSelf: 'center' }}>
                      Apagar tira a tag de {linha.itens} item(ns). Confirma?
                    </span>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => apagar(linha.tag)}
                      style={{ ...botao, color: 'var(--erro)' }}
                    >
                      {ocupado ? 'Apagando...' : 'Apagar'}
                    </button>
                    <button type="button" onClick={() => setConfirmando(null)} style={botao}>
                      Não
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => abrirEdicao(linha.tag)} style={botao}>
                      Alterar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErro('');
                        setConfirmando(linha.tag);
                        setEditando(null);
                      }}
                      style={{ ...botao, color: 'var(--erro)' }}
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
