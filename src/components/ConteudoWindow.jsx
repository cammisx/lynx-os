import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import { ImageIcon } from '@/components/icons';
import useConteudos from '@/hooks/useConteudos';
import { useAuth } from '@/lib/AuthContext';
import { nomeDoConteudo } from '@/lib/conteudos';
import {
  contarItens,
  novaPastaConteudo,
  pastaPorId,
  pastasDe,
  tagsDeConteudos,
} from '@/lib/conteudoPastas';
import ModalTabelaPrecos from '@/components/conteudo/ModalTabelaPrecos';
import ModalItem from '@/components/conteudo/ModalItem';
import CardItem from '@/components/conteudo/CardItem';

const escuro = (valor) => `color-mix(in srgb, var(--c2) ${valor}%, transparent)`;
const dourado = (valor) => `color-mix(in srgb, var(--c1) ${valor}%, transparent)`;

const botaoAcao = {
  padding: '6px 11px',
  borderRadius: 8,
  border: `1px solid ${dourado(40)}`,
  background: dourado(12),
  color: 'var(--c1)',
  fontFamily: 'var(--font-main)',
  fontSize: 10.5,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
};

const botaoDiscreto = {
  padding: '6px 10px',
  borderRadius: 8,
  border: `1px solid ${escuro(16)}`,
  background: 'transparent',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 10.5,
  cursor: 'pointer',
};

/**
 * Janela de Conteúdo: uma parte por modelo, igual ao playbook.
 *
 * Dentro da parte da modelo ficam as pastas (criadas pelo admin) e, dentro
 * delas, os itens: imagem obrigatória, tipo, duração quando é vídeo ou áudio,
 * data, e opcionalmente nome, descrição e tags. O chatter só lê.
 *
 * A tabela de preços da modelo abre pelo botão no topo.
 */
