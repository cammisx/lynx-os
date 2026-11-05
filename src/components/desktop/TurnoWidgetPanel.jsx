import { createPortal } from 'react-dom';
import PunchButton from '@/components/shifts/PunchButton';
import { CloseIcon, LogInIcon, PauseIcon, PlayIcon, StopIcon } from '@/components/icons';
import TurnoIcon from '@/components/icons/TurnoIcon';
import { countdownLabel, durationLabel } from '@/lib/ponto';
import { TASKBAR_SAFE, WIDGET_TILE } from './widgetLayout';

const WIDTH = 340;
const HEIGHT = 236;
const TASKBAR = TASKBAR_SAFE;

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

/** Posição do painel: nasce ao lado do ícone e nunca sai da tela. */
export const posicaoPainel = (icone) => {
  const largura = window.innerWidth;
  const altura = window.innerHeight;
  const abreParaEsquerda = icone.icone_x + WIDGET_TILE + WIDTH + 12 > largura;
  const x = abreParaEsquerda ? icone.icone_x - WIDTH - 12 : icone.icone_x + WIDGET_TILE + 12;
  const y = icone.icone_y - 8;
  return {
    left: Math.min(Math.max(8, x), Math.max(8, largura - WIDTH - 8)),
    top: Math.min(Math.max(8, y), Math.max(8, altura - TASKBAR - HEIGHT)),
  };
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
}) {
  const pos = posicaoPainel(widget);
  const busy = !!saving;
  const agora = Date.now();

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
        background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
        backdropFilter: 'blur(26px) saturate(1.35)',
        WebkitBackdropFilter: 'blur(26px) saturate(1.35)',
        border: '1px solid color-mix(in srgb, white 14%, color-mix(in srgb, var(--c1) 22%, transparent))',
        boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
        zIndex: 900,
        overflow: 'hidden',
        fontFamily: 'var(--font-main)',
        animation: 'clk-panel-in 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        style={{
          height: 34,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '0 6px 0 10px',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
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
