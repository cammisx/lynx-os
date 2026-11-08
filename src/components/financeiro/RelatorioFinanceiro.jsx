import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import GlassSelect from '@/components/GlassSelect';
import RelatorioSemanalModal from '@/components/financeiro/RelatorioSemanalModal';
import { DownloadIcon } from '@/components/icons';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  filtrarVendasDoRelatorio,
  fimDoMes,
  inicioDoMes,
  mesLabel,
  moeda,
  percentual,
  resumirVendas,
  somarMeses,
} from '@/lib/financeiro';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const rotulo = {
  fontSize: 9.5,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--c2)',
};

const cartao = {
  borderRadius: 12,
  border: '1px solid color-mix(in srgb, var(--c1) 14%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  minWidth: 0,
};

const celula = { padding: '5px 6px', whiteSpace: 'nowrap' };

const navegacao = {
  width: 26,
  height: 26,
  borderRadius: 7,
  border: '1px solid color-mix(in srgb, var(--c2) 25%, transparent)',
  background: 'transparent',
  color: 'var(--c2)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-main)',
  fontSize: 12,
  padding: 0,
};

/* No celular a tabela de oito colunas não cabe: cada linha do resumo vira um
   cartão com os mesmos números, numa grade de duas colunas. */
function DuplaDeValores({ itens }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '8px 10px',
      }}
    >
      {itens.map((item) => (
        <div key={item.titulo} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--c2)' }}>
            {item.titulo}
          </span>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: item.cor || 'var(--c3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.valor}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RelatorioFinanceiro({ modelos, chatters }) {
  const pequeno = useIsMobile();
  const [referencia, setReferencia] = useState(() => new Date());
  const [modeloId, setModeloId] = useState('');
  const [pdfAberto, setPdfAberto] = useState(false);
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  /* inicioDoMes/fimDoMes devolvem um Date novo a cada chamada: guardados com
     useMemo, o efeito de busca roda só quando o mês muda de verdade. */
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const inicio = useMemo(() => inicioDoMes(new Date(ano, mes, 1)), [ano, mes]);
  const fim = useMemo(() => fimDoMes(new Date(ano, mes, 1)), [ano, mes]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    base44.entities.VendaMimo.filter(
      { ocorrido_em: { $gte: inicio.toISOString() }, status: 'aprovada' },
      { sort: '-ocorrido_em', limit: 500 }
    )
      .then((resultado) => {
        if (!ativo) return;
        const lista = asList(resultado).filter((venda) => {
          const quando = new Date(venda.ocorrido_em).getTime();
          return Number.isFinite(quando) && quando >= inicio.getTime() && quando < fim.getTime();
        });
        setVendas(lista);
      })
      .catch(() => {
        if (ativo) setErro('Não consegui carregar as vendas do período.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [inicio, fim]);

  /* Relatório só conta venda de chat atribuída pelo centavo do bruto ao
     chatter da modelo. Assinatura, postagem e mimo ficam fora. */
  const filtradas = useMemo(
    () =>
      filtrarVendasDoRelatorio(
        vendas.filter((venda) => !modeloId || venda.modelo_id === modeloId),
        modelos
      ),
    [vendas, modeloId, modelos]
  );

  const resumo = useMemo(
    () => resumirVendas(filtradas, { modelos, chatters }),
    [filtradas, modelos, chatters]
  );

  const cards = [
    { titulo: 'Bruto', valor: moeda(resumo.total.bruto) },
    { titulo: 'Líquido', valor: moeda(resumo.total.liquido) },
    { titulo: 'Agência', valor: moeda(resumo.total.agencia), cor: 'var(--c1)' },
    { titulo: 'Chatters', valor: moeda(resumo.total.chatter), cor: 'var(--info)' },
    { titulo: 'Sobra da agência', valor: moeda(resumo.total.agenciaLiquida), cor: 'var(--ok)' },
    { titulo: 'Repasse das modelos', valor: moeda(resumo.total.repasseModelo) },
  ];

  const botaoPdf = {
    marginLeft: pequeno ? 0 : 'auto',
    width: pequeno ? '100%' : undefined,
    height: pequeno ? 38 : 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid color-mix(in srgb, var(--c1) 55%, transparent)',
    background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
    color: 'var(--c1)',
    fontFamily: 'var(--font-main)',
    fontSize: pequeno ? 12.5 : 11.5,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          gap: pequeno ? 10 : 10,
          alignItems: pequeno ? 'stretch' : 'flex-end',
          flexDirection: pequeno ? 'column' : 'row',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: pequeno ? '100%' : undefined,
          }}
        >
          <button type="button" style={navegacao} onClick={() => setReferencia((atual) => somarMeses(atual, -1))}>
            ‹
          </button>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--c3)',
              minWidth: 140,
              flex: pequeno ? 1 : undefined,
              textAlign: 'center',
              textTransform: 'capitalize',
            }}
          >
            {mesLabel(referencia)}
          </span>
          <button type="button" style={navegacao} onClick={() => setReferencia((atual) => somarMeses(atual, 1))}>
            ›
          </button>
        </div>

        <div style={{ width: pequeno ? '100%' : 190 }}>
          <GlassSelect
            value={modeloId}
            onChange={setModeloId}
            options={[
              { value: '', label: 'Todas as modelos' },
              ...modelos.map((modelo) => ({ value: modelo.id, label: modelo.nome })),
            ]}
            label="Modelo"
          />
        </div>

        <span
          style={{
            fontSize: 11,
            color: 'var(--c2)',
            marginLeft: pequeno ? 0 : 2,
            textAlign: pequeno ? 'center' : undefined,
          }}
        >
          {carregando ? 'Carregando...' : `${filtradas.length} venda(s) de chat`}
        </span>

        <button type="button" onClick={() => setPdfAberto(true)} style={botaoPdf}>
          <DownloadIcon size={14} />
          Relatório semanal
        </button>
      </div>

      {erro && <span style={{ fontSize: 11, color: 'var(--erro)' }}>{erro}</span>}

      <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.8, marginTop: -4 }}>
        Entram só as transações do tipo Chat cujo centavo do valor bruto é o identificador do
        chatter na modelo.
      </span>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: pequeno ? 'repeat(2, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))',
          gap: pequeno ? 7 : 8,
        }}
      >
        {cards.map((card) => (
          <div key={card.titulo} style={{ ...cartao, padding: pequeno ? '9px 11px' : cartao.padding }}>
            <span style={{ ...rotulo, fontSize: pequeno ? 8.5 : rotulo.fontSize, lineHeight: 1.25 }}>
              {card.titulo}
            </span>
            <span style={{ fontSize: pequeno ? 13 : 14, fontWeight: 700, color: card.cor || 'var(--c3)' }}>
              {card.valor}
            </span>
          </div>
        ))}
      </div>

      {resumo.semChatter.vendas > 0 && (
        <span style={{ fontSize: 11, color: 'var(--aviso)' }}>
          {resumo.semChatter.vendas} venda(s) sem chatter atribuído, somando{' '}
          {moeda(resumo.semChatter.bruto)} de bruto. Confere o identificador na modelo.
        </span>
      )}

      <div className="glass-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section>
          <h3 style={{ ...rotulo, margin: '0 0 6px' }}>Por modelo</h3>

          {pequeno ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resumo.porModelo.map((linha) => (
                <div key={linha.modelo_id || linha.modelo_nome} style={{ ...cartao, gap: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--c3)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {linha.modelo_nome}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--c2)', whiteSpace: 'nowrap' }}>
                      {linha.vendas} venda(s)
                    </span>
                  </div>
                  <div style={{ height: 8 }} />
                  <DuplaDeValores
                    itens={[
                      { titulo: 'Bruto', valor: moeda(linha.bruto) },
                      { titulo: 'Líquido', valor: moeda(linha.liquido) },
                      {
                        titulo: 'Agência',
                        valor: `${moeda(linha.agencia)} · ${percentual(linha.comissao_agencia)}`,
                        cor: 'var(--c1)',
                      },
                      { titulo: 'Chatters', valor: moeda(linha.chatter), cor: 'var(--info)' },
                      { titulo: 'Sobra ag.', valor: moeda(linha.agenciaLiquida), cor: 'var(--ok)' },
                      { titulo: 'Repasse', valor: moeda(linha.repasseModelo) },
                    ]}
                  />
                </div>
              ))}
              {!resumo.porModelo.length && (
                <span style={{ fontSize: 11, color: 'var(--c2)' }}>Nenhuma venda aprovada neste mês.</span>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: 'var(--c3)' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  {['Modelo', 'Vendas', 'Bruto', 'Líquido', 'Agência', 'Chatters', 'Sobra ag.', 'Repasse'].map(
                    (titulo) => (
                      <th
                        key={titulo}
                        style={{
                          ...rotulo,
                          ...celula,
                          fontWeight: 600,
                          borderBottom: '1px solid color-mix(in srgb, var(--c2) 15%, transparent)',
                        }}
                      >
                        {titulo}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {resumo.porModelo.map((linha) => (
                  <tr key={linha.modelo_id || linha.modelo_nome}>
                    <td style={celula}>{linha.modelo_nome}</td>
                    <td style={{ ...celula, color: 'var(--c2)' }}>{linha.vendas}</td>
                    <td style={celula}>{moeda(linha.bruto)}</td>
                    <td style={celula}>{moeda(linha.liquido)}</td>
                    <td style={{ ...celula, color: 'var(--c1)' }}>
                      {moeda(linha.agencia)} · {percentual(linha.comissao_agencia)}
                    </td>
                    <td style={{ ...celula, color: 'var(--info)' }}>{moeda(linha.chatter)}</td>
                    <td style={{ ...celula, color: 'var(--ok)' }}>{moeda(linha.agenciaLiquida)}</td>
                    <td style={celula}>{moeda(linha.repasseModelo)}</td>
                  </tr>
                ))}
                {!resumo.porModelo.length && (
                  <tr>
                    <td style={{ ...celula, color: 'var(--c2)' }} colSpan={8}>
                      Nenhuma venda aprovada neste mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h3 style={{ ...rotulo, margin: '0 0 6px' }}>Por chatter</h3>

          {pequeno ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resumo.porChatter.map((linha) => (
                <div key={linha.usuario_id} style={{ ...cartao, gap: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--c3)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {linha.chatter_nome}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--c2)', whiteSpace: 'nowrap' }}>
                      {percentual(linha.comissao)}
                    </span>
                  </div>
                  <div style={{ height: 8 }} />
                  <DuplaDeValores
                    itens={[
                      { titulo: 'Vendas', valor: linha.vendas },
                      { titulo: 'Líquido base', valor: moeda(linha.liquido) },
                      { titulo: 'Comissão', valor: moeda(linha.chatter), cor: 'var(--info)' },
                    ]}
                  />
                </div>
              ))}
              {!resumo.porChatter.length && (
                <span style={{ fontSize: 11, color: 'var(--c2)' }}>
                  Nenhuma venda atribuída a chatter neste mês.
                </span>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: 'var(--c3)' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  {['Chatter', 'Vendas', 'Líquido base', 'Comissão'].map((titulo) => (
                    <th
                      key={titulo}
                      style={{
                        ...rotulo,
                        ...celula,
                        fontWeight: 600,
                        borderBottom: '1px solid color-mix(in srgb, var(--c2) 15%, transparent)',
                      }}
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resumo.porChatter.map((linha) => (
                  <tr key={linha.usuario_id}>
                    <td style={celula}>
                      {linha.chatter_nome}{' '}
                      <span style={{ color: 'var(--c2)' }}>· {percentual(linha.comissao)}</span>
                    </td>
                    <td style={{ ...celula, color: 'var(--c2)' }}>{linha.vendas}</td>
                    <td style={celula}>{moeda(linha.liquido)}</td>
                    <td style={{ ...celula, color: 'var(--info)', fontWeight: 700 }}>{moeda(linha.chatter)}</td>
                  </tr>
                ))}
                {!resumo.porChatter.length && (
                  <tr>
                    <td style={{ ...celula, color: 'var(--c2)' }} colSpan={4}>
                      Nenhuma venda atribuída a chatter neste mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {pdfAberto && (
        <RelatorioSemanalModal
          modelos={modelos.filter((modelo) => !modelo.arquivada)}
          chatters={chatters}
          onClose={() => setPdfAberto(false)}
        />
      )}
    </div>
  );
}
