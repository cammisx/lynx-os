/**
 * Ícones do chat que não existem no conjunto geral: enviar, voltar e buscar.
 * Mesmo traço fino dos outros ícones do desktop.
 */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const SendIcon = ({ size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M21.5 3.5 2.5 11l7 2.5 2.5 7 9.5-17Z" />
    <path d="M21.5 3.5 9.5 13.5" />
  </svg>
);

export const BackIcon = ({ size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const SearchIcon = ({ size = 15, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);

export const PaperclipIcon = ({ size = 15, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.2 3.2 0 0 1 4.5 4.5L9.5 17a1.6 1.6 0 0 1-2.3-2.3l7.8-7.8" />
  </svg>
);

export const MoreIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const PencilIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z" />
  </svg>
);

export const TrashIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 12h10l1-12" />
  </svg>
);

export const EyeOffIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M4 4l16 16" />
    <path d="M10 6.2A8.8 8.8 0 0 1 12 6c5 0 8.5 4.3 9.5 6-.4.6-1 1.5-1.9 2.4M6.6 7.8C5 9 3.6 10.6 2.5 12c1 1.7 4.5 6 9.5 6 1.4 0 2.6-.3 3.7-.8" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const DownloadIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
  </svg>
);

export const FileIcon = ({ size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5" />
  </svg>
);

export const CloseIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const MicIcon = ({ size = 15, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 12a6.5 6.5 0 0 0 13 0M12 18.5V21" />
  </svg>
);

export const StopIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
  </svg>
);

export const PlayIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M8 5.5 19 12 8 18.5V5.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const PauseIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <rect x="7" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const CheckIcon = ({ size = 14, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <path d="M5 12.5 9.5 17 19 7" />
  </svg>
);

export const SmileIcon = ({ size = 15, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2" />
    <path d="M9 9.6v.9M15 9.6v.9" />
  </svg>
);
