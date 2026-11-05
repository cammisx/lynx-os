import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { CloseIcon, CoffeeIcon } from '@/components/icons';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import { useAuth } from '@/lib/AuthContext';
import { dayKey } from '@/lib/shiftRepeat';
import { cancelarOcorrencia, avisarHorarioDisponivel } from '@/lib/cobertura';

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

const STATUS = {
  pendente: { texto: 'Aguardando revisão', cor: '#e8b93b' },
  aprovada: { texto: 'Aprovada', cor: '#7bd88f' },
  recusada: { texto: 'Recusada', cor: '#ff6b6b' },
};

const hora = (iso) => {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const dataCurta = (iso) => {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const Linha = ({ label, valor, destaque }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11 }}>
    <span style={{ color: 'var(--c2)' }}>{label}</span>
    <span
      style={{
        color: destaque ? 'var(--c1)' : 'var(--c3)',
        textAlign: 'right',
        fontWeight: destaque ? 700 : 400,
      }}
    >
      {valor}
    </span>
  </div>
);

export default function FolgaPendenteModal({ notification, onClose, onSaved }) {
  const { user } = useAuth();
  const [pedido, setPedido] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    if (!notification?.folga_id) {
      setCarregando(false);
      return undefined;
    }
    base44.entities.SolicitacaoFolga.get(notification.folga_id)
      .then((registro) => {
        if (ativo) setPedido(registro || null);
      })
      .catch(() => {
        if (ativo) setPedido(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [notification?.folga_id]);

  const podeDecidir = !!pedido && pedido.status === 'pendente' && !salvando;
  const status = pedido ? STATUS[pedido.status] || STATUS.pendente : null;

  const decidir = async (decisao) => {
    if (!pedido || salvando) return;
    setSalvando(decisao);
    setErro('');
    try {
      const chave = pedido.ocorrencia_data || dayKey(pedido.turno_inicio);

      if (decisao === 'aprovada' && pedido.tipo === 'folga') {
        const turno = await cancelarOcorrencia(base44, pedido.shift_id, chave, {
          motivo: 'folga aprovada',
          solicitacao_id: pedido.id,
          chatter_id: pedido.usuario_id,
        });
        await avisarHorarioDisponivel(base44, {
          shift: turno,
          dateKey: chave,
          inicio: pedido.turno_inicio,
          fim: pedido.turno_fim,
          modeloId: pedido.modelo_id,
          modeloNome: pedido.modelo_nome,
          solicitacaoId: pedido.id,
          excluir: [pedido.usuario_id],
        });
      }

      if (decisao === 'aprovada' && pedido.tipo === 'reducao') {
        await base44.entities.Shift.update(pedido.shift_id, {
          ajustes: [
            ...((await base44.entities.Shift.get(pedido.shift_id))?.ajustes || []),
            {
              data: chave,
              inicio: pedido.entrada_solicitada,
              fim: pedido.saida_solicitada,
              solicitacao_id: pedido.id,
              chatter_id: pedido.usuario_id,
            },
          ],
        });
      }

      await base44.entities.SolicitacaoFolga.update(pedido.id, {
        status: decisao,
        revisado_por: user?.full_name || user?.email || '',
        revisado_em: new Date().toISOString(),
        ...(decisao === 'recusada' ? { motivo_recusa: motivo.trim() } : {}),
      });
      try {
        await base44.entities.Notificacao.update(notification.id, {
          status: 'resolvida',
          lida: true,
          resposta:
            decisao === 'recusada' && motivo.trim() ? `recusada: ${motivo.trim()}` : decisao,
        });
      } catch (error) {
        console.warn('[Notificacao]', error);
      }
      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      setErro(error?.message || 'Não consegui registrar a decisão.');
    } finally {
      setSalvando(null);
    }
  };

  const original = pedido
    ? `${hora(pedido.turno_inicio)}–${hora(pedido.turno_fim)}`
    : '';
  const reduzido = pedido
    ? `${hora(pedido.entrada_solicitada)}–${hora(pedido.saida_solicitada)}`
    : '';

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
      <div role="dialog" aria-label="Revisar pedido de folga" style={MODAL_CAIXA}>
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
            <CoffeeIcon size={14} />
            {pedido?.tipo === 'folga' ? 'Pedido de folga' : 'Pedido de redução'}
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

        <div
          className="glass-scroll"
          style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}
        >
          {carregando && <span style={{ fontSize: 11, color: 'var(--c2)' }}>Carregando pedido…</span>}

          {!carregando && !pedido && (
            <span style={{ fontSize: 11, color: 'var(--c2)' }}>
              Não encontrei este pedido. Ele pode ter sido removido.
            </span>
          )}

          {pedido && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '9px 11px',
                  borderRadius: 8,
                  background: 'color-mix(in srgb, var(--c1) 7%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--c1) 16%, transparent)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c3)' }}>
                    {pedido.usuario_nome || 'Chatter'}
                  </span>
                  {status && (
                    <span style={{ fontSize: 10.5, color: status.cor, fontWeight: 700 }}>
                      {status.texto}
                    </span>
                  )}
                </div>
                <Linha label="Modelo" valor={pedido.modelo_nome || '—'} />
                <Linha
                  label="Dia"
                  valor={dataCurta(pedido.turno_inicio || pedido.ocorrencia_data) || '—'}
                />
                <Linha label="Turno original" valor={original || '—'} />
                <Linha
                  label={pedido.tipo === 'folga' ? 'Pedido' : 'Novo horário'}
                  valor={pedido.tipo === 'folga' ? 'Folga no turno inteiro' : reduzido || '—'}
                  destaque
                />
              </div>

              {pedido.fora_do_prazo && (
                <div
                  style={{
                    padding: '8px 11px',
                    borderRadius: 8,
                    background: 'color-mix(in srgb, #e8b93b 12%, transparent)',
                    border: '1px solid color-mix(in srgb, #e8b93b 40%, transparent)',
                    fontSize: 11,
                    color: '#e8b93b',
                    lineHeight: 1.45,
                  }}
                >
                  Pedido fora do prazo. Faltavam{' '}
                  {Math.max(0, Math.floor(Number(pedido.antecedencia_horas) || 0))}h para o turno.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={rotulo}>Justificativa</span>
                <span style={{ fontSize: 11.5, color: 'var(--c3)', lineHeight: 1.5 }}>
                  {pedido.motivo?.trim() || 'Sem justificativa.'}
                </span>
              </div>

              {pedido.motivo_recusa && (
                <span style={{ fontSize: 11, color: '#ff6b6b' }}>
                  Recusada: {pedido.motivo_recusa}
                </span>
              )}

              {recusando && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={rotulo}>Motivo da recusa</span>
                  <textarea
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                    placeholder=""
                    maxLength={240}
                    style={AREA}
                  />
                </div>
              )}
            </>
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
                {salvando === 'aprovada' ? 'Aprovando…' : 'Aprovar pedido'}
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
