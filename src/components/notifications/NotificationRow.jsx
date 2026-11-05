import { useState } from 'react';
import { FireIcon } from '@/components/icons';
import { SEQUENCIA_COM_FOGUINHO } from '@/lib/cutucadas';
import { paraData } from '@/lib/chat';

/* O banco manda created_date em UTC, sem timezone. Ler direto com new Date()
   jogava o horário 3h para frente em São Paulo. */
const timeLabel = (value) => {
  const date = paraData(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${date.toLocaleTimeString(
    'pt-BR',
    { hour: '2-digit', minute: '2-digit', hour12: false }
  )}`;
};

export default function NotificationRow({ notification, read, onOpen }) {
  const [hovered, setHovered] = useState(false);
  const pending = notification.status === 'pendente';
  const foguinho =
    notification.tipo === 'cutucada' &&
    Number(notification.cutucada_sequencia || 0) >= SEQUENCIA_COM_FOGUINHO;

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'block',
        position: 'relative',
        padding: '10px 12px',
        paddingRight: 24,
        border: 'none',
        borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
        background: hovered ? 'color-mix(in srgb, var(--c1) 10%, transparent)' : 'transparent',
        cursor: 'pointer',
        opacity: read ? 0.6 : 1,
        fontFamily: 'var(--font-main)',
        transition: 'background-color 0.12s',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--c3)',
          lineHeight: 1.35,
        }}
      >
        {foguinho && (
          <span style={{ color: 'var(--c1)', display: 'flex', flexShrink: 0 }}>
            <FireIcon size={13} />
          </span>
        )}
        <span style={{ minWidth: 0 }}>{notification.titulo}</span>
      </span>
      <span
        style={{
          display: 'block',
          fontSize: 11,
          color: 'var(--c2)',
          lineHeight: 1.4,
          marginTop: 2,
        }}
      >
        {notification.mensagem}
      </span>
      <span
        style={{
          display: 'block',
          fontSize: 10,
          color: 'var(--c2)',
          opacity: 0.6,
          marginTop: 4,
        }}
      >
        {timeLabel(notification.created_date)}
      </span>

      {pending && !read && (
        <span
          style={{
            position: 'absolute',
            right: 10,
            top: 14,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--c1)',
          }}
        />
      )}
    </button>
  );
}