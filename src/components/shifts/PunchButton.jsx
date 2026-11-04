const VARIANTS = {
  primary: 'ponto-primary',
  retorno: 'ponto-blue',
  danger: 'ponto-danger',
};

export default function PunchButton({
  variant = 'primary',
  icon: Icon,
  label,
  busy,
  disabled,
  pulse,
  onClick,
}) {
  const classes = ['ponto-btn', VARIANTS[variant] || VARIANTS.primary];
  if (pulse) classes.push('ponto-pulse');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      disabled={disabled || busy}
      onClick={onClick}
    >
      {Icon && <Icon size={13} />}
      {busy ? 'Registrando…' : label}
    </button>
  );
}