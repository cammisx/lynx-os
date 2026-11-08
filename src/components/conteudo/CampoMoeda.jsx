const campo = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  outline: 'none',
  boxSizing: 'border-box',
};

const formatar = (valor) =>
  valor === null || valor === undefined ? '' : valor.toFixed(2).replace('.', ',');

/** Campo de dinheiro com máscara: quem digita pensa em centavos, a tela mostra "120,00". */
export default function CampoMoeda({ valor, onChange, disabled, placeholder = '0,00' }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span
        style={{
          position: 'absolute',
          left: 7,
          fontSize: 9.5,
          color: 'var(--c2)',
          opacity: 0.75,
          pointerEvents: 'none',
        }}
      >
        R$
      </span>
      <input
        value={formatar(valor)}
        onChange={(evento) => onChange(valorDigitado(evento.target.value))}
        onFocus={(evento) => evento.target.select()}
        disabled={disabled}
        inputMode="numeric"
        placeholder={placeholder}
        style={{ ...campo, paddingLeft: 24, textAlign: 'right', opacity: disabled ? 0.6 : 1 }}
      />
    </div>
  );
}

/** Dígitos digitados viram reais: "123456" -> 1234.56. Vazio vira null. */
export const valorDigitado = (texto) => {
  const digitos = String(texto || '').replace(/\D/g, '').slice(0, 11);
  if (!digitos) return null;
  return Number(digitos) / 100;
};
