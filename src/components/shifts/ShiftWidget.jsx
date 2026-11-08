import { useEffect, useState } from 'react';
import PunchButton from '@/components/shifts/PunchButton';
import { LogInIcon, PauseIcon, PlayIcon, StopIcon } from '@/components/icons';
import { countdownLabel, durationLabel } from '@/lib/ponto';

const firstWord = (value) => {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  return words[0] || 'chatter';
};

const LINE_STYLE = {
  margin: 0,
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.4,
  color: 'var(--c3)',
  maxWidth: '100%',
};

const HIGHLIGHT = { display: 'inline', color: 'var(--c1)' };

const HINT_STYLE = { fontSize: 10, color: 'var(--c2)', opacity: 0.7 };

export default function ShiftWidget({
  user,
  displayName,
  ponto,
  saving,
  feedback,
  onPunch,
  justificativaPendente,
  onOpenJustificativa,
}) {
  const [, setSecond] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSecond((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const nickname = firstWord(displayName || user?.nome_exibicao || user?.full_name);
  const modelName = ponto.modeloNome || 'sem modelo';
  const busy = !!saving;

  let line = null;
  let actions = null;
  let hint = null;

  if (ponto.mode === 'ativo') {
    const elapsed =
      now - ponto.entradaAt - (ponto.pausasMs || 0) - (ponto.pausaAbertaAt ? now - ponto.pausaAbertaAt : 0);
    line = (
      <p style={LINE_STYLE}>
        Você está em shift há <span style={HIGHLIGHT}>{durationLabel(elapsed)}</span> em{' '}
        <span style={HIGHLIGHT}>{modelName}</span>.
      </p>
    );
    actions = (
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
          label="Registrar Saída"
          busy={saving === 'saida'}
          disabled={busy}
          onClick={() => onPunch('saida')}
        />
      </>
    );
  } else if (ponto.mode === 'pausa') {
    line = (
      <p style={LINE_STYLE}>
        Em pausa há <span style={HIGHLIGHT}>{durationLabel(now - ponto.pausaAbertaAt)}</span> de{' '}
        <span style={HIGHLIGHT}>{modelName}</span>.
      </p>
    );
    actions = (
      <>
        <PunchButton
          variant="retorno"
          icon={PlayIcon}
          label="Voltar da Pausa"
          busy={saving === 'retorno'}
          disabled={busy}
          onClick={() => onPunch('retorno')}
        />
        <PunchButton
          variant="danger"
          icon={StopIcon}
          label="Registrar Saída"
          busy={saving === 'saida'}
          disabled={busy}
          onClick={() => onPunch('saida')}
        />
      </>
    );
  } else if (ponto.mode === 'proximo') {
    const liberado = ponto.start - now <= 5 * 60000;
    line = (
      <p style={LINE_STYLE}>
        Olá, {nickname}! Seu próximo turno começa em{' '}
        <span style={HIGHLIGHT}>{countdownLabel(ponto.start - now)}</span> em{' '}
        <span style={HIGHLIGHT}>{modelName}</span>.
      </p>
    );
    hint = liberado ? null : 'Libera 5 minutos antes do início';
    actions = (
      <PunchButton
        icon={LogInIcon}
        label="Registrar Entrada"
        busy={saving === 'entrada'}
        disabled={busy || !liberado}
        pulse={liberado}
        onClick={() => onPunch('entrada')}
      />
    );
  } else {
    line = <p style={LINE_STYLE}>Olá, {nickname}! Você não tem nenhum turno agendado.</p>;
  }

  return (
    <div
      style={{
        height: '20%',
        flexShrink: 0,
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        fontFamily: 'var(--font-main)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {justificativaPendente && ponto.mode !== 'ativo' && ponto.mode !== 'pausa' && (
          <button
            type="button"
            onClick={() => onOpenJustificativa(justificativaPendente)}
            style={{
              alignSelf: 'flex-start',
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: 'var(--erro)',
              fontSize: 11,
              fontFamily: 'var(--font-main)',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Você tem uma saída pendente de justificativa.
          </button>
        )}
        {feedback ? (
          <span
            style={{ fontSize: 11, color: feedback.error ? 'var(--erro)' : 'var(--c1)' }}
          >
            {feedback.text}
          </span>
        ) : (
          line
        )}
        {hint && !feedback && <span style={HINT_STYLE}>{hint}</span>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}