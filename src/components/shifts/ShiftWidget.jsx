import { useEffect, useState } from 'react';

const firstWord = (value) => {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  return words[0] || 'chatter';
};

const elapsedLabel = (from) => {
  const start = new Date(from).getTime();
  if (!Number.isFinite(start)) return '0min';
  const totalMin = Math.max(0, Math.floor((Date.now() - start) / 60000));
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return hours < 1 ? `${minutes}min` : `${hours}h ${minutes}min`;
};

const countdownLabel = (target) => {
  const diff = new Date(target).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return 'agora';
  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / 1440);
  if (days >= 1) return `${days}d ${Math.floor((totalMin % 1440) / 60)}h`;
  if (totalMin >= 60) return `${Math.floor(totalMin / 60)}h ${totalMin % 60}min`;
  return `${totalMin}min`;
};

const ACCENT = { color: 'var(--c1)' };

export default function ShiftWidget({
  user,
  activeShift,
  nextShift,
  saving,
  onPunchIn,
  onPunchOut,
}) {
  const [, setSecond] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSecond((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const nickname = firstWord(user?.full_name);
  const nextIn = nextShift ? new Date(nextShift.inicio).getTime() - Date.now() : Infinity;
  const canPunchIn = nextShift && nextIn <= 15 * 60000;

  let line = null;
  let action = null;

  if (activeShift) {
    line = (
      <>
        Você está em shift há{' '}
        <span style={ACCENT}>{elapsedLabel(activeShift.inicio_real || activeShift.created_date)}</span> em{' '}
        <span style={ACCENT}>{activeShift.modelo_nome || 'sem modelo'}</span>.
      </>
    );
    action = (
      <button
        type="button"
        className="clk-punch clk-punch-out"
        disabled={!!saving}
        onClick={onPunchOut}
      >
        {saving === 'out' ? 'Registrando…' : '⏹ Registrar Saída'}
      </button>
    );
  } else if (nextShift) {
    line = (
      <>
        Olá, {nickname}! Seu próximo turno começa em{' '}
        <span style={ACCENT}>{countdownLabel(nextShift.inicio)}</span> em{' '}
        <span style={ACCENT}>{nextShift.modelo_nome || 'sem modelo'}</span>.
      </>
    );
    if (canPunchIn) {
      action = (
        <button
          type="button"
          className="clk-punch clk-punch-in"
          disabled={!!saving}
          onClick={onPunchIn}
        >
          {saving === 'in' ? 'Registrando…' : '⏱ Registrar Entrada'}
        </button>
      );
    }
  } else {
    line = (
      <>
        Olá, {nickname}! Você não tem nenhum turno agendado este mês.
      </>
    );
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
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--c3)',
        lineHeight: 1.4,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>{line}</div>
      {action}
    </div>
  );
}