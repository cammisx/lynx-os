import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import useChat from '@/hooks/useChat';

const ChatContext = createContext(null);

/** Uma única fonte para a barra do chat e o botão da taskbar, para o badge e
 *  a conversa aberta nunca saírem de sincronia. */
export function ChatProvider({ children, proximaCamada }) {
  const chat = useChat();
  const [aberto, setAberto] = useState(false);
  /* Camada reservada ao abrir: a barra nasce na frente de todas as janelas,
     igual ao relógio. Clicar numa janela dá a ela uma camada maior, então ela
     vem para a frente sem interromper a conversa. */
  const [camada, setCamada] = useState(0);

  const abrir = useCallback(() => {
    if (!aberto && proximaCamada) setCamada(proximaCamada());
    setAberto(true);
  }, [aberto, proximaCamada]);

  const fechar = useCallback(() => setAberto(false), []);

  const alternar = useCallback(() => {
    if (aberto) fechar();
    else abrir();
  }, [aberto, abrir, fechar]);

  const valor = useMemo(
    () => ({ ...chat, aberto, camada, abrir, fechar, alternar }),
    [chat, aberto, camada, abrir, fechar, alternar]
  );

  return <ChatContext.Provider value={valor}>{children}</ChatContext.Provider>;
}

export function useChatPanel() {
  const contexto = useContext(ChatContext);
  if (!contexto) throw new Error('useChatPanel precisa estar dentro de ChatProvider');
  return contexto;
}
