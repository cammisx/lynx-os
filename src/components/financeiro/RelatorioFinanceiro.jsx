import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import GlassSelect from '@/components/GlassSelect';
import {
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

export default function RelatorioFinanceiro({ modelos, chatters }) {
  const [referencia, setReferencia] = useState(() => new Date());
  const [modeloId, setModeloId] = useState('');
  const [plataforma, setPlataforma] = useState('');
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const inicio = inicioDoMes(referencia);
  const fim = fimDoMes(referencia);

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

  const filtradas = useMemo(
    () =>
      vendas.filter((venda) => {
        if (modeloId && venda.modelo_id !== modeloId) return false;
        if (plataforma && venda.plataforma !== plataforma) return false;
        return true;
      }),
    [vendas, modeloId, plataforma]
  );

  const resumo = useMemo(
    () => resumirVendas(filtradas, { modelos, chatters }),
    [filtradas, modelos, chatters]
  );

  const cards = [
    { titulo: 'Bruto', valor: moeda(resumo.total.bruto) },
    { titulo: 'Líquido', valor: moeda(resumo.total.liquido) },
    { titulo: 'Agência', valor: moeda(resumo.total.agencia), cor: 'var(--c1)' },
    { titulo: 'Chatters', valor: moeda(resumo.total.chatter), cor: '#3B9EFF' },
    { titulo: 'Sobra da agência', valor: moeda(resumo.total.agenciaLiquida), cor: '#7bd88f' },
    { titulo: 'Repasse das modelos', valor: moeda(resumo.total.repasseModelo) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" style={navegacao} onClick={() => setReferencia((atual) => somarMeses(atual, -1))}>
            ‹
          </button>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--c3)',
              minWidth: 140,
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

        <div style={{ width: 190 }}>
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

        <div style={{ width: 170 }}>
          <GlassSelect
            value={plataforma}
            onChange={setPlataforma}
            options={[
              { value: '', label: 'Todas as plataformas' },
              { value: 'privacy', label: 'Privacy' },
              { value: 'onlyfans', label: 'OnlyFans' },
              { value: 'fansly', label: 'Fansly' },
            ]}
            label="Plataforma"
          />
        </div>

        <span style={{ fontSize: 11, color: 'var(--c2)' }}>
          {carregando ? 'Carregando...' : `${filtradas.length} venda(s) aprovada(s)`}
        </span>
      </div>

      {erro && <span style={{ fontSize: 11, color: '#ff6b6b' }}>{erro}</span>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
        {cards.map((card) => (
          <div key={card.titulo} style={cartao}>
            <span style={rotulo}>{card.titulo}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: card.cor || 'var(--c3)' }}>
              {card.valor}
            </span>
          </div>
        ))}
      </div>

      {resumo.semChatter.vendas > 0 && (
        <span style={{ fontSize: 11, color: '#e8b93b' }}>
          {resumo.semChatter.vendas} venda(s) sem chatter atribuído, somando{' '}
          {moeda(resumo.semChatter.bruto)} de bruto. Confere o identificador na modelo.
        </span>
      )}

      <div className="glass-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section>
          <h3 style={{ ...rotulo, margin: '0 0 6px' }}>Por modelo</h3>
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
                  <td style={{ ...celula, color: '#3B9EFF' }}>{moeda(linha.chatter)}</td>
                  <td style={{ ...celula, color: '#7bd88f' }}>{moeda(linha.agenciaLiquida)}</td>
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
        </section>

        <section>
          <h3 style={{ ...rotulo, margin: '0 0 6px' }}>Por chatter</h3>
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
                    {linha.chatter_nome} <span style={{ color: 'var(--c2)' }}>· {percentual(linha.comissao)}</span>
                  </td>
                  <td style={{ ...celula, color: 'var(--c2)' }}>{linha.vendas}</td>
                  <td style={celula}>{moeda(linha.liquido)}</td>
                  <td style={{ ...celula, color: '#3B9EFF', fontWeight: 700 }}>{moeda(linha.chatter)}</td>
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
        </section>
      </div>
    </div>
  );
}
