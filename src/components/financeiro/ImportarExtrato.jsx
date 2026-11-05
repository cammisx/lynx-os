import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import GlassSelect from '@/components/GlassSelect';
import { conferirExtrato, paraVendaMimo, SITUACOES } from '@/lib/extrato';
import { moeda } from '@/lib/financeiro';
import { quandoLabel } from '@/lib/vendas';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const cartao = {
  borderRadius: 12,
  border: '1px solid color-mix(in srgb, var(--c1) 14%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
};

const rotulo = {
  fontSize: 9.5,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--c2)',
};

const valorDestaque = {
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--c3)',
};

const botao = (principal) => ({
  height: 32,
  padding: '0 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'var(--font-main)',
  fontSize: 12,
  fontWeight: 700,
  border: principal
    ? '1px solid color-mix(in srgb, var(--c1) 60%, transparent)'
    : '1px solid color-mix(in srgb, var(--c2) 30%, transparent)',
  background: principal
    ? 'color-mix(in srgb, var(--c1) 24%, transparent)'
    : 'color-mix(in srgb, var(--c8) 60%, transparent)',
  color: principal ? 'var(--c1)' : 'var(--c2)',
  transition: 'background-color 150ms ease',
});

const situacaoChip = (situacao) => {
  const info = SITUACOES[situacao] || { rotulo: situacao, cor: 'var(--c2)' };
  return (
    <span
      title={info.texto}
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: info.cor,
        padding: '2px 7px',
        borderRadius: 999,
        border: `1px solid color-mix(in srgb, ${info.cor} 45%, transparent)`,
        background: `color-mix(in srgb, ${info.cor} 12%, transparent)`,
        whiteSpace: 'nowrap',
      }}
    >
      {info.rotulo}
    </span>
  );
};

