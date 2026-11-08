import { useEffect } from 'react';
import { CheckIcon, CloseIcon, VolumeIcon } from '@/components/icons';
import { SONS } from '@/lib/sons';
import usePreferenciaSom from '@/hooks/usePreferenciaSom';

/** Interruptor pequeno, igual ao que já era usado aqui. */
function Interruptor({ ligado, onMudar, rotulo }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onMudar(!ligado)}
      style={{
        width: 34,
        height: 18,
        flexShrink: 0,
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: ligado ? 'flex-end' : 'flex-start',
        borderRadius: 999,
        border: `1px solid ${
          ligado
            ? 'color-mix(in srgb, var(--c1) 55%, transparent)'
            : 'color-mix(in srgb, var(--c2) 26%, transparent)'
        }`,
        background: ligado
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
          background: ligado ? 'var(--c1)' : 'color-mix(in srgb, var(--c2) 70%, transparent)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }}
      />
    </button>
  );
}

function Linha({ titulo, detalhe, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--c3)' }}>{titulo}</span>
        {detalhe && (
          <span style={{ display: 'block', fontSize: 9, color: 'var(--c2)', opacity: 0.75 }}>
            {detalhe}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const SECAO = {
  fontFamily: 'var(--font-display)',
  fontSize: 10,
  letterSpacing: '0.06em',
  color: 'var(--c1)',
  marginTop: 2,
};

/**
 * Ajustes do chat: som das mensagens e avisos por e-mail. Tudo é escolha de
 * cada pessoa e vale só para ela.
 */
export default function ChatAjustes({ onFechar }) {
  const preferencia = usePreferenciaSom();
  const pref = preferencia?.pref || {
    som_chat: 'mensagem',
    chat_ativo: true,
    volume_chat: 60,
    notificar_email: true,
    email_todas: false,
  };
  const ligado = pref.chat_ativo !== false;
  const mencoesPorEmail = pref.notificar_email !== false;
  const todasPorEmail = pref.email_todas === true;

  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') onFechar?.();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        right: 10,
        width: 268,
        maxHeight: '78vh',
        overflowY: 'auto',
        zIndex: 20,
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: 'color-mix(in srgb, var(--c8) 82%, transparent)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        border: '1px solid color-mix(in srgb, var(--c1) 24%, transparent)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.42)',
        fontFamily: 'var(--font-main)',
      }}
      className="glass-scroll"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--c1)',
          }}
        >
          AJUSTES DO CHAT
        </span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar ajustes"
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--c2)',
            cursor: 'pointer',
          }}
        >
          <CloseIcon size={11} />
        </button>
      </div>

      <span style={SECAO}>SOM DAS MENSAGENS</span>

      <Linha titulo="Tocar ao receber">
        <Interruptor
          ligado={ligado}
          rotulo="Ligar ou desligar o som das mensagens"
          onMudar={(valor) => preferencia?.alternarSomChat?.(valor)}
        />
      </Linha>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SONS.map((opcao) => {
          const escolhido = pref.som_chat === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              onClick={() => preferencia?.escolherSomChat?.(opcao.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 8px',
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
                fontSize: 10.5,
                cursor: 'pointer',
                opacity: ligado ? 1 : 0.55,
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: ligado ? 1 : 0.55 }}>
        <span style={{ display: 'flex', color: 'var(--c2)', flexShrink: 0 }}>
          <VolumeIcon size={13} />
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={pref.volume_chat ?? 60}
          aria-label="Volume do som das mensagens"
          onChange={(evento) => preferencia?.mudarVolumeChat?.(Number(evento.target.value))}
          className="glass-range"
          style={{ '--glass-range-value': `${pref.volume_chat ?? 60}%` }}
        />
        <span style={{ fontSize: 10, color: 'var(--c2)', width: 28, textAlign: 'right' }}>
          {pref.volume_chat ?? 60}%
        </span>
      </div>

      <div
        style={{
          height: 1,
          background: 'color-mix(in srgb, var(--c2) 16%, transparent)',
          margin: '2px 0',
        }}
      />

      <span style={SECAO}>AVISOS POR E-MAIL</span>

      <Linha titulo="Fui mencionado" detalhe="Quando alguém usa @com o seu nome">
        <Interruptor
          ligado={mencoesPorEmail}
          rotulo="Receber e-mail quando me mencionarem"
          onMudar={(valor) => preferencia?.alternarEmailMencoes?.(valor)}
        />
      </Linha>

      <Linha
        titulo="Todas as mensagens"
        detalhe="Tudo o que passa nos canais que você participa"
      >
        <Interruptor
          ligado={todasPorEmail}
          rotulo="Receber e-mail de todas as mensagens"
          onMudar={(valor) => preferencia?.alternarEmailTodas?.(valor)}
        />
      </Linha>

      <span style={{ fontSize: 8.5, color: 'var(--c2)', opacity: 0.65, lineHeight: 1.4 }}>
        Os avisos vão para o e-mail da sua conta. Menções vêm marcadas para todo mundo; todas
        as mensagens não.
      </span>

      <div
        style={{
          height: 1,
          background: 'color-mix(in srgb, var(--c2) 16%, transparent)',
          margin: '2px 0',
        }}
      />

      <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.4 }}>
        O som aqui é independente do som das notificações.
      </span>
    </div>
  );
}
