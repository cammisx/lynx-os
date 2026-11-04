import { useEffect, useState } from 'react';
import '@/theme.css';
import DesktopBackground from '@/components/DesktopBackground';
import Taskbar from '@/components/Taskbar';
import Window from '@/components/Window';
import ModelosWindow from '@/components/ModelosWindow';

export default function Dashboard() {
  const [openApp, setOpenApp] = useState(null);

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

      {openApp === 'modelos' && <ModelosWindow onClose={() => setOpenApp(null)} />}

      {openApp === 'turnos' && (
        <Window title="🗓️ Turnos" onClose={() => setOpenApp(null)} width={520} height={380}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--c2)', fontFamily: 'var(--font-main)' }}>
            em breve
          </p>
        </Window>
      )}
    </div>
  );
}