export default function ImportarExtrato({ modelos, chatters }) {
  const { user } = useAuth();
  const [modeloId, setModeloId] = useState('');
  const [texto, setTexto] = useState('');
  const [existentes, setExistentes] = useState([]);
  const [conferencia, setConferencia] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const opcoesModelos = useMemo(
    () => modelos.filter((modelo) => !modelo.arquivada).map((modelo) => ({ value: modelo.id, label: modelo.nome })),
    [modelos]
  );

  const modelo = modelos.find((item) => item.id === modeloId) || null;

  const nomeDoChatter = useMemo(() => {
    const mapa = new Map(chatters.map((c) => [c.usuario_id, c.nome_exibicao || c.usuario_email || '']));
    (modelo?.chatters || []).forEach((membro) => {
      if (!mapa.get(membro.usuario_id) && membro.usuario_nome) {
        mapa.set(membro.usuario_id, membro.usuario_nome);
      }
    });
    return mapa;
  }, [chatters, modelo]);

  useEffect(() => {
    setConferencia(null);
    setAviso(null);
    if (!modeloId) {
      setExistentes([]);
      return undefined;
    }
    let ativo = true;
    base44.entities.VendaMimo.filter({ modelo_id: modeloId }, { sort: '-ocorrido_em', limit: 500 })
      .then((resultado) => {
        if (ativo) setExistentes(asList(resultado));
      })
      .catch(() => {
        if (ativo) setExistentes([]);
      });
    return () => {
      ativo = false;
    };
  }, [modeloId]);

  const conferir = () => {
    setAviso(null);
    if (!modelo) {
      setAviso({ erro: true, texto: 'Escolha a modelo antes de conferir o extrato.' });
      return;
    }
    if (!texto.trim()) {
      setAviso({ erro: true, texto: 'Cole o extrato do Privacy.' });
      return;
    }
    const resultado = conferirExtrato({ texto, modelo, existentes });
    if (!resultado.linhas.length) {
      setAviso({ erro: true, texto: 'Não reconheci nenhuma venda nesse texto.' });
      setConferencia(null);
      return;
    }
    setConferencia(resultado);
  };

  const salvar = async () => {
    if (!conferencia || salvando) return;
    const lote = `extrato-${new Date().toISOString().slice(0, 19)}`;
    const paraSalvar = conferencia.linhas.filter((linha) => linha.salvar);
    if (!paraSalvar.length) {
      setAviso({ erro: true, texto: 'Nada novo para salvar nesse extrato.' });
      return;
    }
    setSalvando(true);
    setAviso(null);
    try {
      for (const linha of paraSalvar) {
        // eslint-disable-next-line no-await-in-loop
        await base44.entities.VendaMimo.create(
          paraVendaMimo(linha, {
            modelo,
            chatterNome: nomeDoChatter.get(linha.chatter_id) || '',
            lote,
            admin: user,
          })
        );
      }
      setAviso({
        erro: false,
        texto: `${paraSalvar.length} venda(s) salva(s) em ${modelo?.nome || 'modelo'}.`,
      });
      setTexto('');
      setConferencia(null);
      const atualizadas = await base44.entities.VendaMimo.filter(
        { modelo_id: modeloId },
        { sort: '-ocorrido_em', limit: 500 }
      );
      setExistentes(asList(atualizadas));
    } catch (erro) {
      setAviso({ erro: true, texto: 'Não consegui salvar. Confere as permissões do Financeiro.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ width: 220 }}>
          <GlassSelect
            value={modeloId}
            onChange={setModeloId}
            options={opcoesModelos}
            label="Modelo"
            placeholder="Escolher modelo"
          />
        </div>
        {modelo && (
          <span style={{ fontSize: 11, color: 'var(--c2)' }}>
            {(modelo.chatters || []).filter((membro) => membro.identificador).length} chatter(s)
            com identificador · agência fica com {modelo.comissao_agencia ?? 50}% do líquido
          </span>
        )}
      </div>

      <textarea
        className="glass-scroll"
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
        placeholder={'Cole aqui o extrato do Privacy, um registro embaixo do outro.'}
        style={{
          height: 132,
          resize: 'none',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid color-mix(in srgb, var(--c6) 35%, transparent)',
          background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
          color: 'var(--c3)',
          fontSize: 11.5,
          fontFamily: 'var(--font-main)',
          lineHeight: 1.5,
        }}
      />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" style={botao(false)} onClick={conferir}>
          Conferir extrato
        </button>
        <button
          type="button"
          style={{ ...botao(true), opacity: salvando ? 0.6 : 1 }}
          onClick={salvar}
          disabled={salvando || !conferencia?.resumo?.salvar}
        >
          {salvando ? 'Salvando...' : `Salvar ${conferencia?.resumo?.salvar || 0} venda(s)`}
        </button>
        {aviso && (
          <span style={{ fontSize: 11, color: aviso.erro ? '#ff6b6b' : '#7bd88f' }}>{aviso.texto}</span>
        )}
      </div>

      {conferencia && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
            <div style={cartao}>
              <span style={rotulo}>Registros</span>
              <span style={valorDestaque}>{conferencia.resumo.total}</span>
            </div>
            <div style={cartao}>
              <span style={rotulo}>Bruto lido</span>
              <span style={valorDestaque}>{moeda(conferencia.resumo.bruto)}</span>
            </div>
            <div style={cartao}>
              <span style={rotulo}>Atribuídas</span>
              <span style={{ ...valorDestaque, color: '#7bd88f' }}>{conferencia.resumo.atribuidas}</span>
            </div>
            <div style={cartao}>
              <span style={rotulo}>Mimos conferidos</span>
              <span style={{ ...valorDestaque, color: '#3B9EFF' }}>{conferencia.resumo.mimosConferidos}</span>
            </div>
            <div style={cartao}>
              <span style={rotulo}>Sem dono</span>
              <span style={{ ...valorDestaque, color: conferencia.resumo.semDono ? '#e8b93b' : 'var(--c2)' }}>
                {conferencia.resumo.semDono}
              </span>
            </div>
          </div>

          <div className="glass-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--c2)' }}>
                  {['Quando', 'Comprador', 'Tipo', 'Bruto', 'Líquido', 'Chatter', 'Situação'].map((titulo) => (
                    <th
                      key={titulo}
                      style={{
                        ...rotulo,
                        padding: '4px 6px',
                        borderBottom: '1px solid color-mix(in srgb, var(--c2) 15%, transparent)',
                        fontWeight: 600,
                      }}
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conferencia.linhas.map((linha, indice) => (
                  <tr key={`${linha.ocorrido_em}-${indice}`} style={{ color: 'var(--c3)' }}>
                    <td style={{ padding: '5px 6px', whiteSpace: 'nowrap', color: 'var(--c2)' }}>
                      {quandoLabel(linha.ocorrido_em)}
                    </td>
                    <td style={{ padding: '5px 6px' }}>{linha.usuario_plataforma || '—'}</td>
                    <td style={{ padding: '5px 6px', color: 'var(--c2)' }}>{linha.tipo || '—'}</td>
                    <td style={{ padding: '5px 6px' }}>{moeda(linha.bruto)}</td>
                    <td style={{ padding: '5px 6px', color: 'var(--c2)' }}>{moeda(linha.liquido)}</td>
                    <td style={{ padding: '5px 6px' }}>
                      {linha.chatter_id
                        ? `${nomeDoChatter.get(linha.chatter_id) || 'Chatter'} (${linha.identificador})`
                        : '—'}
                    </td>
                    <td style={{ padding: '5px 6px' }}>{situacaoChip(linha.situacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!conferencia && (
        <div style={{ fontSize: 11, color: 'var(--c2)', lineHeight: 1.6 }}>
          O centavo do bruto é o identificador do chatter naquela modelo. Mimos e vendas
          internacionais não têm o centavo: eles são conferidos contra o que o chatter já lançou
          pelo widget e não entram duas vezes.
        </div>
      )}
    </div>
  );
}
