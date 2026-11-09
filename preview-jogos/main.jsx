import { createRoot } from 'react-dom/client';
import '@/theme.css';
import JogosWindow from '@/components/JogosWindow';

createRoot(document.getElementById('raiz')).render(
  <div
    style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 30% 20%, #2b0a22, #12030c 60%, #0a0107)',
    }}
  >
    <JogosWindow onClose={() => {}} />
  </div>
);
