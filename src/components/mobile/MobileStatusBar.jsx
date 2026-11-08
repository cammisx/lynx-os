import { useEffect, useState } from 'react';
import { CheckAllIcon } from '@/components/icons';
import NotificationRow from '@/components/notifications/NotificationRow';
import MobileSheet from '@/components/mobile/MobileSheet';
import useNotifications from '@/hooks/useNotifications';
import usePreferenciaSom from '@/hooks/usePreferenciaSom';
import useAcoesNotificacoes from '@/hooks/useAcoesNotificacoes';
import { isNaoLida } from '@/lib/notificacoes';
import { iniciaisDe } from '@/lib/perfilLogica';

/**
 * Barra de status do celular: nome do sistema e relógio à esquerda, sino e
 * avatar à direita. O sino abre as notificações numa folha e cada uma faz o
 * mesmo que a versão de desktop faria.
 */
export default function MobileStatusBar({ user, perfil, onPerfil, onAbrirChat }) {
  const { items, naoLidas, markRead, markAllRead, reload } = useNotifications(
    user?.id,
    user?.role === 'admin'
  );
  usePreferenciaSom();
  const { abrir, modais } = useAcoesNotificacoes({ reload, aoAbrirChat: onAbrirChat });
  const [agora, setAgora] = useState(() => new Date());
  const [sino, setSino] = useState(false);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(relogio);
  }, []);

  const hora = agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const data = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const nome = (perfil?.nomeExibicao || user?.full_name || user?.email || 'Conta').trim();

  const abrirNotificacao = (notificacao) => {
    markRead(notificacao.id);
    setSino(false);
    abrir(notificacao);
  };

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9300,
          height: 'calc(46px + env(safe-area-inset-top))',
          paddingTop: 'env(safe-area-inset-top)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 14,
          paddingRight: 8,
          background: 'color-mix(in srgb, var(--c8) 72%, transparent)',
          backdropFilter: 'blur(22px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
          fontFamily: 'var(--font-main)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            letterSpacing: '0.06em',
            color: 'var(--c1)',
          }}
        >
          LYNX
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--c2)', whiteSpace: 'nowrap' }}>
          {data} · {hora}
        </span>
        <span style={{ flex: 1 }} />

        <button
          type="button"
          aria-label="Notificações"
          onClick={() => {
            reload();
            setSino(true);
          }}
          style={{
            position: 'relative',
            width: 42,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--c3)',
            padding: 0,
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {naoLidas > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 7,
                minWidth: 15,
                height: 15,
                padding: '0 3px',
                borderRadius: 999,
                background: 'var(--c1)',
                color: 'var(--c8)',
                fontSize: 8.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          aria-label="Seu perfil"
          onClick={onPerfil}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
            background: perfil?.fotoUrl
              ? `center / cover no-repeat url(${perfil.fotoUrl})`
              : 'color-mix(in srgb, var(--c1) 18%, transparent)',
            color: 'var(--c1)',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-main)',
            padding: 0,
            flexShrink: 0,
          }}
        >
          {perfil?.fotoUrl ? '' : iniciaisDe(nome)}
        </button>
      </header>

      {sino ? (
        <MobileSheet
          titulo="Notificações"
          subtitulo={naoLidas ? `${naoLidas} sem ler` : 'Tudo em dia'}
          onFechar={() => setSino(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={() => markAllRead()}
              disabled={!naoLidas}
              style={{
                alignSelf: 'flex-end',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                marginBottom: 4,
                borderRadius: 10,
                border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                background: 'transparent',
                color: naoLidas ? 'var(--c1)' : 'var(--c2)',
                fontFamily: 'var(--font-main)',
                fontSize: 11,
              }}
            >
              <CheckAllIcon size={13} /> Marcar todas
            </button>
            {items.length ? (
              items.map((item) => (
                <NotificationRow
                  key={item.id}
                  notification={item}
                  read={!isNaoLida(item)}
                  onOpen={() => abrirNotificacao(item)}
                />
              ))
            ) : (
              <span style={{ fontSize: 12, color: 'var(--c2)', padding: 8 }}>
                Nada por aqui ainda.
              </span>
            )}
          </div>
        </MobileSheet>
      ) : null}

      {modais}
    </>
  );
}