export default function ConteudoWindow({ onClose }) {
  const { user } = useAuth();
  const { conteudos, carregando, erro, admin, recarregar } = useConteudos();
  const [ativoId, setAtivoId] = useState(null);
  const [tabelaAberta, setTabelaAberta] = useState(false);
  const [pastaAbertaId, setPastaAbertaId] = useState(null);
  const [pastas, setPastas] = useState([]);
  const [itemEmEdicao, setItemEmEdicao] = useState(null);
  const [confirmarPasta, setConfirmarPasta] = useState(null);
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);

  const ativo = conteudos.find((item) => item.id === ativoId) || conteudos[0] || null;
  const pastaAberta = pastaPorId(pastas, pastaAbertaId);
  const sugestoes = tagsDeConteudos(conteudos);

  useEffect(() => {
    setPastas(pastasDe(ativo));
    setPastaAbertaId(null);
    setAviso('');
  }, [ativo?.id]);

  /* Toda mexida em pasta ou item é salva na hora; se o banco recusar, a tela
     volta para o que estava antes e a pessoa é avisada. */
  const persistir = async (novasPastas, mensagemFalha) => {
    if (!ativo?.id || !admin) return;
    const antes = pastas;
    setPastas(novasPastas);
    setSalvando(true);
    setAviso('');
    try {
      await base44.entities.Conteudo.update(ativo.id, {
        pastas: novasPastas,
        atualizado_por: user?.id || '',
        atualizado_por_nome: user?.full_name || user?.email || '',
      });
    } catch (falha) {
      console.warn('[Conteúdo] salvar pastas', falha);
      setPastas(antes);
      setAviso(mensagemFalha || 'Não consegui salvar agora. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const criarPasta = async () => {
    const nova = novaPastaConteudo(`Pasta ${pastas.length + 1}`);
    await persistir([...pastas, nova], 'Não consegui criar a pasta agora.');
    setPastaAbertaId(nova.id);
  };

  const renomearPasta = (pastaId, nome) => {
    setPastas((atuais) => atuais.map((pasta) => (pasta.id === pastaId ? { ...pasta, nome } : pasta)));
  };

  const gravarNomePasta = async (pastaId) => {
    const pasta = pastaPorId(pastas, pastaId);
    if (!pasta) return;
    const nome = String(pasta.nome || '').trim() || 'Sem nome';
    await persistir(
      pastas.map((item) => (item.id === pastaId ? { ...item, nome } : item)),
      'Não consegui renomear a pasta agora.'
    );
  };

  const removerPasta = async (pastaId) => {
    setConfirmarPasta(null);
    if (pastaAbertaId === pastaId) setPastaAbertaId(null);
    await persistir(
      pastas.filter((pasta) => pasta.id !== pastaId),
      'Não consegui apagar a pasta agora.'
    );
  };

  const salvarItem = async (item) => {
    const pastaId = itemEmEdicao?.pastaId;
    if (!pastaId) return;
    const novas = pastas.map((pasta) => {
      if (pasta.id !== pastaId) return pasta;
      const existe = pasta.itens.some((linha) => linha.id === item.id);
      return {
        ...pasta,
        itens: existe
          ? pasta.itens.map((linha) => (linha.id === item.id ? item : linha))
          : [...pasta.itens, item],
      };
    });
    setItemEmEdicao(null);
    await persistir(novas, 'Não consegui salvar o item agora.');
  };

  const removerItem = async (pastaId, itemId) => {
    const novas = pastas.map((pasta) =>
      pasta.id === pastaId
        ? { ...pasta, itens: pasta.itens.filter((linha) => linha.id !== itemId) }
        : pasta
    );
    await persistir(novas, 'Não consegui remover o item agora.');
  };

  return (
    <Window title="Conteúdo" icon={ImageIcon} onClose={onClose} width={820} height={560}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0, gap: 0 }}>
        {/* Uma entrada por modelo que a pessoa pode ver. */}
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

          {!carregando && !conteudos.length && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.5 }}>
              Nenhum conteúdo liberado para você ainda.
            </span>
          )}

          {conteudos.map((conteudo) => {
            const escolhido = ativo?.id === conteudo.id;
            return (
              <button
                key={conteudo.id}
                type="button"
                onClick={() => setAtivoId(conteudo.id)}
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
                  {nomeDoConteudo(conteudo)}
                </span>
                <span style={{ fontSize: 8.5, opacity: 0.7, letterSpacing: '0.05em' }}>
                  MODELO
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="glass-scroll"
          style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '2px 4px 10px 16px' }}
        >
          {erro ? (
            <span style={{ fontSize: 11, color: 'var(--erro)' }}>{erro}</span>
          ) : ativo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c3)' }}>
                  {nomeDoConteudo(ativo)}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {admin && (
                    <button type="button" onClick={criarPasta} disabled={salvando} style={botaoAcao}>
                      + Nova pasta
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTabelaAberta(true)}
                    style={{ ...botaoAcao, background: 'transparent' }}
                  >
                    Tabela de preços
                  </button>
                </div>
              </div>

              {aviso ? <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{aviso}</span> : null}

              {pastaAberta ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setPastaAbertaId(null)}
                      style={botaoDiscreto}
                    >
                      ← Pastas
                    </button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c1)' }}>
                      {pastaAberta.nome}
                    </span>
                    <span style={{ fontSize: 9.5, color: 'var(--c2)' }}>
                      {contarItens(pastaAberta)} item(ns)
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {admin && (
                      <button
                        type="button"
                        onClick={() => setItemEmEdicao({ pastaId: pastaAberta.id, item: null })}
                        style={{
                          minHeight: 158,
                          borderRadius: 10,
                          border: `1px dashed ${dourado(35)}`,
                          background: dourado(6),
                          color: 'var(--c1)',
                          fontFamily: 'var(--font-main)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Novo item
                      </button>
                    )}

                    {pastaAberta.itens.map((item) => (
                      <CardItem
                        key={item.id}
                        item={item}
                        admin={admin}
                        onAbrir={() => setItemEmEdicao({ pastaId: pastaAberta.id, item })}
                        onRemover={() => removerItem(pastaAberta.id, item.id)}
                      />
                    ))}
                  </div>

                  {!pastaAberta.itens.length && (
                    <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.75 }}>
                      Pasta vazia.
                      {admin ? ' Comece pelo “Novo item”.' : ''}
                    </span>
                  )}
                </>
              ) : pastas.length ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 8,
                  }}
                >
                  {pastas.map((pasta) => (
                    <div
                      key={pasta.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        padding: '9px 10px',
                        borderRadius: 10,
                        border: `1px solid ${escuro(14)}`,
                        background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
                      }}
                    >
                      <div
                        onClick={() => setPastaAbertaId(pasta.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ color: 'var(--c1)', flexShrink: 0 }}
                          aria-hidden="true"
                        >
                          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                        {admin ? (
                          <input
                            value={pasta.nome}
                            onClick={(evento) => evento.stopPropagation()}
                            onChange={(evento) => renomearPasta(pasta.id, evento.target.value)}
                            onBlur={() => gravarNomePasta(pasta.id)}
                            onKeyDown={(evento) => {
                              if (evento.key === 'Enter') evento.currentTarget.blur();
                            }}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--c3)',
                              fontFamily: 'var(--font-main)',
                              fontSize: 11,
                              fontWeight: 700,
                              outline: 'none',
                              padding: 0,
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--c3)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {pasta.nome}
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: 9.5, color: 'var(--c2)' }}>
                        {contarItens(pasta)} item(ns)
                      </span>

                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          type="button"
                          onClick={() => setPastaAbertaId(pasta.id)}
                          style={{ ...botaoDiscreto, flex: 1, padding: '4px 6px', fontSize: 9.5 }}
                        >
                          Abrir
                        </button>
                        {admin &&
                          (confirmarPasta === pasta.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => removerPasta(pasta.id)}
                                style={{
                                  ...botaoDiscreto,
                                  padding: '4px 6px',
                                  fontSize: 9.5,
                                  color: 'var(--erro)',
                                  border: '1px solid color-mix(in srgb, var(--erro) 35%, transparent)',
                                }}
                              >
                                Apagar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmarPasta(null)}
                                style={{ ...botaoDiscreto, padding: '4px 6px', fontSize: 9.5 }}
                              >
                                Não
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmarPasta(pasta.id)}
                              aria-label="Remover pasta"
                              style={{
                                ...botaoDiscreto,
                                padding: '4px 7px',
                                fontSize: 9.5,
                                color: 'var(--erro)',
                                border: '1px solid color-mix(in srgb, var(--erro) 28%, transparent)',
                              }}
                            >
                              ✕
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: 24,
                    textAlign: 'center',
                    borderRadius: 12,
                    border: `1px dashed ${dourado(22)}`,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      color: 'var(--c1)',
                      background: dourado(12),
                      border: `1px solid ${dourado(26)}`,
                    }}
                  >
                    <ImageIcon size={20} />
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--c2)', maxWidth: 340 }}>
                    {admin
                      ? 'Nenhuma pasta ainda. Crie a primeira para guardar fotos, vídeos e áudios da modelo.'
                      : 'Nada por aqui ainda.'}
                  </span>
                  {admin && (
                    <button type="button" onClick={criarPasta} disabled={salvando} style={botaoAcao}>
                      Criar primeira pasta
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            !carregando && (
              <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.7 }}>
                Escolha uma modelo na lista ao lado.
              </span>
            )
          )}
        </div>
      </div>

      {tabelaAberta && ativo ? (
        <ModalTabelaPrecos
          conteudo={ativo}
          admin={admin}
          onFechar={() => setTabelaAberta(false)}
          onSalvo={recarregar}
        />
      ) : null}

      {itemEmEdicao ? (
        <ModalItem
          item={itemEmEdicao.item}
          sugestoesTags={sugestoes}
          somenteLeitura={!admin}
          onFechar={() => setItemEmEdicao(null)}
          onSalvar={salvarItem}
        />
      ) : null}
    </Window>
  );
}
