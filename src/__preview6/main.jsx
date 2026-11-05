import { createRoot } from 'react-dom/client';
import '@/theme.css';
import PaginasWidgetPanel from '@/components/desktop/PaginasWidgetPanel';

const agora = Date.now();
const iso = (d) => new Date(agora + d * 60000).toISOString();

const paginas = [
  { modelo_id: 'm1', modelo_nome: 'Ruiva', estado: 'programado_sem_entrada', ocupantes: [],
    liberada: false, liberada_de: null, libera_em_minutos: 24, minutos_livres: null, livre_ate: null,
    programado_agora: { inicio: iso(-6), fim: iso(354), usuario_nome: 'Duda' }, proximo: null },
  { modelo_id: 'm2', modelo_nome: 'Cienna', estado: 'livre', ocupantes: [], liberada: true,
    liberada_de: { usuario_nome: 'Davi', inicio: iso(-45), fim: iso(435), minutos_esperando: 45 },
    libera_em_minutos: null, minutos_livres: 435, livre_ate: iso(435), programado_agora: null, proximo: null },
  { modelo_id: 'm4', modelo_nome: 'Mel', estado: 'livre', ocupantes: [], liberada: false, liberada_de: null,
    libera_em_minutos: null, minutos_livres: 38, livre_ate: iso(38), programado_agora: null,
    proximo: { inicio: iso(38), fim: iso(398), usuario_nome: 'Davi', confirmado: true } },
  { modelo_id: 'm3', modelo_nome: 'Luna Ventura', estado: 'ocupada',
    ocupantes: [{ usuario_id: 'u9', usuario_nome: 'Sofia', desde: iso(-47), pausa: false }],
    liberada: false, liberada_de: null, libera_em_minutos: null, minutos_livres: null, proximo: null, programado_agora: null },
];

createRoot(document.getElementById('raiz')).render(
  <div data-theme="silk" style={{ minHeight: '100vh', background: 'linear-gradient(140deg,#1a0a18,#3a1230 55%,#0e0612)' }}>
    <PaginasWidgetPanel widget={{ aberto: true, painel_x: 20, painel_y: 20 }}
      paginas={paginas} carregando={false} erro={null} entrando={null}
      recarregar={() => {}} entrar={async () => ({ ok: true })} usuarioId="u1"
      onClose={() => {}} onMove={() => {}} />
  </div>
);
