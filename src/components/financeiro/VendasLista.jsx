import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import GlassSelect from '@/components/GlassSelect';
import { CloseIcon, TrashIcon } from '@/components/icons';
import { calcularVenda, fimDoMes, inicioDoMes, mesLabel, moeda, somarMeses } from '@/lib/financeiro';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const POR_PAGINA = [
  { value: '25', label: '25 por página' },
  { value: '50', label: '50 por página' },
  { value: '100', label: '100 por página' },
];

const COR_AVISO = '#ffb84d';

const rotulo = {
  fontSize: 9.5,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--c2)',
};

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

const celula = { padding: '5px 6px', whiteSpace: 'nowrap' };

const statusDaVenda = (status) => {
  if (status === 'pendente') return { texto: 'Pendente', cor: COR_AVISO };
  if (status === 'recusada') return { texto: 'Recusada', cor: '#ff6b6b' };
  return { texto: 'Aprovada', cor: 'var(--c1)' };
};

const dataHora = (iso) => {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/** Caixinha de seleção em vidro, no lugar do checkbox nativo. */
function CaixaSelecao({ marcada, parcial, onClick, rotuloAcessivel }) {
  return (
    <button
      type="button"
      aria-label={rotuloAcessivel}
      aria-pressed={marcada}
      onClick={onClick}
      style={{
        width: 16,
        height: 16,
        borderRadius: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
        border: marcada
          ? '1px solid color-mix(in srgb, var(--c1) 75%, transparent)'
          : '1px solid color-mix(in srgb, var(--c2) 45%, transparent)',
        background: marcada
          ? 'color-mix(in srgb, var(--c1) 30%, transparent)'
          : 'color-mix(in srgb, var(--c8) 45%, transparent)',
        transition: 'background-color 130ms ease, border-color 130ms ease',
      }}
    >
      {marcada ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--c1)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 12 5 5L20 6" />
        </svg>
      ) : parcial ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--c2)" strokeWidth="3.2" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      ) : null}
    </button>
  );
}

