import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { nomeDoConteudo } from '@/lib/conteudos';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import CampoMoeda from '@/components/conteudo/CampoMoeda';
import {
  COLUNAS,
  abasDe,
  abasParaSalvar,
  avisosDaTabela,
  itemDePreco,
  novaAba,
  novoItemPreco,
  totalDeItens,
} from '@/lib/tabelaPrecos';

const GRADE = 'minmax(0, 1fr) 86px 86px 86px 24px';

const escuro = (valor) => `color-mix(in srgb, var(--c2) ${valor}%, transparent)`;
const dourado = (valor) => `color-mix(in srgb, var(--c1) ${valor}%, transparent)`;

const campo = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 8,
  border: `1px solid ${escuro(16)}`,
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  outline: 'none',
  boxSizing: 'border-box',
};

const botaoAba = {
  padding: '4px 10px',
  borderRadius: 8,
  border: 'none',
  fontFamily: 'var(--font-main)',
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
  flex: '0 0 auto',
  cursor: 'pointer',
};

const botaoAcao = {
  padding: '5px 9px',
  borderRadius: 7,
  border: `1px solid ${escuro(18)}`,
  background: escuro(6),
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 9.5,
  cursor: 'pointer',
};

/**
 * Tabela de preços da modelo: guia com abas (uma tabela por aba) e, em cada
 * aba, itens com três valores — mínimo, normal e máximo. O admin cria, nomeia
 * e edita as abas de cada modelo; o chatter só lê.
 */
