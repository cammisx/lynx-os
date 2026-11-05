import { createRoot } from 'react-dom/client';
import '@/theme.css';
import PaginasWidgetPanel from '@/components/desktop/PaginasWidgetPanel';

const agora = Date.now();
const iso = (ms) => new Date(ms).toISOString();

const paginas = [
  {
    modelo_id: 'm1', modelo_nome: 'Cienna', estado: 'livre',
    ocupantes: [], minutos_livres: 184, livre_ate: iso(agora + 184 * 60000),
    proximo: { inicio: iso(agora + 184 * 60000), fim: iso(agora + 544 * 60000), usuario_nome: 'Davi', confirmado: true },
    programado_agora: null,
  },
  {
    modelo_id: 'm2', modelo_nome: 'Luna Ventura', estado: 'ocupada',
    ocupantes: [{ usuario_nome: 'Sofia', desde: iso(agora - 47 * 60000), pausa: false }],
    minutos_livres: null, proximo: null, programado_agora: null,
  },
  {
    modelo_id: 'm3', modelo_nome: 'Ruiva', estado: 'programado_sem_entrada',
    ocupantes: [], minutos_livres: null, proximo: null,
    programado_agora: { inicio: iso(agora - 12 * 60000), fim: iso(agora + 348 * 60000), usuario_nome: 'Duda' },
  },
  {
    modelo_id: 'm4', modelo_nome: 'Mel', estado: 'livre',
    ocupantes: [], minutos_livres: 38, livre_ate: iso(agora + 38 * 60000),
    proximo: { inicio: iso(agora + 38 * 60000), fim: iso(agora + 398 * 60000), usuario_nome: 'Davi', confirmado: true },
    programado_agora: null,
  },
];

createRoot(document.getElementById('raiz')).render(
  <div data-theme="silk" style={{ minHeight: '100vh', background: 'linear-gradient(140deg,#1a0a18,#3a1230 55%,#0e0612)' }}>
    <PaginasWidgetPanel
      widget={{ aberto: true, painel_x: 20, painel_y: 20 }}
      paginas={paginas}
      carregando={false}
      erro={null}
      entrando={null}
      recarregar={() => {}}
      entrar={async () => ({ ok: true })}
      onClose={() => {}}
      onMove={() => {}}
    />
  </div>
);
