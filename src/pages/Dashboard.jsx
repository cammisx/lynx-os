import { useEffect, useState } from 'react';
import '@/theme.css';
import DesktopBackground from '@/components/DesktopBackground';
import DesktopWidgets from '@/components/desktop/DesktopWidgets';
import Taskbar from '@/components/Taskbar';
import ChattersWindow from '@/components/ChattersWindow';
import ModelosWindow from '@/components/ModelosWindow';
import TurnosWindow from '@/components/TurnosWindow';
import FinanceiroWindow from '@/components/FinanceiroWindow';
import { ChatProvider } from '@/components/chat/ChatProvider';
import ChatSidebar from '@/components/chat/ChatSidebar';
import useFecharTurnosEsquecidos from '@/hooks/useFecharTurnosEsquecidos';
import useAvisarTurnosPendentes from '@/hooks/useAvisarTurnosPendentes';
import useVersaoPublicada from '@/hooks/useVersaoPublicada';

export default function Dashboard() {
  const [openApp, setOpenApp] = useState(null);

  useFecharTurnosEsquecidos();
  useAvisarTurnosPendentes();
  useVersaoPublicada();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'silk');
    root.setAttribute('data-mode', 'dark');
    document.body.classList.add('is-desktop-shell');
    return () => document.body.classList.remove('is-desktop-shell');
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--c8)',
      }}
    >
      <DesktopBackground />
      <ChatProvider>
        <DesktopWidgets />
        <Taskbar onOpenApp={setOpenApp} />
        <ChatSidebar />
      </ChatProvider>

      {openApp === 'chatters' && <ChattersWindow onClose={() => setOpenApp(null)} />}

      {openApp === 'modelos' && <ModelosWindow onClose={() => setOpenApp(null)} />}

      {openApp === 'turnos' && <TurnosWindow onClose={() => setOpenApp(null)} />}

      {openApp === 'financeiro' && <FinanceiroWindow onClose={() => setOpenApp(null)} />}
    </div>
  );
}