import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import GlassSelect from '@/components/GlassSelect';
import { CloseIcon, DownloadIcon } from '@/components/icons';
import { filtrarVendasDoRelatorio, pctChatter } from '@/lib/financeiro';
import {
  gerarRelatorioSemanal,
  inicioDaSemana,
  somarSemanas,
  vendasDaSemana,
  semanaLabel,
} from '@/lib/relatorioSemanal';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

/** Valor do seletor de modelo que dispara o relatório de todas as modelos. */
const TODAS = 'todas';

const botaoNavegar = {
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

export default function RelatorioSemanalModal({ modelos, chatters, onClose }) {
  const [modeloId, setModeloId] = useState('');
  const [chatterId, setChatterId] = useState('');
  const [inicio, setInicio] = useState(() => inicioDaSemana(new Date()));
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const todasAsModelos = modeloId === TODAS;
  const modelo = modelos.find((item) => item.id === modeloId) || null;

  const nomeDoChatter = useMemo(
    () => new Map(chatters.map((chatter) => [chatter.usuario_id, chatter.nome_exibicao || chatter.usuario_email || 'Chatter'])),
    [chatters]
  );

  const opcoesModelos = useMemo(
    () => [
      ...modelos.map((item) => ({ value: item.id, label: item.nome })),
      { value: TODAS, label: 'Todas as modelos' },
    ],
    [modelos]
  );

  const opcoesChatters = useMemo(() => {
    if (!modelo && !todasAsModelos) return [];
    const vistos = new Set();
    const fonte = modelo ? [modelo] : modelos;
    return fonte
      .flatMap((item) => item.chatters || [])
      .map((membro) => {
        const nome = nomeDoChatter.get(membro.usuario_id) || membro.usuario_nome || 'Chatter';
        if (vistos.has(membro.usuario_id) || !nome) return null;
        vistos.add(membro.usuario_id);
        return { value: membro.usuario_id, label: nome };
      })
      .filter(Boolean);
  }, [modelo, todasAsModelos, modelos, nomeDoChatter]);

  const chatter = chatters.find((item) => item.usuario_id === chatterId) || null;

  useEffect(() => {
    setChatterId('');
    setAviso(null);
  }, [modeloId]);

  const gerar = async () => {
    if (gerando) return;
    if ((!modelo && !todasAsModelos) || !chatterId) {
      setAviso({ erro: true, texto: 'Escolha a modelo e o chatter.' });
      return;
    }
    setGerando(true);
    setAviso(null);
    try {
      const de = inicio.toISOString();
      const resultado = await base44.entities.VendaMimo.filter(
        {
          usuario_id: chatterId,
          ocorrido_em: { $gte: de },
          ...(modelo ? { modelo_id: modelo.id } : {}),
        },
        { sort: 'ocorrido_em', limit: 500 }
      );

      const aprovadas = vendasDaSemana(
        asList(resultado).filter((venda) => (venda.status || 'aprovada') === 'aprovada'),
        inicio
      );

      /* Mesma regra do relatório na tela: só venda de chat atribuída pelo
         centavo do bruto ao chatter da modelo. */
      const secoes = (modelo ? [modelo] : modelos)
        .map((item) => ({
          modelo: item,
          vendas: filtrarVendasDoRelatorio(
            aprovadas.filter((venda) => venda.modelo_id === item.id),
            [item]
          ),
        }))
        .filter((secao) => secao.vendas.length);

      if (!secoes.length) {
        setAviso({
          erro: true,
          texto: 'Nenhuma venda de chat desse chatter nessa semana.',
        });
        return;
      }

      const { paginas } = await gerarRelatorioSemanal({
        chatter: { ...chatter, nome: nomeDoChatter.get(chatterId) || 'Chatter' },
        inicio,
        secoes,
      });
      const quantasVendas = secoes.reduce((soma, secao) => soma + secao.vendas.length, 0);
      const escopo = secoes.length > 1 ? ` em ${secoes.length} modelos` : '';
      setAviso({
        erro: false,
        texto: `PDF gerado com ${quantasVendas} venda(s) de chat${escopo} em ${paginas} página(s).`,
      });
    } catch (erro) {
      const detalhe = String(erro?.message || erro || '').slice(0, 90);
      setAviso({
        erro: true,
        texto: detalhe ? `Não consegui gerar o PDF: ${detalhe}` : 'Não consegui gerar o PDF. Tenta de novo.',
      });
    } finally {
      setGerando(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.32)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
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
          background: 'color-mix(in srgb, var(--c8) 74%, transparent)',
          backdropFilter: 'blur(22px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
          border: '1px solid color-mix(in srgb, var(--ink-hex) 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
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
            gap: 8,
            padding: '0 10px 0 14px',
            height: 40,
            flexShrink: 0,
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--c1)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Relatório semanal em PDF
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="clk-nav-btn"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
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

        <div
          className="glass-scroll"
          style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <GlassSelect
                value={modeloId}
                onChange={setModeloId}
                options={opcoesModelos}
                label="Modelo"
                placeholder="Escolher modelo"
              />
            </div>
            <div style={{ flex: 1 }}>
              <GlassSelect
                value={chatterId}
                onChange={setChatterId}
                options={opcoesChatters}
                label="Chatter"
                placeholder={modelo || todasAsModelos ? 'Escolher chatter' : 'Escolha a modelo'}
                disabled={!modelo && !todasAsModelos}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--c2)',
              }}
            >
              Semana de referência
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                style={botaoNavegar}
                onClick={() => setInicio((atual) => somarSemanas(atual, -1))}
              >
                ‹
              </button>
              <div
                style={{
                  flex: 1,
                  height: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
                }}
              >
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c3)' }}>
                  {semanaLabel(inicio)}
                </span>
                <span style={{ fontSize: 9, color: 'var(--c2)' }}>segunda a domingo</span>
              </div>
              <button
                type="button"
                style={botaoNavegar}
                onClick={() => setInicio((atual) => somarSemanas(atual, 1))}
              >
                ›
              </button>
            </div>
            <button
              type="button"
              onClick={() => setInicio(inicioDaSemana(new Date()))}
              style={{
                alignSelf: 'flex-start',
                border: 'none',
                background: 'transparent',
                color: 'var(--c2)',
                fontSize: 10,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline dotted',
              }}
            >
              voltar para a semana atual
            </button>
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--c2)', lineHeight: 1.6 }}>
            O PDF lista cada venda de chat da semana com bruto, líquido e a comissão do chatter,
            além dos totais. Entram só as transações do tipo Chat cujo centavo do bruto é o
            identificador do chatter na modelo. Em "Todas as modelos" sai uma página por modelo
            e uma última com a soma do que o chatter vai receber. A parte da agência não entra
            no documento.
            {chatter && ` Comissão configurada: ${pctChatter(chatter)}%.`}
          </div>

          {aviso && (
            <span style={{ fontSize: 11, color: aviso.erro ? 'var(--erro)' : 'var(--ok)' }}>{aviso.texto}</span>
          )}

          <button
            type="button"
            onClick={gerar}
            disabled={gerando}
            style={{
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c1) 60%, transparent)',
              background: 'color-mix(in srgb, var(--c1) 22%, transparent)',
              color: 'var(--c1)',
              fontFamily: 'var(--font-main)',
              fontSize: 12,
              fontWeight: 700,
              cursor: gerando ? 'progress' : 'pointer',
              opacity: gerando ? 0.65 : 1,
            }}
          >
            <DownloadIcon size={14} />
            {gerando ? 'Gerando PDF...' : 'Gerar PDF'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
