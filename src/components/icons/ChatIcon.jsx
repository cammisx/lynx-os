/**
 * Ícone do chat: balão redondo com a pontinha embaixo à esquerda.
 *
 * Desenho copiado da referência da Chloë: círculo de raio 11.25 num viewBox de
 * 24 (o traço encosta nas bordas, como na imagem), pontinha saindo da curva
 * entre 123° e 147° até o canto inferior esquerdo, traço de 1.5.
 * Em currentColor, então herda a cor do lugar (cinza na barra, dourado no hover).
 */
export default function ChatIcon({ size = 20, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M5.82 21.4A11.25 11.25 0 1 0 2.53 18.07L0.75 23.15Z" />
    </svg>
  );
}
