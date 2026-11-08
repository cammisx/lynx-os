import { useEffect, useState } from 'react';
import { abrirConfigNaAba } from '@/lib/configAba';
import { GearIcon, PlusIcon } from '@/components/icons';
import { BackIcon } from '@/components/chat/chatIcons';
import ChatIcon from '@/components/icons/ChatIcon';
import CanalLista from '@/components/chat/CanalLista';
import ChatConversa from '@/components/chat/ChatConversa';
import NovoChatModal from '@/components/chat/NovoChatModal';
import { useChatPanel } from '@/components/chat/ChatProvider';
import { definirFocoDoChat } from '@/lib/sons';

/**
 * Chat em tela cheia no celular.
 *
 * É a mesma fonte de dados do desktop (ChatProvider): a lista de canais ocupa
 * a tela e a conversa entra por cima, com voltar no cabeçalho. O campo de
 * mensagem fica colado na barra inferior.
 */
export default function MobileChat({ onVoltar }) {
  const { aberto, canalAtivo, fecharCanal, erro, totalNaoLidas, recarregar } = useChatPanel();
  const [novo, setNovo] = useState(false);

  useEffect(() => {
    definirFocoDoChat(aberto ? canalAtivo?.id || 'lista' : null);
  }, [aberto, canalAtivo]);

  const botao = {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    color: 'var(--c3)',
    borderRadius: 12,
    padding: 0,
    flexShrink: 0,
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 'calc(46px + env(safe-area-inset-top))',
        bottom: 'calc(58px + env(safe-area-inset-bottom))',
        zIndex: 8300,
        display: 'flex',
        flexDirection: 'column',
        background: 'color-mix(in srgb, var(--c8) 70%, transparent)',
        backdropFilter: 'blur(22px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
        fontFamily: 'var(--font-main)',
      }}
    >
      <div
        style={{
          height: 50,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 6px 0 2px',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
        }}
      >
        <button
          type="button"
          style={botao}
          aria-label={canalAtivo ? 'Voltar para os canais' : 'Voltar ao início'}
          onClick={() => {
            if (canalAtivo) fecharCanal();
            else onVoltar?.();
          }}
        >
          <BackIcon size={19} />
        </button>

        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            minWidth: 0,
            justifyContent: 'center',
            color: 'var(--c1)',
          }}
        >
          {canalAtivo ? null : <ChatIcon size={17} />}
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13.5,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {canalAtivo ? '' : 'Chat'}
          </span>
          {!canalAtivo && totalNaoLidas > 0 ? (
            <span style={{ fontSize: 9.5, color: 'var(--c2)' }}>{totalNaoLidas} nova(s)</span>
          ) : null}
        </span>

        <button
          type="button"
          style={botao}
          aria-label="Abrir as configurações do chat"
          onClick={() => abrirConfigNaAba('chat')}
        >
          <GearIcon size={16} />
        </button>
        <button
          type="button"
          style={botao}
          aria-label="Nova conversa"
          onClick={() => setNovo(true)}
        >
          <PlusIcon size={17} />
        </button>
      </div>

      {erro ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            fontSize: 11,
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
              fontSize: 11,
              fontFamily: 'inherit',
            }}
          >
            tentar
          </button>
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {canalAtivo ? <ChatConversa onVoltar={fecharCanal} /> : <CanalLista onNovo={() => setNovo(true)} />}
      </div>

      {novo ? <NovoChatModal onClose={() => setNovo(false)} /> : null}
    </div>
  );
}