function ConfirmarExclusao({ quantidade, bruto, liquido, porFiltro, apagando, onCancelar, onConfirmar }) {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.34)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: '94vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--c8) 76%, transparent)',
          backdropFilter: 'blur(22px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
          border: '1px solid color-mix(in srgb, white 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
          boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
          fontFamily: 'var(--font-main)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 40,
            flexShrink: 0,
            padding: '0 10px 0 14px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--c1)',
            }}
          >
            Apagar vendas
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={apagando ? undefined : onCancelar}
            style={{
              width: 24,
              height: 24,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--c2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={12} />
          </button>
        </div>

        <div className="glass-scroll" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'color-mix(in srgb, #ff6b6b 12%, transparent)',
              border: '1px solid color-mix(in srgb, #ff6b6b 34%, transparent)',
            }}
          >
            <TrashIcon size={18} />
            <span style={{ fontSize: 11.5, color: 'var(--c3)', lineHeight: 1.5 }}>
              Você está apagando <strong>{quantidade}</strong> venda(s)
              {porFiltro ? ' — todas as que estão dentro do filtro atual' : ''}.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 10,
                background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
              }}
            >
              <span style={{ ...rotulo }}>Bruto</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c3)' }}>{moeda(bruto)}</div>
            </div>
            <div
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 10,
                background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
              }}
            >
              <span style={{ ...rotulo }}>Líquido</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c3)' }}>{moeda(liquido)}</div>
            </div>
          </div>

          <span style={{ fontSize: 10.5, color: 'var(--c2)', lineHeight: 1.6 }}>
            As vendas vão para a lixeira do banco de dados, então dá para restaurar pela aba Dados, em
            "Recently deleted". Relatórios e comissões deixam de contar esses registros.
          </span>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancelar}
              disabled={apagando}
              style={{
                height: 30,
                padding: '0 14px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c2) 25%, transparent)',
                background: 'transparent',
                color: 'var(--c2)',
                fontFamily: 'var(--font-main)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: apagando ? 'default' : 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              disabled={apagando}
              style={{
                height: 30,
                padding: '0 16px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, #ff6b6b 60%, transparent)',
                background: 'color-mix(in srgb, #ff6b6b 22%, transparent)',
                color: '#ffb3b3',
                fontFamily: 'var(--font-main)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: apagando ? 'progress' : 'pointer',
                opacity: apagando ? 0.7 : 1,
              }}
            >
              {apagando ? 'Apagando...' : `Apagar ${quantidade}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const fatiar = (lista, tamanho) => {
  const partes = [];
  for (let indice = 0; indice < lista.length; indice += tamanho) {
    partes.push(lista.slice(indice, indice + tamanho));
  }
  return partes;
};

export default function VendasLista({ modelos, chatters, onMudou }) {
  const [referencia, setReferencia] = useState(() => new Date());
  const [modeloId, setModeloId] = useState('');
  const [chatterId, setChatterId] = useState('');
  const [busca, setBusca] = useState('');
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [porPagina, setPorPagina] = useState(25);
  const [pagina, setPagina] = useState(1);
  const [selecionadas, setSelecionadas] = useState(() => new Set());
  const [confirmacao, setConfirmacao] = useState(null);
  const [apagando, setApagando] = useState(false);
  const [truncado, setTruncado] = useState(false);

  const inicio = inicioDoMes(referencia);
  const fim = fimDoMes(referencia);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    base44.entities.VendaMimo.filter(
      { ocorrido_em: { $gte: inicio.toISOString() } },
      { sort: '-ocorrido_em', limit: 500 }
    )
      .then((resultado) => {
        if (!ativo) return;
        const lista = asList(resultado).filter((venda) => {
          const quando = new Date(venda.ocorrido_em).getTime();
          return Number.isFinite(quando) && quando >= inicio.getTime() && quando < fim.getTime();
        });
        setVendas(lista);
        setTruncado(asList(resultado).length >= 500);
      })
      .catch(() => {
        if (!ativo) return;
        setVendas([]);
        setErro('Não consegui carregar as vendas.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referencia.getFullYear(), referencia.getMonth()]);

  const nomesChatter = useMemo(
    () => new Map(chatters.map((chatter) => [chatter.usuario_id, chatter.nome_exibicao || chatter.usuario_email])),
    [chatters]
  );

  const opcoesChatters = useMemo(() => {
    const vistos = new Set();
    return chatters
      .map((chatter) => {
        const nome = chatter.nome_exibicao || chatter.usuario_email || 'Chatter';
        if (vistos.has(chatter.usuario_id)) return null;
        vistos.add(chatter.usuario_id);
        return { value: chatter.usuario_id, label: nome };
      })
      .filter(Boolean);
  }, [chatters]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return vendas.filter((venda) => {
      if (modeloId && venda.modelo_id !== modeloId) return false;
      if (chatterId && venda.usuario_id !== chatterId) return false;
      if (termo) {
        const alvo = `${venda.usuario_plataforma || ''} ${venda.usuario_nome || ''}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [vendas, modeloId, chatterId, busca]);

  useEffect(() => {
    setPagina(1);
    setSelecionadas(new Set());
    setAviso('');
  }, [modeloId, chatterId, busca, porPagina, referencia]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicioDaPagina = (paginaSegura - 1) * porPagina;
  const visiveis = filtradas.slice(inicioDaPagina, inicioDaPagina + porPagina);

  const modeloPorId = useMemo(() => new Map(modelos.map((modelo) => [modelo.id, modelo])), [modelos]);
  const chatterPorUsuario = useMemo(
    () => new Map(chatters.map((chatter) => [chatter.usuario_id, chatter])),
    [chatters]
  );

  const marcadasNaPagina = visiveis.filter((venda) => selecionadas.has(venda.id)).length;
  const todasDaPagina = visiveis.length > 0 && marcadasNaPagina === visiveis.length;
  const todasDoFiltro = filtradas.length > 0 && filtradas.every((venda) => selecionadas.has(venda.id));

  const alternarPagina = () => {
    const proximas = new Set(selecionadas);
    if (todasDaPagina) visiveis.forEach((venda) => proximas.delete(venda.id));
    else visiveis.forEach((venda) => proximas.add(venda.id));
    setSelecionadas(proximas);
  };

  const alternarUma = (id) => {
    const proximas = new Set(selecionadas);
    if (proximas.has(id)) proximas.delete(id);
    else proximas.add(id);
    setSelecionadas(proximas);
  };

  const alternarFiltro = () => {
    if (todasDoFiltro) setSelecionadas(new Set());
    else setSelecionadas(new Set(filtradas.map((venda) => venda.id)));
  };

  const selecionadasLista = useMemo(
    () => filtradas.filter((venda) => selecionadas.has(venda.id)),
    [filtradas, selecionadas]
  );

  const totaisSelecionados = useMemo(() => {
    let bruto = 0;
    let liquido = 0;
    selecionadasLista.forEach((venda) => {
      const contas = calcularVenda(
        venda,
        modeloPorId.get(venda.modelo_id),
        chatterPorUsuario.get(venda.usuario_id)
      );
      bruto += contas.bruto;
      liquido += contas.liquido;
    });
    return { bruto, liquido };
  }, [selecionadasLista, modeloPorId, chatterPorUsuario]);

  const pedirExclusao = (porFiltro) => {
    const alvo = porFiltro ? filtradas : selecionadasLista;
    if (!alvo.length) return;
    const totais = porFiltro
      ? alvo.reduce(
          (soma, venda) => {
            const contas = calcularVenda(
              venda,
              modeloPorId.get(venda.modelo_id),
              chatterPorUsuario.get(venda.usuario_id)
            );
            return { bruto: soma.bruto + contas.bruto, liquido: soma.liquido + contas.liquido };
          },
          { bruto: 0, liquido: 0 }
        )
      : totaisSelecionados;
    setConfirmacao({ ids: alvo.map((venda) => venda.id), bruto: totais.bruto, liquido: totais.liquido, porFiltro });
  };

  /**
   * Apaga em lotes. Antes de confiar no deleteMany com $in, testa se o filtro
   * realmente casa com o registro esperado; se não casar (ou vier contagem
   * menor), cai para a exclusão um por um. Assim nenhuma venda é apagada por
   * engano e nenhuma fica para trás sem aviso.
   */
  const apagar = async () => {
    if (!confirmacao || apagando) return;
    setApagando(true);
    setErro('');

    const removidas = new Set();
    let falhas = 0;

    let suportaIn = false;
    try {
      const teste = asList(
        await base44.entities.VendaMimo.filter({ id: { $in: [confirmacao.ids[0]] } }, { limit: 3 })
      );
      suportaIn = teste.length === 1 && teste[0].id === confirmacao.ids[0];
    } catch (erroTeste) {
      suportaIn = false;
    }

    for (const lote of fatiar(confirmacao.ids, 100)) {
      let apagadosNoLote = 0;

      if (suportaIn) {
        try {
          const resposta = await base44.entities.VendaMimo.deleteMany({ id: { $in: lote } });
          const info = resposta?.data ?? resposta;
          apagadosNoLote = Number(info?.deleted ?? info?.deletados ?? 0);
        } catch (erroLote) {
          apagadosNoLote = 0;
        }
      }

      if (apagadosNoLote >= lote.length) {
        lote.forEach((id) => removidas.add(id));
        continue;
      }

      for (const id of lote) {
        try {
          await base44.entities.VendaMimo.delete(id);
          removidas.add(id);
        } catch (erroItem) {
          const status = erroItem?.response?.status;
          // 404 = já não existe, conta como removida
          if (status === 404) removidas.add(id);
          else falhas += 1;
        }
      }
    }

    const idsRemovidos = [...removidas];
    if (idsRemovidos.length) {
      const apagadas = new Set(idsRemovidos);
      setVendas((atual) => atual.filter((venda) => !apagadas.has(venda.id)));
      setSelecionadas((atual) => {
        const proximas = new Set(atual);
        idsRemovidos.forEach((id) => proximas.delete(id));
        return proximas;
      });
    }

    setConfirmacao(null);
    setApagando(false);

    if (falhas) setErro(`${falhas} venda(s) não puderam ser apagadas.`);
    if (idsRemovidos.length) {
      setAviso(`${idsRemovidos.length} venda(s) apagada(s).`);
      if (!falhas) setTimeout(() => setAviso(''), 4000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" style={navegacao} onClick={() => setReferencia((atual) => somarMeses(atual, -1))}>
            ‹
          </button>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c3)', minWidth: 118, textAlign: 'center' }}>
            {mesLabel(referencia)}
          </span>
          <button type="button" style={navegacao} onClick={() => setReferencia((atual) => somarMeses(atual, 1))}>
            ›
          </button>
        </div>

        <div style={{ width: 150 }}>
          <GlassSelect
            value={modeloId}
            onChange={setModeloId}
            options={[{ value: '', label: 'Todas as modelos' }, ...modelos.map((modelo) => ({ value: modelo.id, label: modelo.nome }))]}
            label="Modelo"
          />
        </div>

        <div style={{ width: 140 }}>
          <GlassSelect
            value={chatterId}
            onChange={setChatterId}
            options={[{ value: '', label: 'Todos os chatters' }, ...opcoesChatters]}
            label="Chatter"
          />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 130,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            borderRadius: 8,
            border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
            background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
          }}
        >
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="buscar comprador"
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--c3)',
              fontSize: 11.5,
              fontFamily: 'var(--font-main)',
            }}
          />
          {busca && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setBusca('')}
              style={{ border: 'none', background: 'transparent', color: 'var(--c2)', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <CloseIcon size={11} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 26 }}>
        <span style={{ fontSize: 11, color: 'var(--c2)' }}>
          {carregando ? 'Carregando...' : `${filtradas.length} venda(s)`}
          {truncado && ' · limite de 500, refina o filtro'}
        </span>

        {selecionadas.size > 0 && (
          <>
            <span style={{ fontSize: 10.5, color: 'var(--c1)', fontWeight: 700 }}>
              {selecionadas.size} selecionada(s) · {moeda(totaisSelecionados.bruto)} bruto
            </span>

            {filtradas.length > selecionadas.size && (
              <button
                type="button"
                onClick={alternarFiltro}
                style={{
                  height: 24,
                  padding: '0 10px',
                  borderRadius: 7,
                  border: '1px dashed color-mix(in srgb, var(--c2) 35%, transparent)',
                  background: 'transparent',
                  color: 'var(--c2)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 10.5,
                  cursor: 'pointer',
                }}
              >
                selecionar as {filtradas.length} do filtro
              </button>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelecionadas(new Set())}
                style={{
                  height: 24,
                  padding: '0 10px',
                  borderRadius: 7,
                  border: '1px solid color-mix(in srgb, var(--c2) 25%, transparent)',
                  background: 'transparent',
                  color: 'var(--c2)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 10.5,
                  cursor: 'pointer',
                }}
              >
                limpar seleção
              </button>
              <button
                type="button"
                onClick={() => pedirExclusao(false)}
                style={{
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 12px',
                  borderRadius: 7,
                  border: '1px solid color-mix(in srgb, #ff6b6b 55%, transparent)',
                  background: 'color-mix(in srgb, #ff6b6b 18%, transparent)',
                  color: '#ffb3b3',
                  fontFamily: 'var(--font-main)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <TrashIcon size={12} />
                apagar {selecionadas.size}
              </button>
            </div>
          </>
        )}

        {selecionadas.size === 0 && filtradas.length > 0 && (
          <button
            type="button"
            onClick={() => pedirExclusao(true)}
            style={{
              marginLeft: 'auto',
              height: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 10px',
              borderRadius: 7,
              border: '1px solid color-mix(in srgb, #ff6b6b 40%, transparent)',
              background: 'transparent',
              color: '#ffb3b3',
              fontFamily: 'var(--font-main)',
              fontSize: 10.5,
              cursor: 'pointer',
            }}
          >
            <TrashIcon size={12} />
            apagar todas do filtro ({filtradas.length})
          </button>
        )}

        {aviso && <span style={{ fontSize: 10.5, color: '#7bd88f' }}>{aviso}</span>}
        {erro && <span style={{ fontSize: 10.5, color: '#ff6b6b' }}>{erro}</span>}
      </div>

      <div
        className="glass-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          borderRadius: 10,
          border: '1px solid color-mix(in srgb, var(--c1) 12%, transparent)',
          background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: 'color-mix(in srgb, var(--c8) 92%, #000)' }}>
              <th style={{ ...celula, width: 30, textAlign: 'left' }}>
                <CaixaSelecao
                  marcada={todasDaPagina}
                  parcial={marcadasNaPagina > 0 && !todasDaPagina}
                  onClick={alternarPagina}
                  rotuloAcessivel="Selecionar as vendas desta página"
                />
              </th>
              {['Data', 'Comprador', 'Modelo', 'Chatter', 'Tipo', 'Bruto', 'Líquido', 'Status'].map((titulo) => (
                <th
                  key={titulo}
                  style={{
                    ...celula,
                    textAlign: ['Bruto', 'Líquido'].includes(titulo) ? 'right' : 'left',
                    color: 'var(--c2)',
                    fontWeight: 700,
                    fontSize: 9,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                  }}
                >
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((venda) => {
              const modelo = modeloPorId.get(venda.modelo_id);
              const chatter = chatterPorUsuario.get(venda.usuario_id);
              const contas = calcularVenda(venda, modelo, chatter);
              const status = statusDaVenda(venda.status);
              const marcada = selecionadas.has(venda.id);
              return (
                <tr
                  key={venda.id}
                  style={{
                    background: marcada ? 'color-mix(in srgb, var(--c1) 12%, transparent)' : 'transparent',
                    borderBottom: '1px solid color-mix(in srgb, var(--c2) 7%, transparent)',
                  }}
                >
                  <td style={{ ...celula, width: 30 }}>
                    <CaixaSelecao
                      marcada={marcada}
                      onClick={() => alternarUma(venda.id)}
                      rotuloAcessivel={`Selecionar venda de ${venda.usuario_plataforma || 'comprador'} em ${dataHora(venda.ocorrido_em)}`}
                    />
                  </td>
                  <td style={{ ...celula, color: 'var(--c2)' }}>{dataHora(venda.ocorrido_em)}</td>
                  <td style={{ ...celula, color: 'var(--c3)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {venda.usuario_plataforma || venda.usuario_nome || '—'}
                  </td>
                  <td style={{ ...celula, color: 'var(--c2)' }}>{modelo?.nome || venda.modelo_nome || '—'}</td>
                  <td style={{ ...celula, color: 'var(--c2)' }}>
                    {chatter?.nome_exibicao || nomesChatter.get(venda.usuario_id) || venda.usuario_nome || '—'}
                  </td>
                  <td style={{ ...celula, color: 'var(--c2)' }}>{venda.tipo || '—'}</td>
                  <td style={{ ...celula, textAlign: 'right', color: 'var(--c3)' }}>{moeda(contas.bruto)}</td>
                  <td style={{ ...celula, textAlign: 'right', color: 'var(--c2)' }}>{moeda(contas.liquido)}</td>
                  <td style={{ ...celula, color: status.cor }}>{status.texto}</td>
                </tr>
              );
            })}
            {!visiveis.length && !carregando && (
              <tr>
                <td colSpan={9} style={{ padding: 18, textAlign: 'center', color: 'var(--c2)', fontSize: 11 }}>
                  Nenhuma venda nesse filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 10.5, color: 'var(--c2)' }}>
          {filtradas.length
            ? `${inicioDaPagina + 1}–${Math.min(inicioDaPagina + porPagina, filtradas.length)} de ${filtradas.length}`
            : '0 vendas'}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            style={{ ...navegacao, opacity: paginaSegura <= 1 ? 0.4 : 1 }}
            disabled={paginaSegura <= 1}
            onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
          >
            ‹
          </button>
          <span style={{ fontSize: 10.5, color: 'var(--c3)', minWidth: 78, textAlign: 'center' }}>
            página {paginaSegura} de {totalPaginas}
          </span>
          <button
            type="button"
            style={{ ...navegacao, opacity: paginaSegura >= totalPaginas ? 0.4 : 1 }}
            disabled={paginaSegura >= totalPaginas}
            onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
          >
            ›
          </button>
          <div style={{ width: 140 }}>
            <GlassSelect
              value={String(porPagina)}
              onChange={(valor) => setPorPagina(Number(valor))}
              options={POR_PAGINA}
              label=""
            />
          </div>
        </div>
      </div>

      {confirmacao && (
        <ConfirmarExclusao
          quantidade={confirmacao.ids.length}
          bruto={confirmacao.bruto}
          liquido={confirmacao.liquido}
          porFiltro={confirmacao.porFiltro}
          apagando={apagando}
          onCancelar={() => setConfirmacao(null)}
          onConfirmar={apagar}
        />
      )}
    </div>
  );
}
