import { useEffect, useState } from 'react';
import '@/theme.css';
import DesktopBackground from '@/components/DesktopBackground';
import Taskbar from '@/components/Taskbar';
import ChattersWindow from '@/components/ChattersWindow';
import ModelosWindow from '@/components/ModelosWindow';
import TurnosWindow from '@/components/TurnosWindow';
import useFecharTurnosEsquecidos from '@/hooks/useFecharTurnosEsquecidos';
import useAvisarTurnosPendentes from '@/hooks/useAvisarTurnosPendentes';

export default function Dashboard() {
  const [openApp, setOpenApp] = useState(null);

  useFecharTurnosEsquecidos();
  useAvisarTurnosPendentes();

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
      <Taskbar onOpenApp={setOpenApp} />

      {openApp === 'chatters' && <ChattersWindow onClose={() => setOpenApp(null)} />}

      {openApp === 'modelos' && <ModelosWindow onClose={() => setOpenApp(null)} />}

      {openApp === 'turnos' && <TurnosWindow onClose={() => setOpenApp(null)} />}
    </div>
  );
}