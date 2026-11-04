import { WEEKDAY_LABELS, daysLabel, sortDays } from '@/lib/shiftRepeat';
import DateTimePicker from '@/components/DateTimePicker';

const labelStyle = {
  fontSize: 10,
  color: 'var(--c2)',
  opacity: 0.7,
};

const chipStyle = (marked) => ({
  width: 34,
  height: 28,
  borderRadius: 7,
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  fontWeight: 700,
  padding: 0,
  cursor: 'pointer',
  background: marked ? 'color-mix(in srgb, var(--c1) 20%, transparent)' : 'none',
  border: marked
    ? '1px solid color-mix(in srgb, var(--c1) 45%, transparent)'
    : '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  color: marked ? 'var(--c1)' : 'var(--c2)',
});

export default function RepeatFields({ dias, repetirAte, onToggleDia, onRepetirAteChange }) {
  const marked = sortDays(dias);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {WEEKDAY_LABELS.map((label, index) => {
            const isMarked = marked.includes(index);
            return (
              <button
                key={label}
                type="button"
                className={`rp-chip${isMarked ? ' is-marked' : ''}`}
                aria-pressed={isMarked}
                onClick={() => onToggleDia(index)}
                style={chipStyle(isMarked)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.7 }}>
          {marked.length
            ? `Repete toda semana: ${daysLabel(marked)}`
            : 'Turno único, acontece só na data de início'}
        </span>
      </div>

      {marked.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <DateTimePicker label="Repetir até" value={repetirAte} onChange={onRepetirAteChange} mode="date" />
          <span style={labelStyle}>Deixe vazio para repetir sem prazo</span>
        </div>
      )}
    </>
  );
}