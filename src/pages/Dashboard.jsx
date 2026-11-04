import { useEffect } from 'react';
import '@/theme.css';
import DesktopBackground from '@/components/DesktopBackground';
import Taskbar from '@/components/Taskbar';

export default function Dashboard() {
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
      <Taskbar />
    </div>
  );
}