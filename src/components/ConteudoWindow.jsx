import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import { useIsMobile } from '@/hooks/use-mobile';
import { ImageIcon } from '@/components/icons';
import useConteudos from '@/hooks/useConteudos';
import useTagsConteudo from '@/hooks/useTagsConteudo';
import { useAuth } from '@/lib/AuthContext';
import { nomeDoConteudo } from '@/lib/conteudos';
import {
  conteudoNormalizado,
  contarItens,
  filtrarItens,
  itensDaPasta,
  juntarTags,
  nomesDasPastas,
  novaPastaConteudo,
  pastaPorId,
  tagNormalizada,
  tagsDeConteudos,
  trocarTagNoItem,
  usoDasTags,
} from '@/lib/conteudoPastas';
import ModalTabelaPrecos from '@/components/conteudo/ModalTabelaPrecos';
import ModalItem from '@/components/conteudo/ModalItem';
import CardItem from '@/components/conteudo/CardItem';
import SeletorTags from '@/components/conteudo/SeletorTags';
import ModalTags from '@/components/conteudo/ModalTags';

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

const campoBusca = {
  flex: 1,
  minWidth: 120,
  padding: '7px 10px',
  borderRadius: 8,
  border: `1px solid ${escuro(18)}`,
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  outline: 'none',
  boxSizing: 'border-box',
};

const grade = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
  gap: 8,
};

/**
 * Janela de Conteúdo: uma parte por modelo, igual ao playbook.
 *
 * Dentro da parte da modelo ficam as pastas e os itens. O item é único e pode
 * aparecer em mais de uma pasta. Quem decide isso é o campo "Pastas" do
 * formulário do item, que exige pelo menos uma marcada.
 *
 * No topo da área ficam a busca (descrição e tags) e o filtro por tags: quando
 * algum dos dois está ativo, a janela mostra o resultado de todas as pastas.
 */
