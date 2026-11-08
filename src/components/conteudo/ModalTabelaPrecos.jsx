import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { nomeDoConteudo } from '@/lib/conteudos';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import CampoMoeda from '@/components/conteudo/CampoMoeda';
import {
  COLUNAS,
  avisosDaTabela,
  itemDePreco,
  itensParaSalvar,
  novoItemPreco,
  tabelaDe,
} from '@/lib/tabelaPrecos';

const GRADE = 'minmax(0, 1fr) 86px 86px 86px 24px';

const campo = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  outline: 'none',
  boxSizing: 'border-box',
};

/**
 * Tabela de preços da modelo: guia padrão com item e três valores (mínimo,
 * normal e máximo). O admin escreve; o chatter só lê.
 */
export default function ModalTabelaPrecos({ conteudo, admin, onFechar, onSalvo }) {
  const { user } = useAuth();
  const [itens, setItens] = useState(() => tabelaDe(conteudo));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mexido, setMexido] = useState(false);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape' && !salvando) onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar, salvando]);

  const mudarItem = (id, campoAlvo, valor) => {
    setMexido(true);
    setItens((atuais) =>
      atuais.map((linha) => (linha.id === id ? itemDePreco({ ...linha, [campoAlvo]: valor }) : linha))
    );
  };

  const adicionar = () => {
    setMexido(true);
    setItens((atuais) => [...atuais, novoItemPreco()]);
  };

  const remover = (id) => {
    setMexido(true);
    setItens((atuais) => atuais.filter((linha) => linha.id !== id));
  };

  const salvar = async () => {
    if (!conteudo?.id || !admin) return;
    setSalvando(true);
    setErro('');
    try {
      await base44.entities.Conteudo.update(conteudo.id, {
        tabela_precos: itensParaSalvar(itens),
        atualizado_por: user?.id || '',
        atualizado_por_nome: user?.full_name || user?.email || '',
      });
      onSalvo?.();
      onFechar();
    } catch (falha) {
      console.warn('[Tabela de preços] salvar', falha);
      setErro('Não consegui salvar a tabela agora. Tente de novo em instantes.');
    } finally {
      setSalvando(false);
    }
  };

  const avisos = admin ? avisosDaTabela(itens) : [];
  const vazia = !itens.length;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !salvando) onFechar();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Tabela de preços" style={{ ...MODAL_CAIXA, width: 560 }}>
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
              TABELA DE PREÇOS
            </span>
            <span style={{ fontSize: 10, color: 'var(--c2)' }}>
              {nomeDoConteudo(conteudo)}
              {admin ? ' · guia da modelo, você escreve' : ' · só leitura'}
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            aria-label="Fechar"
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
              background: 'color-mix(in srgb, var(--c8) 50%, transparent)',
              color: 'var(--c3)',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="glass-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRADE,
              gap: 6,
              alignItems: 'center',
              marginBottom: 6,
              paddingRight: admin ? 0 : 0,
            }}
          >
            <span style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--c2)', opacity: 0.8 }}>
              ITEM
            </span>
            {COLUNAS.map((coluna) => (
              <span
                key={coluna.id}
                title={coluna.dica}
                style={{
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  color: 'var(--c2)',
                  opacity: 0.8,
                  textAlign: 'right',
                }}
              >
                {coluna.nome.toUpperCase()}
              </span>
            ))}
            <span />
          </div>

          {vazia ? (
            <div
              style={{
                padding: '22px 16px',
                borderRadius: 10,
                border: '1px dashed color-mix(in srgb, var(--c1) 22%, transparent)',
                textAlign: 'center',
                fontSize: 11,
                color: 'var(--c2)',
                lineHeight: 1.6,
              }}
            >
              {admin
                ? 'Nenhum item ainda. Comece pelo que mais aparece no chat: vídeo chamada, personalizado, áudio.'
                : 'A tabela ainda está vazia.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {itens.map((linha) => (
                <div key={linha.id} style={{ display: 'grid', gridTemplateColumns: GRADE, gap: 6, alignItems: 'center' }}>
                  {admin ? (
                    <>
                      <input
                        value={linha.item}
                        onChange={(evento) => mudarItem(linha.id, 'item', evento.target.value)}
                        disabled={salvando}
                        placeholder="O que está sendo vendido"
                        style={campo}
                      />
                      {COLUNAS.map((coluna) => (
                        <CampoMoeda
                          key={coluna.id}
                          valor={linha[coluna.id]}
                          onChange={(valor) => mudarItem(linha.id, coluna.id, valor)}
                          disabled={salvando}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => remover(linha.id)}
                        disabled={salvando}
                        aria-label={`Remover ${linha.item || 'item'}`}
                        title="Remover item"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: '1px solid color-mix(in srgb, var(--erro) 30%, transparent)',
                          background: 'color-mix(in srgb, var(--erro) 10%, transparent)',
                          color: 'var(--erro)',
                          cursor: 'pointer',
                          fontSize: 11,
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 11, color: 'var(--c3)' }}>{linha.item || '—'}</span>
                      {COLUNAS.map((coluna) => (
                        <span
                          key={coluna.id}
                          style={{ fontSize: 11, color: 'var(--c3)', textAlign: 'right' }}
                        >
                          {linha[coluna.id] === null
                            ? '—'
                            : linha[coluna.id].toFixed(2).replace('.', ',')}
                        </span>
                      ))}
                      <span />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {avisos.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 10 }}>
              {avisos.map((aviso) => (
                <span key={aviso} style={{ fontSize: 10, color: 'var(--aviso)' }}>
                  {aviso}
                </span>
              ))}
            </div>
          ) : null}

          {erro ? (
            <span style={{ display: 'block', marginTop: 8, fontSize: 10.5, color: 'var(--erro)' }}>
              {erro}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '10px 16px',
            borderTop: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          {admin ? (
            <button
              type="button"
              onClick={adicionar}
              disabled={salvando}
              style={{
                padding: '7px 11px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c1) 34%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
                color: 'var(--c1)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Adicionar item
            </button>
          ) : (
            <span />
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                background: 'transparent',
                color: 'var(--c3)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
            {admin ? (
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || !mexido}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--c1) 55%, transparent)',
                  background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
                  color: 'var(--c1)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: salvando || !mexido ? 'default' : 'pointer',
                  opacity: salvando || !mexido ? 0.55 : 1,
                }}
              >
                {salvando ? 'Salvando…' : 'Salvar tabela'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
