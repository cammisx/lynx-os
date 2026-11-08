import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import DateTimePicker from '@/components/DateTimePicker';
import { CloseIcon, CoffeeIcon } from '@/components/icons';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import { useAuth } from '@/lib/AuthContext';
import { emitShiftsChanged } from '@/lib/desktopEvents';
import { DURACAO_MINIMA_VAGA_MS, avisarAdminsDaCobertura, criarVagaCobertura } from '@/lib/vagas';

const BOTAO = {
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};

const hora = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const diaLongo = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

/**
 * O chatter viu um horário vago na agenda e clicou nele.
 *
 * Ele escolhe o pedaço do vago que consegue cobrir, com no mínimo uma hora.
 * O horário é conferido de novo no salvamento, então dois chatters clicando
 * juntos não viram dois chatters na mesma modelo.
 */
export default function CobrirVagoModal({ modelo, vaga, onClose, onSaved }) {
  const { user } = useAuth();
  const [inicio, setInicio] = useState(() => new Date(vaga?.start || Date.now()));
  const [fim, setFim] = useState(() => new Date(vaga?.end || Date.now()));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const escape = (evento) => {
      if (evento.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);

  const limites = useMemo(
    () => ({ inicio: Number(vaga?.start || 0), fim: Number(vaga?.end || 0) }),
    [vaga]
  );

  const salvar = async () => {
    if (salvando) return;
    const de = inicio?.getTime?.() || 0;
    const ate = fim?.getTime?.() || 0;
    if (!de || !ate) {
      setErro('Informe o início e o fim da cobertura.');
      return;
    }
    if (ate <= de) {
      setErro('O fim precisa ser depois do início.');
      return;
    }
    if (de < limites.inicio || ate > limites.fim) {
      setErro(
        `Esse horário vago vai de ${hora(limites.inicio)} às ${hora(limites.fim)}. Escolha dentro dele.`
      );
      return;
    }
    if (ate - de < DURACAO_MINIMA_VAGA_MS) {
      setErro('A cobertura precisa de pelo menos 1 hora.');
      return;
    }

    setErro('');
    setSalvando(true);
    try {
      await criarVagaCobertura(base44, { modelo, usuario: user, inicio: de, fim: ate });
      avisarAdminsDaCobertura(base44, { modelo, usuario: user, inicio: de, fim: ate }).catch(
        () => {}
      );
      emitShiftsChanged();
      if (onSaved) await onSaved();
      onClose();
    } catch (falha) {
      setErro(falha?.message || 'Não consegui registrar a cobertura.');
    } finally {
      setSalvando(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(2px)',
        padding: 16,
      }}
    >
      <div style={{ ...MODAL_CAIXA, width: 400 }}>
        <div
          style={{
            height: 34,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px 0 12px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--c3)',
            }}
          >
            <CoffeeIcon size={13} />
            Cobrir horário vago
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--c2)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={13} />
          </button>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--c2)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--c3)' }}>{modelo?.nome || 'Modelo'}</strong> está sem
            ninguém em {diaLongo(limites.inicio)}, das {hora(limites.inicio)} às {hora(limites.fim)}.
            Escolha o período que você consegue cobrir.
          </span>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DateTimePicker label="De" value={inicio} onChange={setInicio} mode="datetime" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DateTimePicker label="Até" value={fim} onChange={setFim} mode="datetime" />
            </div>
          </div>

          {erro && <span style={{ fontSize: 11, color: 'var(--erro)' }}>{erro}</span>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
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
              Cancelar
            </button>
            <button
              type="button"
              className="md-primary"
              onClick={salvar}
              disabled={salvando}
              style={BOTAO}
            >
              {salvando ? 'Salvando…' : 'Cobrir horário'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
