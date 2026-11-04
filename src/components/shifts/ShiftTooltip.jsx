import { createPortal } from 'react-dom';

const WIDTH = 160;

const timeOf = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    <span
      style={{
        fontSize: 9,
        textTransform: 'uppercase',
        color: 'var(--c2)',
        opacity: 0.6,
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
    <span style={{ fontSize: 11, color: 'var(--c3)' }}>{value}</span>
  </div>
);

export default function ShiftTooltip({ shift, name, x, y }) {
  if (!shift) return null;

  const isLive = shift.status === 'em_andamento';
  const estimatedHeight = isLive ? 74 : 96;

  let left = x + 14;
  if (left + WIDTH + 8 > window.innerWidth) left = x - 14 - WIDTH;
  if (left < 8) left = 8;

  let top = y + 14;
  if (top + estimatedHeight + 8 > window.innerHeight) top = y - 14 - estimatedHeight;
  if (top < 8) top = 8;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left,
        top,
        width: WIDTH,
        background: 'color-mix(in srgb, var(--c8) 90%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
        borderRadius: 10,
        padding: '10px 12px',
        zIndex: 99999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: 'var(--font-main)',
      }}
    >
      <Row label="Chatter" value={name || shift.usuario_nome || '—'} />
      <Row label="Início" value={timeOf(shift.inicio)} />
      {!isLive && <Row label="Fim" value={timeOf(shift.fim)} />}
    </div>,
    document.body
  );
}