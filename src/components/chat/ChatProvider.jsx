import { createContext, useContext, useMemo, useState } from 'react';
import useChat from '@/hooks/useChat';

const ChatContext = createContext(null);

/** Uma única fonte para a barra do chat e o botão da taskbar, para o badge e
 *  a conversa aberta nunca saírem de sincronia. */
export function ChatProvider({ children }) {
  const chat = useChat();
  const [aberto, setAberto] = useState(false);

  const valor = useMemo(
    () => ({
      ...chat,
      aberto,
      abrir: () => setAberto(true),
      fechar: () => setAberto(false),
      alternar: () => setAberto((anterior) => !anterior),
    }),
    [chat, aberto]
  );

  return <ChatContext.Provider value={valor}>{children}</ChatContext.Provider>;
}

export function useChatPanel() {
  const contexto = useContext(ChatContext);
  if (!contexto) throw new Error('useChatPanel precisa estar dentro de ChatProvider');
  return contexto;
}
