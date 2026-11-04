import RepeatSelect from '@/components/shifts/RepeatSelect';

const controlStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  color: 'var(--c3)',
  fontSize: 12,
  padding: '7px 9px',
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

const labelStyle = {
  fontSize: 10,
  color: 'var(--c2)',
  opacity: 0.7,
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const chipStyle = (marked, disabled) => ({
  width: 34,
  height: 28,
  borderRadius: 7,
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  fontWeight: 700,
  padding: 0,
  background: marked ? 'color-mix(in srgb, var(--c1) 20%, transparent)' : 'none',
  border: marked
    ? '1px solid color-mix(in srgb, var(--c1) 45%, transparent)'
    : '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  color: marked ? 'var(--c1)' : 'var(--c2)',
  opacity: disabled ? 0.4 : 1,
  cursor: disabled ? 'default' : 'pointer',
});

export default function RepeatFields({
  repeticao,
  dias,
  repetirAte,
  onRepeticaoChange,
  onToggleDia,
  onRepetirAteChange,
}) {
  const active = repeticao !== 'unica';

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Repetição</span>
        <RepeatSelect value={repeticao} onChange={onRepeticaoChange} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {WEEKDAYS.map((label, index) => {
            const marked = dias.includes(index);
            return (
              <button
                key={label}
                type="button"
                className={`rp-chip${marked ? ' is-marked' : ''}`}
                aria-pressed={marked}
                disabled={!active}
                onClick={() => {
                  if (!active) return;
                  onToggleDia(index);
                }}
                style={chipStyle(marked, !active)}
              >
                {label}
              </button>
            );
          })}
        </div>
        {!active && (
          <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.7 }}>
            O turno acontece só na data de início
          </span>
        )}
      </div>

      {active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Repetir até</span>
          <input
            type="date"
            style={controlStyle}
            value={repetirAte}
            onChange={(event) => onRepetirAteChange(event.target.value)}
          />
        </div>
      )}
    </>
  );
}