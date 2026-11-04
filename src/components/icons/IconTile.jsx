export default function IconTile({ variant = 'default', children }) {
  const color = variant === 'danger' ? '#ff6b6b' : 'var(--c1)';

  return (
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color,
      }}
    >
      {children}
    </span>
  );
}