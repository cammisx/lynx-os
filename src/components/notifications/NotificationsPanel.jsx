import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, CloseIcon, GearIcon, VolumeIcon } from '@/components/icons';
import NotificationRow from '@/components/notifications/NotificationRow';
import { isNaoLida } from '@/lib/notificacoes';
import { SONS } from '@/lib/sons';

export default function NotificationsPanel({ items, anchorRef, onOpen, onClose, preferencia }) {
  const panelRef = useRef(null);
  const [filtro, setFiltro] = useState('nao_lidas');
  const [config, setConfig] = useState(false);

  const som = preferencia?.pref || { som: 'suave', ativo: true, volume: 60 };

  const naoLidas = useMemo(() => items.filter(isNaoLida), [items]);
  const visiveis = filtro === 'nao_lidas' ? naoLidas : items;

  useEffect(() => {
    const handleDown = (event) => {
      if (panelRef.current && panelRef.current.contains(event.target)) return;
      if (anchorRef && anchorRef.current && anchorRef.current.contains(event.target)) return;
      onClose();
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: 'calc(100vh * 1.5 / 24)',
        right: 3,
        width: 340,
        maxHeight: 420,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 12,
        background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid color-mix(in srgb, white 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
        boxShadow: '0 -2px 24px rgba(0,0,0,0.45)',
        zIndex: 9100,
        fontFamily: 'var(--font-main)',
        animation: 'clk-panel-in 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        style={{
          height: 34,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 12px',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c3)' }}>
          {config ? 'Som de notificação' : 'Notificações'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            type="button"
            aria-label={config ? 'Voltar para as notificações' : 'Configurar som de notificação'}
            title="Som de notificação"
            onClick={() => setConfig((atual) => !atual)}
            className="clk-nav-btn"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              borderRadius: 6,
              background: config ? 'color-mix(in srgb, var(--c1) 18%, transparent)' : 'transparent',
              color: config ? 'var(--c1)' : 'var(--c2)',
              cursor: 'pointer',
            }}
          >
            <GearIcon size={12} />
          </button>
          <button
            type="button"
            aria-label="Fechar notificações"
            onClick={onClose}
          className="clk-nav-btn"
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--c2)',
            cursor: 'pointer',
          }}
        >
            <CloseIcon size={12} />
          </button>
        </span>
      </div>

      {!config && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexShrink: 0,
          padding: '0 8px',
          height: 28,
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
        }}
      >
        {[
          { id: 'nao_lidas', label: 'Não lidas', count: naoLidas.length },
          { id: 'todas', label: 'Ver todas', count: items.length },
        ].map((aba) => {
          const ativa = filtro === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setFiltro(aba.id)}
              style={{
                height: 28,
                padding: '0 8px',
                border: 'none',
                borderBottom: `2px solid ${ativa ? 'var(--c1)' : 'transparent'}`,
                borderRadius: 0,
                background: 'transparent',
                color: ativa ? 'var(--c1)' : 'var(--c2)',
                fontFamily: 'var(--font-main)',
                fontSize: 10,
                fontWeight: ativa ? 700 : 500,
                letterSpacing: '0.03em',
                opacity: ativa ? 1 : 0.6,
                cursor: 'pointer',
                transition: 'color 0.15s, opacity 0.15s',
              }}
            >
              {aba.label} ({aba.count})
            </button>
          );
        })}
      </div>
      )}

      {config ? (
        <div
          className="glass-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--c3)' }}>Tocar som nas notificações</span>
            <button
              type="button"
              role="switch"
              aria-checked={som.ativo}
              aria-label="Ligar ou desligar o som"
              onClick={() => preferencia?.alternarSom?.(!som.ativo)}
              style={{
                width: 34,
                height: 18,
                flexShrink: 0,
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: som.ativo ? 'flex-end' : 'flex-start',
                borderRadius: 999,
                border: `1px solid ${
                  som.ativo
                    ? 'color-mix(in srgb, var(--c1) 55%, transparent)'
                    : 'color-mix(in srgb, var(--c2) 26%, transparent)'
                }`,
                background: som.ativo
                  ? 'color-mix(in srgb, var(--c1) 30%, transparent)'
                  : 'color-mix(in srgb, var(--c8) 55%, transparent)',
                cursor: 'pointer',
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: som.ativo ? 'var(--c1)' : 'color-mix(in srgb, var(--c2) 70%, transparent)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                }}
              />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SONS.map((opcao) => {
              const escolhido = som.som === opcao.id;
              return (
                <button
                  key={opcao.id}
                  type="button"
                  onClick={() => preferencia?.escolherSom?.(opcao.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '7px 9px',
                    textAlign: 'left',
                    borderRadius: 8,
                    border: `1px solid ${
                      escolhido
                        ? 'color-mix(in srgb, var(--c1) 55%, transparent)'
                        : 'color-mix(in srgb, var(--c2) 16%, transparent)'
                    }`,
                    background: escolhido
                      ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                      : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                    color: escolhido ? 'var(--c1)' : 'var(--c3)',
                    fontFamily: 'var(--font-main)',
                    fontSize: 11,
                    cursor: 'pointer',
                    opacity: som.ativo ? 1 : 0.55,
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: escolhido ? 700 : 500,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {opcao.nome}
                  </span>
                  {escolhido && <CheckIcon size={12} />}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: som.ativo ? 1 : 0.55 }}>
            <span style={{ display: 'flex', color: 'var(--c2)', flexShrink: 0 }}>
              <VolumeIcon size={13} />
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={som.volume}
              aria-label="Volume do som"
              onChange={(event) => preferencia?.mudarVolume?.(Number(event.target.value))}
              className="glass-range"
              style={{ '--glass-range-value': `${som.volume}%` }}
            />
            <span style={{ fontSize: 10, color: 'var(--c2)', width: 28, textAlign: 'right' }}>
              {som.volume}%
            </span>
          </div>

          <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.4 }}>
            A escolha fica salva na sua conta.
          </span>
        </div>
      ) : (
      <div
        className="glass-scroll"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}
      >
        {visiveis.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--c2)',
              opacity: 0.6,
            }}
          >
            {filtro === 'nao_lidas' ? 'Nada não lido.' : 'Nada por aqui.'}
          </div>
        ) : (
          visiveis.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              read={Boolean(notification.lida) || notification.status === 'resolvida'}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
      )}
    </div>,
    document.body
  );
}