export default function ConteudoWindow({ onClose }) {
  /* No celular a lista de modelos e o conteudo nao cabem lado a lado. */
  const pequeno = useIsMobile();
  const [verConteudo, setVerConteudo] = useState(false);
  const { user } = useAuth();
  const { conteudos, carregando, erro, admin, recarregar } = useConteudos();
  const {
    tags: tagsRegistradas,
    carregado: tagsCarregadas,
    registrar,
    renomear: renomearTag,
    excluir: excluirTag,
    recarregar: recarregarTags,
  } = useTagsConteudo();
  const [ativoId, setAtivoId] = useState(null);
  const [tabelaAberta, setTabelaAberta] = useState(false);
  const [pastaAbertaId, setPastaAbertaId] = useState(null);
  const [estado, setEstado] = useState({ pastas: [], itens: [] });
  const [itemEmEdicao, setItemEmEdicao] = useState(null);
  const [confirmarPasta, setConfirmarPasta] = useState(null);
  const [busca, setBusca] = useState('');
  const [tagsFiltro, setTagsFiltro] = useState([]);
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [tagsAbertas, setTagsAbertas] = useState(false);
  const [mexendoTags, setMexendoTags] = useState(false);

  const ativo = conteudos.find((item) => item.id === ativoId) || conteudos[0] || null;
  const { pastas, itens } = estado;
  const pastaAberta = pastaPorId(pastas, pastaAbertaId);
  const autor = user?.full_name || user?.email || '';

  /* A tag é geral: somam-se o cadastro e as tags de TODOS os conteúdos, não só
     as do modelo que está aberto. */
  const sugestoes = juntarTags([...tagsRegistradas, ...tagsDeConteudos(conteudos)]);
  const filtrando = Boolean(busca.trim()) || tagsFiltro.length > 0;
  const resultados = filtrarItens(itens, { busca, tags: tagsFiltro });

  useEffect(() => {
    setEstado(conteudoNormalizado(ativo));
    setPastaAbertaId(null);
    setBusca('');
    setTagsFiltro([]);
    setAviso('');
  }, [ativo?.id]);

  /* Rede de segurança: tag que já estava num item salvo antes de existir o
     cadastro entra nele na primeira vez que a modelo é aberta. */
  useEffect(() => {
    /* Enquanto uma tag está sendo renomeada ou apagada, a lista de conteúdos
       ainda é a de antes: registrar agora traria a tag de volta. */
    if (!admin || !tagsCarregadas || mexendoTags || !conteudos.length) return;
    const usadas = tagsDeConteudos(conteudos);
    if (usadas.length) registrar(usadas, autor);
  }, [admin, tagsCarregadas, mexendoTags, conteudos, registrar, autor]);

  /* O que está na tela vale mais que o banco: o modelo aberto entra com o
     estado vivo (com o que acabou de ser salvo). */
  const conteudosAoVivo = useMemo(
    () =>
      (conteudos || []).map((registro) =>
        registro.id === ativo?.id
          ? { ...registro, pastas: estado.pastas, itens: estado.itens }
          : registro
      ),
    [conteudos, ativo?.id, estado]
  );

  const uso = useMemo(() => usoDasTags(conteudosAoVivo), [conteudosAoVivo]);

  /* Toda mexida em pasta ou item é salva na hora; se o banco recusar, a tela
     volta para o que estava antes e a pessoa é avisada. */
  const persistir = async (novo, mensagemFalha) => {
    if (!ativo?.id || !admin) return false;
    const antes = estado;
    setEstado(novo);
    setSalvando(true);
    setAviso('');
    try {
      await base44.entities.Conteudo.update(ativo.id, {
        pastas: novo.pastas,
        itens: novo.itens,
        atualizado_por: user?.id || '',
        atualizado_por_nome: autor,
      });
      return true;
    } catch (falha) {
      console.warn('[Conteúdo] salvar', falha);
      setEstado(antes);
      setAviso(mensagemFalha || 'Não consegui salvar agora. Tente de novo.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const criarPasta = async () => {
    const nova = novaPastaConteudo(`Pasta ${pastas.length + 1}`);
    const salvou = await persistir(
      { ...estado, pastas: [...pastas, nova] },
      'Não consegui criar a pasta agora.'
    );
    if (salvou) {
      setPastaAbertaId(nova.id);
      setBusca('');
      setTagsFiltro([]);
    }
  };

  const renomearPasta = (pastaId, nome) => {
    setEstado((atual) => ({
      ...atual,
      pastas: atual.pastas.map((pasta) => (pasta.id === pastaId ? { ...pasta, nome } : pasta)),
    }));
  };

  const gravarNomePasta = async (pastaId) => {
    const pasta = pastaPorId(pastas, pastaId);
    if (!pasta) return;
    const nome = String(pasta.nome || '').trim() || 'Sem nome';
    await persistir(
      { ...estado, pastas: pastas.map((item) => (item.id === pastaId ? { ...item, nome } : item)) },
      'Não consegui renomear a pasta agora.'
    );
  };

  const removerPasta = async (pastaId) => {
    const dentro = contarItens(itens, pastaId);
    if (dentro > 0) {
      setConfirmarPasta(null);
      setAviso(
        `Essa pasta tem ${dentro} item(ns). Tire eles da pasta (no campo "Pastas" do item) antes de apagar.`
      );
      return;
    }
    setConfirmarPasta(null);
    if (pastaAbertaId === pastaId) setPastaAbertaId(null);
    await persistir(
      { ...estado, pastas: pastas.filter((pasta) => pasta.id !== pastaId) },
      'Não consegui apagar a pasta agora.'
    );
  };

  const salvarItem = async (item) => {
    const existe = itens.some((linha) => linha.id === item.id);
    const novosItens = existe
      ? itens.map((linha) => (linha.id === item.id ? item : linha))
      : [...itens, item];
    setItemEmEdicao(null);
    await persistir({ ...estado, itens: novosItens }, 'Não consegui salvar o item agora.');
    await registrar(item.tags, autor);
  };

  const removerItem = async (itemId) => {
    await persistir(
      { ...estado, itens: itens.filter((linha) => linha.id !== itemId) },
      'Não consegui remover o item agora.'
    );
  };

  /* Alterar e apagar tag vale para todas as modelos: percorre todos os
     conteúdos, troca nos itens e só depois mexe no cadastro. */
  const aplicarNaTag = async (de, para) => {
    const origem = tagNormalizada(de);
    if (!origem) return { ok: true };

    setMexendoTags(true);
    setAviso('');
    try {
      const alterados = [];
      const atualizados = conteudosAoVivo.map((registro) => {
        const lista = Array.isArray(registro.itens) ? registro.itens : [];
        let mudou = false;
        const novos = lista.map((item) => {
          const novo = trocarTagNoItem(item, origem, para);
          if (novo !== item) mudou = true;
          return novo;
        });
        if (!mudou) return registro;
        alterados.push({ id: registro.id, itens: novos });
        return { ...registro, itens: novos };
      });

      await Promise.all(
        alterados.map(({ id, itens: novosItens }) =>
          base44.entities.Conteudo.update(id, { itens: novosItens })
        )
      );

      const ativoNovo = atualizados.find((registro) => registro.id === ativo?.id);
      if (ativoNovo) {
        setEstado({ pastas: ativoNovo.pastas || [], itens: ativoNovo.itens || [] });
      }

      if (para) await renomearTag(origem, para);
      else await excluirTag(origem);

      await Promise.all([recarregar(), recarregarTags()]);
      return { ok: true, itens: alterados.length };
    } catch (falha) {
      console.warn('[Tags] alterar', falha);
      return { ok: false, erro: 'Não consegui salvar a alteração da tag agora.' };
    } finally {
      setMexendoTags(false);
    }
  };

  const cartaoDoItem = (item) => (
    <CardItem
      key={item.id}
      item={item}
      admin={admin}
      pastasNomes={nomesDasPastas(item, pastas)}
      onAbrir={() => setItemEmEdicao({ item })}
      onRemover={() => removerItem(item.id)}
    />
  );

  return (
    <Window title="Conteúdo" icon={ImageIcon} onClose={onClose} width={820} height={560}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0, gap: 0 }}>
        {/* Uma entrada por modelo que a pessoa pode ver. */}
        <div
          className="glass-scroll"
          style={{
            width: pequeno ? '100%' : 196,
            flexShrink: 0,
            display: pequeno && verConteudo ? 'none' : 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: pequeno ? '2px 2px 10px' : '2px 10px 10px 2px',
            overflowY: 'auto',
            borderRight: pequeno ? 'none' : `1px solid ${escuro(14)}`,
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
                onClick={() => {
                  setAtivoId(conteudo.id);
                  setVerConteudo(true);
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
                  {nomeDoConteudo(conteudo)}
                </span>
                <span style={{ fontSize: 8.5, opacity: 0.7, letterSpacing: '0.05em' }}>MODELO</span>
              </button>
            );
          })}
        </div>

        <div
          className="glass-scroll"
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            padding: pequeno ? '2px 2px 10px' : '2px 4px 10px 16px',
            display: pequeno && !verConteudo ? 'none' : undefined,
          }}
        >
          {pequeno ? (
            <button
              type="button"
              onClick={() => setVerConteudo(false)}
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 32,
                padding: '0 10px 0 6px',
                marginBottom: 8,
                borderRadius: 9,
                border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                background: 'transparent',
                color: 'var(--c3)',
                fontFamily: 'var(--font-main)',
                fontSize: 11,
              }}
            >
              ‹ Modelos
            </button>
          ) : null}

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
                  {admin && (
                    <button
                      type="button"
                      onClick={() => setTagsAbertas(true)}
                      style={{ ...botaoAcao, background: 'transparent' }}
                    >
                      Tags
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

              {/* busca e filtro: valem para todas as pastas da modelo */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  placeholder="Buscar na descrição ou nas tags"
                  style={campoBusca}
                />
                <div style={{ width: 210 }}>
                  <SeletorTags
                    valor={tagsFiltro}
                    onChange={setTagsFiltro}
                    sugestoes={sugestoes}
                    label="Filtrar por tags"
                    permiteCriar={false}
                  />
                </div>
                {filtrando && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusca('');
                      setTagsFiltro([]);
                    }}
                    style={botaoDiscreto}
                  >
                    Limpar
                  </button>
                )}
              </div>

              {aviso ? <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{aviso}</span> : null}

              {filtrando ? (
                <>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c1)' }}>
                    {resultados.length} resultado(s) em todas as pastas
                  </span>
                  {resultados.length ? (
                    <div style={grade}>{resultados.map(cartaoDoItem)}</div>
                  ) : (
                    <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.75 }}>
                      Nada encontrado com esse termo e essas tags.
                    </span>
                  )}
                </>
              ) : pastaAberta ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" onClick={() => setPastaAbertaId(null)} style={botaoDiscreto}>
                      ← Pastas
                    </button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c1)' }}>
                      {pastaAberta.nome}
                    </span>
                    <span style={{ fontSize: 9.5, color: 'var(--c2)' }}>
                      {itensDaPasta(itens, pastaAberta.id).length} item(ns)
                    </span>
                  </div>

                  <div style={grade}>
                    {admin && (
                      <button
                        type="button"
                        onClick={() => setItemEmEdicao({ item: null, pastaInicial: pastaAberta.id })}
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

                    {itensDaPasta(itens, pastaAberta.id).map(cartaoDoItem)}
                  </div>

                  {!itensDaPasta(itens, pastaAberta.id).length && (
                    <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.75 }}>
                      Pasta vazia.{admin ? ' Comece pelo “Novo item”.' : ''}
                    </span>
                  )}
                </>
              ) : pastas.length ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(212px, 1fr))',
                    gap: 12,
                  }}
                >
                  {pastas.map((pasta) => (
                    <div
                      key={pasta.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 9,
                        minHeight: 142,
                        padding: '14px 14px 13px',
                        borderRadius: 12,
                        border: `1px solid ${escuro(14)}`,
                        background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
                      }}
                    >
                      <div
                        onClick={() => setPastaAbertaId(pasta.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                      >
                        <svg
                          width="26"
                          height="26"
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
                              fontSize: 12.5,
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
                              fontSize: 12.5,
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

                      <span style={{ fontSize: 10.5, color: 'var(--c2)' }}>
                        {contarItens(itens, pasta.id)} item(ns)
                      </span>

                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          type="button"
                          onClick={() => setPastaAbertaId(pasta.id)}
                          style={{ ...botaoDiscreto, flex: 1, padding: '7px 10px', fontSize: 11 }}
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
                                  padding: '7px 10px',
                                  fontSize: 11,
                                  color: 'var(--erro)',
                                  border: '1px solid color-mix(in srgb, var(--erro) 35%, transparent)',
                                }}
                              >
                                Apagar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmarPasta(null)}
                                style={{ ...botaoDiscreto, padding: '7px 10px', fontSize: 11 }}
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
                                padding: '7px 11px',
                                fontSize: 11,
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

      {tagsAbertas ? (
        <ModalTags
          uso={uso}
          ocupado={mexendoTags}
          onRenomear={(de, para) => aplicarNaTag(de, para)}
          onExcluir={(tag) => aplicarNaTag(tag, '')}
          onFechar={() => setTagsAbertas(false)}
        />
      ) : null}

      {itemEmEdicao ? (
        <ModalItem
          item={itemEmEdicao.item}
          pastaInicial={itemEmEdicao.pastaInicial || null}
          pastasDisponiveis={pastas}
          sugestoesTags={sugestoes}
          onCriarTag={(tag) => registrar([tag], autor)}
          somenteLeitura={!admin}
          onFechar={() => setItemEmEdicao(null)}
          onSalvar={salvarItem}
        />
      ) : null}
    </Window>
  );
}
