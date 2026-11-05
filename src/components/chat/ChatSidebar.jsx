import { useState } from 'react';
import { CloseIcon, PlusIcon } from '@/components/icons';
import { useChatPanel } from '@/components/chat/ChatProvider';
import CanalLista from '@/components/chat/CanalLista';
import ChatConversa from '@/components/chat/ChatConversa';
import NovoChatModal from '@/components/chat/NovoChatModal';
import ChatIcon from '@/components/icons/ChatIcon';

/** Barra fixa do lado direito do desktop. */
export default function ChatSidebar() {
  const { aberto, fechar, canalAtivo, fecharCanal, erro, totalNaoLidas, recarregar } = useChatPanel();
  const [novo, setNovo] = useState(false);

  if (!aberto) return null;

  const botaoHeader = {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    color: 'var(--c2)',
    cursor: 'pointer',
    borderRadius: 7,
  };

  return (
    <>
      <aside
        className="chat-painel"
        aria-label="Chat interno"
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          bottom: 'calc(100vh * 1.5 / 24 + 12px)',
          width: 372,
          maxWidth: '94vw',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 14,
          background: 'color-mix(in srgb, var(--c8) 62%, transparent)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid color-mix(in srgb, var(--c1) 20%, transparent)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
          overflow: 'hidden',
          fontFamily: 'var(--font-main)',
        }}
      >
        <div
          style={{
            height: 44,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 8px 0 12px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <ChatIcon size={20} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--c1)',
              flex: 1,
            }}
          >
            Chat
            {totalNaoLidas > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 9,
                  fontFamily: 'var(--font-main)',
                  color: 'var(--c2)',
                  letterSpacing: '0.04em',
                }}
              >
                {totalNaoLidas} nova(s)
              </span>
            )}
          </span>
          <button
            type="button"
            style={botaoHeader}
            className="chat-icone"
            aria-label="Nova conversa"
            onClick={() => setNovo(true)}
          >
            <PlusIcon size={14} />
          </button>
          <button
            type="button"
            style={botaoHeader}
            className="chat-icone"
            aria-label="Fechar chat"
            onClick={fechar}
          >
            <CloseIcon size={13} />
          </button>
        </div>

        {erro && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              fontSize: 10.5,
              color: 'var(--c6)',
              borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
            }}
          >
            <span style={{ flex: 1 }}>{erro}</span>
            <button
              type="button"
              onClick={recarregar}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--c1)',
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: 'var(--font-main)',
              }}
            >
              tentar
            </button>
          </div>
        )}

        {canalAtivo ? (
          <ChatConversa onVoltar={fecharCanal} />
        ) : (
          <CanalLista onNovo={() => setNovo(true)} />
        )}
      </aside>

      {novo && <NovoChatModal onClose={() => setNovo(false)} />}
    </>
  );
}
