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

const REPEAT_OPTIONS = [
  { value: 'nenhuma', label: 'Não repete' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const chipStyle = (active) => ({
  width: 34,
  height: 28,
  borderRadius: 7,
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  fontWeight: 700,
  padding: 0,
  cursor: 'pointer',
  background: active ? 'color-mix(in srgb, var(--c1) 20%, transparent)' : 'none',
  border: active
    ? '1px solid color-mix(in srgb, var(--c1) 45%, transparent)'
    : '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  color: active ? 'var(--c1)' : 'var(--c2)',
});

export default function RepeatFields({
  repeticao,
  dias,
  repetirAte,
  onRepeticaoChange,
  onToggleDia,
  onRepetirAteChange,
}) {
  const active = repeticao !== 'nenhuma';

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Repetição</span>
        <select
          style={controlStyle}
          value={repeticao}
          onChange={(event) => onRepeticaoChange(event.target.value)}
        >
          {REPEAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Dias da semana</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {WEEKDAYS.map((label, index) => {
              const marked = dias.includes(index);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={marked}
                  onClick={() => onToggleDia(index)}
                  style={chipStyle(marked)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

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