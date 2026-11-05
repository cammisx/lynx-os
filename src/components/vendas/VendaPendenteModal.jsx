import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { CloseIcon, GiftIcon } from '@/components/icons';
import { moedaLabel, quandoLabel, statusColor, statusLabel } from '@/lib/vendas';
import { useAuth } from '@/lib/AuthContext';

const BOTAO = {
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};

const rotulo = {
  fontSize: 10,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

const AREA = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 58,
  resize: 'vertical',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  color: 'var(--c3)',
  fontSize: 12,
  lineHeight: 1.5,
  padding: '8px 10px',
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

function Linha({ label, valor, destaque }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11 }}>
      <span style={{ color: 'var(--c2)' }}>{label}</span>
      <span style={{ color: destaque ? 'var(--c1)' : 'var(--c3)', textAlign: 'right', fontWeight: destaque ? 700 : 400 }}>
        {valor}
      </span>
    </div>
  );
}

export default function VendaPendenteModal({ notification, onClose, onSaved }) {
  const { user } = useAuth();
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(null);
  const [erro, setErro] = useState('');

  const ids = useMemo(() => {
    const lista = String(notification?.venda_ids || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (lista.length) return lista;
    return notification?.venda_id ? [notification.venda_id] : [];
  }, [notification?.venda_ids, notification?.venda_id]);

  useEffect(() => {
    let ativo = true;
    if (!ids.length) {
      setCarregando(false);
      return undefined;
    }
    Promise.all(ids.map((id) => base44.entities.VendaMimo.get(id).catch(() => null)))
      .then((resultado) => {
        if (ativo) setVendas(resultado.filter(Boolean));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [ids]);

  const pendentes = vendas.filter((venda) => venda.status === 'pendente');
  const podeDecidir = pendentes.length > 0 && !salvando;
  const print = vendas.find((venda) => venda.print_url)?.print_url || '';

  const finalizarNotificacao = async (resposta) => {
    try {
      await base44.entities.Notificacao.update(notification.id, {
        status: 'resolvida',
        lida: true,
        resposta,
      });
    } catch (error) {
      console.warn('[Notificacao]', error);
    }
  };

  const decidir = async (decisao) => {
    if (!vendas.length || salvando) return;
    setSalvando(decisao);
    setErro('');
    try {
      const alvo = pendentes.length ? pendentes : vendas;
      await Promise.all(
        alvo.map((venda) =>
          base44.entities.VendaMimo.update(venda.id, {
            status: decisao === 'aprovada' ? 'aprovada' : 'recusada',
            revisado_por: user?.full_name || user?.email || '',
            revisado_em: new Date().toISOString(),
            ...(decisao === 'recusada' ? { motivo_recusa: motivo.trim() } : {}),
          })
        )
      );
      await finalizarNotificacao(
        decisao === 'recusada' && motivo.trim()
          ? `recusada: ${motivo.trim()}`
          : decisao
      );
      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      setErro(error?.message || 'Não consegui registrar a decisão.');
    } finally {
      setSalvando(null);
    }
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
        background: 'rgba(0,0,0,0.32)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Venda para conferência"
        style={{
          width: 480,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--c8) 62%, transparent)',
          backdropFilter: 'blur(22px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
          border:
            '1px solid color-mix(in srgb, white 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
          boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-main)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 42,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '0 8px 0 14px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--c1)',
            }}
          >
            <GiftIcon size={14} />
            {vendas.length > 1 ? `${vendas.length} vendas para conferir` : 'Venda para conferir'}
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="clk-nav-btn"
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={13} />
          </button>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {carregando && <span style={{ fontSize: 11, color: 'var(--c2)' }}>Carregando venda…</span>}

          {!carregando && !vendas.length && (
            <span style={{ fontSize: 11, color: 'var(--c2)' }}>
              Não encontrei o registro desta venda. Ele pode ter sido removido.
            </span>
          )}

          {vendas.map((venda) => (
            <div
              key={venda.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                padding: '9px 11px',
                borderRadius: 8,
                background: 'color-mix(in srgb, var(--c1) 7%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c1) 16%, transparent)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c3)' }}>
                  {venda.tipo || 'Registro'}
                </span>
                <span style={{ fontSize: 10.5, color: statusColor(venda.status), fontWeight: 700 }}>
                  {statusLabel(venda.status)}
                </span>
              </div>
              <Linha label="Usuário na plataforma" valor={venda.usuario_plataforma || '—'} />
              <Linha label="Modelo" valor={venda.modelo_nome || '—'} />
              <Linha label="Bruto" valor={moedaLabel(venda.bruto, venda.moeda)} />
              <Linha label="Líquido" valor={moedaLabel(venda.liquido, venda.moeda)} destaque />
              <Linha label="Método" valor={venda.metodo || '—'} />
              <Linha label="Data do registro" valor={quandoLabel(venda.ocorrido_em)} />
              <Linha label="Registrado por" valor={venda.usuario_nome || '—'} />
              {venda.observacao && (
                <span style={{ fontSize: 11, color: 'var(--c2)', marginTop: 3 }}>
                  “{venda.observacao}”
                </span>
              )}
              {venda.motivo_recusa && (
                <span style={{ fontSize: 11, color: '#ff6b6b', marginTop: 3 }}>
                  Recusada: {venda.motivo_recusa}
                </span>
              )}
            </div>
          ))}

          {print && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={rotulo}>Print anexado</span>
              <a
                href={print}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
                  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
                }}
              >
                <img
                  src={print}
                  alt="Print da venda"
                  style={{
                    display: 'block',
                    width: '100%',
                    maxHeight: 260,
                    objectFit: 'contain',
                  }}
                />
              </a>
              <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.8 }}>
                Clique no print para abrir em tamanho real.
              </span>
            </div>
          )}

          {recusando && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={rotulo}>Motivo da recusa</span>
              <textarea
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Por que este registro não vale?"
                maxLength={280}
                style={AREA}
              />
            </div>
          )}

          {erro && <span style={{ fontSize: 11, color: '#ff6b6b' }}>{erro}</span>}
        </div>

        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '10px 14px',
            borderTop: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
          }}
        >
          {!podeDecidir && (
            <button
              type="button"
              onClick={onClose}
              style={{
                ...BOTAO,
                border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
                background: 'transparent',
                color: 'var(--c2)',
              }}
            >
              Fechar
            </button>
          )}

          {podeDecidir && !recusando && (
            <>
              <button
                type="button"
                onClick={() => setRecusando(true)}
                style={{
                  ...BOTAO,
                  border: '1px solid color-mix(in srgb, #ff6b6b 45%, transparent)',
                  background: 'color-mix(in srgb, #ff6b6b 16%, transparent)',
                  color: '#ff6b6b',
                }}
              >
                Recusar
              </button>
              <button
                type="button"
                onClick={() => decidir('aprovada')}
                className="md-btn"
                style={{
                  ...BOTAO,
                  border: 'none',
                  background: 'var(--c1)',
                  color: 'var(--c8)',
                  opacity: salvando ? 0.6 : 1,
                }}
              >
                {salvando === 'aprovada' ? 'Aprovando…' : 'Aprovar'}
              </button>
            </>
          )}

          {podeDecidir && recusando && (
            <>
              <button
                type="button"
                onClick={() => setRecusando(false)}
                style={{
                  ...BOTAO,
                  border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
                  background: 'transparent',
                  color: 'var(--c2)',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => decidir('recusada')}
                style={{
                  ...BOTAO,
                  border: '1px solid color-mix(in srgb, #ff6b6b 45%, transparent)',
                  background: 'color-mix(in srgb, #ff6b6b 22%, transparent)',
                  color: '#ff6b6b',
                  opacity: salvando ? 0.6 : 1,
                }}
              >
                {salvando === 'recusada' ? 'Recusando…' : 'Confirmar recusa'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
