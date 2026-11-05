import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PunchButton from '@/components/shifts/PunchButton';
import { CloseIcon, LogInIcon, PauseIcon, PlayIcon, StopIcon } from '@/components/icons';
import TurnoIcon from '@/components/icons/TurnoIcon';
import { countdownLabel, durationLabel } from '@/lib/ponto';
import { TASKBAR_SAFE, WIDGET_TILE } from './widgetLayout';

const WIDTH = 340;
const HEIGHT = 236;
const TASKBAR = TASKBAR_SAFE;
const MARGIN = 8;

const dayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const mesmoDia =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  const dia = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${mesmoDia ? 'hoje' : dia} às ${hora}`;
};

const limitar = (left, top) => ({
  left: Math.min(Math.max(MARGIN, left), Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN)),
  top: Math.min(
    Math.max(MARGIN, top),
    Math.max(MARGIN, window.innerHeight - TASKBAR - Math.min(HEIGHT, 120))
  ),
});

/** Posição de estreia do painel: ao lado do ícone, sem sair da tela. */
export const posicaoPainel = (icone) => {
  const abreParaEsquerda = icone.icone_x + WIDGET_TILE + WIDTH + 12 > window.innerWidth;
  const left = abreParaEsquerda ? icone.icone_x - WIDTH - 12 : icone.icone_x + WIDGET_TILE + 12;
  return limitar(left, icone.icone_y - 8);
};

export default function TurnoWidgetPanel({
  widget,
  ponto,
  saving,
  feedback,
  onPunch,
  justificativaPendente,
  onOpenJustificativa,
  onClose,
  onMove,
}) {
  const [pos, setPos] = useState(() => {
    if (typeof widget.painel_x === 'number' && typeof widget.painel_y === 'number') {
      return limitar(widget.painel_x, widget.painel_y);
    }
    return posicaoPainel(widget);
  });
  const [arrastando, setArrastando] = useState(false);
  const drag = useRef(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const busy = !!saving;
  const agora = Date.now();

  const startDrag = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = {
      dx: event.clientX - posRef.current.left,
      dy: event.clientY - posRef.current.top,
      moveu: false,
    };
    setArrastando(true);

    const handleMove = (moveEvent) => {
      const data = drag.current;
      if (!data) return;
      data.moveu = true;
      setPos(limitar(moveEvent.clientX - data.dx, moveEvent.clientY - data.dy));
    };

    const handleUp = () => {
      const data = drag.current;
      drag.current = null;
      setArrastando(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      if (data?.moveu) onMove({ painel_x: posRef.current.left, painel_y: posRef.current.top });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  let titulo = 'Turno';
  let linha = 'Nenhum turno agendado.';
  let acoes = null;

  if (ponto.mode === 'ativo') {
    const decorrido =
      agora -
      ponto.entradaAt -
      (ponto.pausasMs || 0) -
      (ponto.pausaAbertaAt ? agora - ponto.pausaAbertaAt : 0);
    titulo = ponto.modeloNome || 'Turno';
    linha = `Em shift há ${durationLabel(decorrido)}`;
    acoes = (
      <>
        <PunchButton
          icon={PauseIcon}
          label="Pausa"
          busy={saving === 'pausa'}
          disabled={busy}
          onClick={() => onPunch('pausa')}
        />
        <PunchButton
          variant="danger"
          icon={StopIcon}
          label="Fim do turno"
          busy={saving === 'saida'}
          disabled={busy}
          onClick={() => onPunch('saida')}
        />
      </>
    );
  } else if (ponto.mode === 'pausa') {
    titulo = ponto.modeloNome || 'Turno';
    linha = `Em pausa há ${durationLabel(agora - ponto.pausaAbertaAt)}`;
    acoes = (
      <>
        <PunchButton
          variant="retorno"
          icon={PlayIcon}
          label="Retomar"
          busy={saving === 'retorno'}
          disabled={busy}
          onClick={() => onPunch('retorno')}
        />
        <PunchButton
          variant="danger"
          icon={StopIcon}
          label="Fim do turno"
          busy={saving === 'saida'}
          disabled={busy}
          onClick={() => onPunch('saida')}
        />
      </>
    );
  } else if (ponto.mode === 'proximo') {
    titulo = ponto.modeloNome || 'Turno';
    const falta = ponto.start - agora;
    linha =
      falta > 0
        ? `Próximo turno ${dayLabel(ponto.start)} · entra em ${countdownLabel(falta)}`
        : `Turno ${dayLabel(ponto.start)} · entrada liberada`;
    acoes = (
      <PunchButton
        icon={LogInIcon}
        label="Registrar entrada"
        busy={saving === 'entrada'}
        disabled={busy}
        pulse={falta <= 15 * 60000}
        onClick={() => onPunch('entrada')}
      />
    );
  }

  return createPortal(
    <div
      role="dialog"
      aria-label="Widget de turno"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: WIDTH,
        minHeight: 150,
        maxHeight: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        background: 'color-mix(in srgb, var(--c8) 32%, transparent)',
        backdropFilter: 'blur(28px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
        border: '1px solid color-mix(in srgb, white 12%, transparent)',
        boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
        zIndex: 900,
        overflow: 'hidden',
        fontFamily: 'var(--font-main)',
        animation: 'clk-panel-in 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        onMouseDown={startDrag}
        style={{
          height: 34,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '0 6px 0 10px',
          borderBottom: '1px solid color-mix(in srgb, white 10%, transparent)',
          cursor: arrastando ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <TurnoIcon size={18} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--c3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {titulo}
          </span>
        </span>
        <button
          type="button"
          aria-label="Fechar widget"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={onClose}
          className="clk-nav-btn"
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--c2)',
            cursor: 'pointer',
          }}
        >
          <CloseIcon size={12} />
        </button>
      </div>

      <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {justificativaPendente && ponto.mode !== 'ativo' && ponto.mode !== 'pausa' && (
          <button
            type="button"
            onClick={() => onOpenJustificativa(justificativaPendente)}
            style={{
              alignSelf: 'flex-start',
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: '#ff6b6b',
              fontSize: 11,
              fontFamily: 'var(--font-main)',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Você tem uma saída pendente de justificativa.
          </button>
        )}

        <span
          style={{
            fontSize: 12,
            lineHeight: 1.45,
            color: feedback ? (feedback.error ? '#ff6b6b' : 'var(--c1)') : 'var(--c3)',
          }}
        >
          {feedback ? feedback.text : linha}
        </span>

        {acoes && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{acoes}</div>}
      </div>
    </div>,
    document.body
  );
}
