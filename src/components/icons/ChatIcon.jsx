import { useId } from 'react';

/**
 * Ícone do chat: dois balões de conversa em vidro, no gradiente do tema.
 * O viewBox é fechado no desenho (24x24) para o ícone ficar nítido em 24px
 * na taskbar e continuar bonito em 48px no widget.
 */
export default function ChatIcon({ size = 20, ...rest }) {
  const unico = useId().replace(/:/g, '');
  const gradiente = `chat-grad-${unico}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id={gradiente} x1="8" y1="20" x2="21" y2="8" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: 'var(--c1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--c1-deep)' }} />
        </linearGradient>
      </defs>

      {/* balão de trás, em vidro leve */}
      <path
        d="M9.9 3.2h4.4a3.5 3.5 0 0 1 3.5 3.5v3a3.5 3.5 0 0 1-3.5 3.5h-.9l-2.9 2.3.25-2.3h-.85A3.5 3.5 0 0 1 6.4 9.7v-3a3.5 3.5 0 0 1 3.5-3.5Z"
        fill="var(--c1)"
        fillOpacity="0.32"
        stroke="rgba(255,255,255,0.30)"
        strokeWidth="1.1"
      />

      {/* balão da frente, cheio */}
      <path
        d="M13.7 7.4h4.6a3.4 3.4 0 0 1 3.4 3.4v3a3.4 3.4 0 0 1-3.4 3.4h-.75l.3 2.3-2.95-2.3h-1.2a3.4 3.4 0 0 1-3.4-3.4v-3a3.4 3.4 0 0 1 3.4-3.4Z"
        fill={`url(#${gradiente})`}
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.2"
      />

      {/* os três pontinhos */}
      <circle cx="13.6" cy="12.7" r="0.95" fill="rgba(255,255,255,0.92)" />
      <circle cx="16.5" cy="12.7" r="0.95" fill="rgba(255,255,255,0.92)" />
      <circle cx="19.4" cy="12.7" r="0.95" fill="rgba(255,255,255,0.92)" />
    </svg>
  );
}
