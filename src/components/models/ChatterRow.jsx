const idInputStyle = {
  width: 46,
  boxSizing: 'border-box',
  textAlign: 'center',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  padding: '6px 8px',
  color: 'var(--c1)',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

export default function ChatterRow({
  nome,
  checked,
  identificador,
  error,
  locked = false,
  onToggle,
  onIdentificadorChange,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        className="md-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 6px',
          borderRadius: 6,
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            minWidth: 0,
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--c3)',
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={locked}
            onChange={onToggle}
            style={{ accentColor: 'var(--c1)', cursor: locked ? 'default' : 'pointer' }}
          />
          <span
            style={{
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {nome}
          </span>
          {locked && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--c1)',
                opacity: 0.7,
                flexShrink: 0,
              }}
            >
              admin
            </span>
          )}
        </label>

        {checked && (
          <input
            value={identificador}
            onChange={(event) => onIdentificadorChange(event.target.value)}
            maxLength={2}
            inputMode="numeric"
            placeholder="ID"
            aria-label="ID"
            title="ID"
            style={idInputStyle}
          />
        )}
      </div>

      {checked && error && (
        <span style={{ fontSize: 10, color: '#ff6b6b', paddingLeft: 26 }}>{error}</span>
      )}
    </div>
  );
}