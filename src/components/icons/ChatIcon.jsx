/**
 * Ícone do chat: balão de conversa em traço, com a pontinha embaixo à direita.
 *
 * Segue a linguagem dos outros ícones (traço em currentColor), então herda a
 * cor do lugar onde aparece: cinza na barra de tarefas, dourado no hover.
 * Em 13px, no modal de perfil, o traço continua legível — o balão de vidro
 * antigo virava mancha nesse tamanho.
 */
export default function ChatIcon({ size = 20, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M3.5 11a6 6 0 0 0 6 6h7l4 4V10a6 6 0 0 0-6-6h-7a6 6 0 0 0-6 6z" />
    </svg>
  );
}