export default function ModalTabelaPrecos({ conteudo, admin, onFechar, onSalvo }) {
  const { user } = useAuth();
  const [abas, setAbas] = useState(() => abasDe(conteudo));
  const [ativaId, setAtivaId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mexido, setMexido] = useState(false);
  const [renomeando, setRenomeando] = useState(false);
  const [nomeTemp, setNomeTemp] = useState('');
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const ativa = abas.find((aba) => aba.id === ativaId) || abas[0] || null;
  const itens = ativa?.itens || [];

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key !== 'Escape') return;
      if (renomeando) {
        setRenomeando(false);
        setNomeTemp('');
        return;
      }
      if (confirmandoExclusao) {
        setConfirmandoExclusao(false);
        return;
      }
      if (!salvando) onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar, salvando, renomeando, confirmandoExclusao]);

  const trocarAba = (id) => {
    setAtivaId(id);
    setRenomeando(false);
    setConfirmandoExclusao(false);
    setNomeTemp('');
  };

  const mudarItem = (id, campoAlvo, valor) => {
    if (!ativa) return;
    setMexido(true);
    setAbas((atuais) =>
      atuais.map((aba) =>
        aba.id !== ativa.id
          ? aba
          : {
              ...aba,
              itens: aba.itens.map((linha) =>
                linha.id === id ? itemDePreco({ ...linha, [campoAlvo]: valor }) : linha
              ),
            }
      )
    );
  };

  const adicionarItem = () => {
    if (!ativa) return;
    setMexido(true);
    setAbas((atuais) =>
      atuais.map((aba) =>
        aba.id !== ativa.id ? aba : { ...aba, itens: [...aba.itens, novoItemPreco()] }
      )
    );
  };

  const removerItem = (id) => {
    if (!ativa) return;
    setMexido(true);
    setAbas((atuais) =>
      atuais.map((aba) =>
        aba.id !== ativa.id ? aba : { ...aba, itens: aba.itens.filter((linha) => linha.id !== id) }
      )
    );
  };

  const adicionarAba = () => {
    const nova = novaAba('');
    setMexido(true);
    setAbas((atuais) => [...atuais, nova]);
    setAtivaId(nova.id);
    setConfirmandoExclusao(false);
    setNomeTemp('');
    setRenomeando(true);
  };

  const abrirRenomear = () => {
    if (!ativa) return;
    setConfirmandoExclusao(false);
    setNomeTemp(ativa.nome);
    setRenomeando(true);
  };

  const confirmarRenomear = () => {
    if (!ativa) return;
    setMexido(true);
    setAbas((atuais) =>
      atuais.map((aba) => (aba.id !== ativa.id ? aba : { ...aba, nome: nomeTemp.trim() }))
    );
    setRenomeando(false);
    setNomeTemp('');
  };

  const excluirAba = () => {
    if (!ativa) return;
    const indice = abas.findIndex((aba) => aba.id === ativa.id);
    const restantes = abas.filter((aba) => aba.id !== ativa.id);
    const proxima = restantes[indice] || restantes[indice - 1] || null;
    setMexido(true);
    setAbas(restantes);
    setAtivaId(proxima?.id || '');
    setConfirmandoExclusao(false);
    setRenomeando(false);
  };

  const salvar = async () => {
    if (!conteudo?.id || !admin) return;
    setSalvando(true);
    setErro('');
    try {
      await base44.entities.Conteudo.update(conteudo.id, {
        tabela_precos: abasParaSalvar(abas),
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
  const vazio = !itens.length;

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
            borderBottom: `1px solid ${escuro(14)}`,
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
              {nomeDoConteudo(conteudo)} · {totalDeItens(abas)} itens em {abas.length}{' '}
              {abas.length === 1 ? 'aba' : 'abas'}
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
              border: `1px solid ${escuro(18)}`,
              background: escuro(8),
              color: 'var(--c3)',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '9px 16px 0' }}>
          <div
            className="glass-scroll"
            style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}
            role="tablist"
            aria-label="Abas da tabela de preços"
          >
            {abas.map((aba) => {
              const atual = aba.id === ativa?.id;
              return (
                <button
                  key={aba.id}
                  type="button"
                  role="tab"
                  aria-selected={atual}
                  onClick={() => trocarAba(aba.id)}
                  style={{
                    ...botaoAba,
                    color: atual ? 'var(--c1)' : 'var(--c2)',
                    background: atual ? dourado(14) : escuro(6),
                    border: `1px solid ${atual ? dourado(45) : escuro(18)}`,
                  }}
                >
                  {aba.nome.trim() || 'Sem nome'}
                </button>
              );
            })}
            {admin ? (
              <button
                type="button"
                onClick={adicionarAba}
                disabled={salvando}
                title="Criar uma aba nova"
                style={{
                  ...botaoAba,
                  color: 'var(--c1)',
                  background: 'transparent',
                  border: `1px dashed ${dourado(38)}`,
                }}
              >
                + aba
              </button>
            ) : null}
          </div>

          {admin && ativa ? (
            renomeando ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8 }}>
                <input
                  value={nomeTemp}
                  onChange={(evento) => setNomeTemp(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') confirmarRenomear();
                  }}
                  autoFocus
                  placeholder="Nome da aba"
                  aria-label="Nome da aba"
                  maxLength={40}
                  style={{ ...campo, flex: 1, minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={confirmarRenomear}
                  style={{
                    ...botaoAcao,
                    border: `1px solid ${dourado(45)}`,
                    background: dourado(14),
                    color: 'var(--c1)',
                    fontWeight: 700,
                  }}
                >
                  Salvar nome
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenomeando(false);
                    setNomeTemp('');
                  }}
                  style={botaoAcao}
                >
                  Cancelar
                </button>
              </div>
            ) : confirmandoExclusao ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '7px 9px',
                  marginBottom: 8,
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--erro) 32%, transparent)',
                  background: 'color-mix(in srgb, var(--erro) 9%, transparent)',
                }}
              >
                <span style={{ fontSize: 9.5, color: 'var(--c3)', lineHeight: 1.5 }}>
                  Excluir “{ativa.nome.trim() || 'Sem nome'}”
                  {itens.length ? ` e seus ${itens.length} itens` : ' (vazia)'}?
                </span>
                <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
                  <button
                    type="button"
                    onClick={excluirAba}
                    style={{
                      ...botaoAcao,
                      border: '1px solid color-mix(in srgb, var(--erro) 45%, transparent)',
                      background: 'color-mix(in srgb, var(--erro) 16%, transparent)',
                      color: 'var(--erro)',
                      fontWeight: 700,
                    }}
                  >
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoExclusao(false)}
                    style={botaoAcao}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  paddingBottom: 8,
                }}
              >
                <span style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--c2)', opacity: 0.8 }}>
                  ABA: {ativa.nome.trim().toUpperCase() || 'SEM NOME'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={abrirRenomear} style={botaoAcao}>
                    ✎ Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => (itens.length ? setConfirmandoExclusao(true) : excluirAba())}
                    style={{
                      ...botaoAcao,
                      color: 'var(--erro)',
                      border: '1px solid color-mix(in srgb, var(--erro) 30%, transparent)',
                      background: 'color-mix(in srgb, var(--erro) 8%, transparent)',
                    }}
                  >
                    × Excluir aba
                  </button>
                </div>
              </div>
            )
          ) : null}
        </div>

        <div
          className="glass-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 12px' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRADE,
              gap: 6,
              alignItems: 'center',
              marginBottom: 6,
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

          {!ativa ? (
            <div
              style={{
                padding: '22px 16px',
                borderRadius: 10,
                border: `1px dashed ${dourado(22)}`,
                textAlign: 'center',
                fontSize: 11,
                color: 'var(--c2)',
                lineHeight: 1.6,
              }}
            >
              {admin
                ? 'Nenhuma aba ainda. Crie a primeira em “+ aba” e dê o nome que fizer sentido: Genérico, Sexting, Personalizados…'
                : 'A tabela ainda está vazia.'}
            </div>
          ) : vazio ? (
            <div
              style={{
                padding: '22px 16px',
                borderRadius: 10,
                border: `1px dashed ${dourado(22)}`,
                textAlign: 'center',
                fontSize: 11,
                color: 'var(--c2)',
                lineHeight: 1.6,
              }}
            >
              {admin
                ? 'Esta aba está vazia. Comece pelo que mais aparece no chat: vídeo chamada, personalizado, áudio.'
                : 'Esta aba ainda está vazia.'}
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
                        onClick={() => removerItem(linha.id)}
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
            borderTop: `1px solid ${escuro(14)}`,
          }}
        >
          {admin && ativa ? (
            <button
              type="button"
              onClick={adicionarItem}
              disabled={salvando}
              style={{
                padding: '7px 11px',
                borderRadius: 8,
                border: `1px solid ${dourado(34)}`,
                background: dourado(12),
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
                border: `1px solid ${escuro(18)}`,
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
                  border: `1px solid ${dourado(55)}`,
                  background: dourado(20),
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
