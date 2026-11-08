import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import DateTimePicker from '@/components/DateTimePicker';
import { CloseIcon, CoffeeIcon } from '@/components/icons';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import { useAuth } from '@/lib/AuthContext';
import { criarCobertura } from '@/lib/cobertura';

const DAY_MS = 86400000;

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

const hora = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const diaLongo = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const combinar = (diaBase, horaEscolhida, ancora) => {
  if (!horaEscolhida) return null;
  const base = new Date(diaBase);
  base.setHours(horaEscolhida.getHours(), horaEscolhida.getMinutes(), 0, 0);
  let valor = base.getTime();
  if (valor < ancora) valor += DAY_MS;
  return valor;
};

export default function HorarioDisponivelModal({ notification, onClose, onSaved }) {
  const { user } = useAuth();
  const [modo, setModo] = useState('detalhes');
  const [entrada, setEntrada] = useState(null);
  const [saida, setSaida] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const inicio = useMemo(() => new Date(notification?.turno_inicio || 0).getTime(), [notification]);
  const fim = useMemo(() => new Date(notification?.turno_fim || 0).getTime(), [notification]);
  const valido = Number.isFinite(inicio) && Number.isFinite(fim) && fim > inicio;

  useEffect(() => {
    if (!valido) return;
    setEntrada(new Date(inicio));
    setSaida(new Date(fim));
  }, [valido, inicio, fim]);

  const entradaFinal = useMemo(() => {
    if (!valido || !entrada) return null;
    const valor = combinar(inicio, entrada, inicio);
    if (valor === null || valor >= fim) return null;
    return valor;
  }, [valido, entrada, inicio, fim]);

  const saidaFinal = useMemo(() => {
    if (!valido || !saida || !entradaFinal) return null;
    const valor = combinar(inicio, saida, entradaFinal + 1);
    if (valor === null || valor > fim) return null;
    return valor;
  }, [valido, saida, entradaFinal, inicio, fim]);

  const erroHorario = (() => {
    if (!entradaFinal) return 'A entrada precisa ser dentro do horário livre.';
    if (!saidaFinal) return 'A saída precisa ser depois da entrada e dentro do horário livre.';
    return '';
  })();

  const cobrir = async (parcial) => {
    if (salvando) return;
    if (parcial && erroHorario) return;
    setSalvando(true);
    setErro('');
    try {
      await criarCobertura(base44, {
        notification,
        usuario: user,
        inicio: parcial ? entradaFinal : inicio,
        fim: parcial ? saidaFinal : fim,
      });
      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      setErro(error?.message || 'Não consegui registrar a cobertura.');
    } finally {
      setSalvando(false);
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
      <div role="dialog" aria-label="Horário disponível" style={MODAL_CAIXA}>
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
            Horário disponível
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'color-mix(in srgb, var(--c1) 7%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c1) 16%, transparent)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c3)' }}>
              {notification?.modelo_nome || 'Modelo'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--c2)' }}>{diaLongo(inicio)}</span>
            <span style={{ fontSize: 13, color: 'var(--c1)', fontWeight: 700 }}>
              {valido ? `${hora(inicio)}–${hora(fim)}` : 'Horário indisponível'}
            </span>
          </div>

          <span style={{ fontSize: 11, color: 'var(--c2)', lineHeight: 1.5 }}>
            Este horário foi liberado. Se quiser ficar com ele, é só cobrir. Cobre o turno inteiro
            ou só a parte que couber na sua agenda.
          </span>

          {modo === 'parcial' && (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <DateTimePicker
                    value={entrada}
                    onChange={setEntrada}
                    mode="time"
                    label="Minha entrada"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <DateTimePicker value={saida} onChange={setSaida} mode="time" label="Minha saída" />
                </div>
              </div>
              <span style={{ fontSize: 11, color: erroHorario ? 'var(--erro)' : 'var(--c2)' }}>
                {erroHorario || (valido ? `Dentro de ${hora(inicio)}–${hora(fim)}.` : '')}
              </span>
            </>
          )}

          {erro && <span style={{ fontSize: 11, color: 'var(--erro)' }}>{erro}</span>}
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
          {modo === 'detalhes' ? (
            <>
              <button
                type="button"
                onClick={() => setModo('parcial')}
                style={{
                  ...BOTAO,
                  border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
                  background: 'transparent',
                  color: 'var(--c1)',
                }}
              >
                Cobrir parcialmente
              </button>
              <button
                type="button"
                onClick={() => cobrir(false)}
                disabled={!valido || salvando}
                className="md-btn"
                style={{
                  ...BOTAO,
                  border: 'none',
                  background: 'var(--c1)',
                  color: 'var(--c8)',
                  opacity: salvando || !valido ? 0.6 : 1,
                }}
              >
                {salvando ? 'Cobrindo…' : 'Cobrir shift'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setModo('detalhes')}
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
                onClick={() => cobrir(true)}
                disabled={!!erroHorario || salvando}
                className="md-btn"
                style={{
                  ...BOTAO,
                  border: 'none',
                  background: erroHorario
                    ? 'color-mix(in srgb, var(--c2) 22%, transparent)'
                    : 'var(--c1)',
                  color: erroHorario ? 'var(--c2)' : 'var(--c8)',
                  opacity: salvando ? 0.6 : 1,
                }}
              >
                {salvando ? 'Cobrindo…' : 'Confirmar cobertura'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
