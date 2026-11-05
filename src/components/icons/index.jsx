const Svg = ({ size = 16, className, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export function UsersIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

export function CalendarIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

export function LogOutIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  );
}

export function LogInIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </Svg>
  );
}

export function PauseIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <line x1="9" y1="5" x2="9" y2="19" />
      <line x1="15" y1="5" x2="15" y2="19" />
    </Svg>
  );
}

export function PlayIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <polygon points="7 4 19 12 7 20 7 4" />
    </Svg>
  );
}

export function StopIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </Svg>
  );
}

export function PlusIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

export function PencilIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </Svg>
  );
}

export function TrashIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Svg>
  );
}

export function ArchiveIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </Svg>
  );
}

export function BookIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a1.8 1.8 0 0 0-1.8-1.8H5.5A1.5 1.5 0 0 1 4 15.7z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a1.8 1.8 0 0 1 1.8-1.8h4.7A1.5 1.5 0 0 0 20 15.7z" />
      <path d="M6.5 8h3" />
      <path d="M6.5 11.5h3" />
    </Svg>
  );
}

export function MoreIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function CloseIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}
export function GiftIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M12 8v13" />
      <path d="M3 12h18" />
      <path d="M12 8c-2.5 0-4.5-1.3-4.5-3.2A2.3 2.3 0 0 1 9.8 2.5C11.5 2.5 12 5.2 12 8z" />
      <path d="M12 8c2.5 0 4.5-1.3 4.5-3.2A2.3 2.3 0 0 0 14.2 2.5C12.5 2.5 12 5.2 12 8z" />
    </Svg>
  );
}

export function CoffeeIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 9h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z" />
      <path d="M16 10h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 2v3M11 2v3" />
    </Svg>
  );
}

export function SlidersIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </Svg>
  );
}

export function ImageIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-6 6-3-3-4 4" />
    </Svg>
  );
}

export function GearIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

export function VolumeIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </Svg>
  );
}

export function MoneyIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M15 9.5a3 3 0 0 0-3-1.5c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2a3 3 0 0 1-3-1.5" />
    </Svg>
  );
}

export function UploadIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
    </Svg>
  );
}

export function DownloadIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
    </Svg>
  );
}

export function CheckIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function CheckAllIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M2 12.5 6 16.5 14 8.5" />
      <path d="M9 13 12.5 16.5 22 7" />
    </Svg>
  );
}

export function RefreshIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 4v5h-5" />
    </Svg>
  );
}

export function FireIcon({ size = 16, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 2.5c2.7 3 4.2 5.4 4.2 7.6a4.2 4.2 0 0 1-8.4 0c0-1 .3-2 1-3.1.4 1 1.2 1.7 2.1 1.9-.4-2.4-.3-4.5.3-6.2.2-.4.5-.5.8-.2Z" />
      <path d="M8.4 14.2A6 6 0 0 0 12 21.5a6 6 0 0 0 3.6-7.3" />
    </Svg>
  );
}
