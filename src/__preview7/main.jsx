import { createRoot } from 'react-dom/client';
import '@/theme.css';
import WeekGrid from '@/components/shifts/WeekGrid';

const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const hoje = new Date();
hoje.setHours(0, 0, 0, 0);
const days = Array.from({ length: 7 }, (_, i) => addDays(hoje, i));

const at = (day, h) => {
  const d = new Date(day);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

const shifts = [
  { id: 's1', usuario_id: 'u1', usuario_nome: 'Cammis', modelo_id: 'm1', modelo_nome: 'Cienna',
    inicio: at(days[1], 8), fim: at(days[1], 16), status: 'agendado', dias_semana: [] },
  { id: 's2', usuario_id: 'u2', usuario_nome: 'Sofia', modelo_id: 'm1', modelo_nome: 'Cienna',
    inicio: at(days[3], 12), fim: at(days[3], 20), status: 'agendado', dias_semana: [] },
];

const Grade = ({ pessoal }) => (
  <div style={{ height: 260, padding: 8 }}>
    <WeekGrid days={days} shifts={shifts} userId="u1"
      chatterNames={{ u1: 'Cammis', u2: 'Sofia' }} pontoIndex={{}} agendaPessoal={pessoal} />
  </div>
);

createRoot(document.getElementById('raiz')).render(
  <div data-theme="silk" style={{ background: 'linear-gradient(140deg,#1a0a18,#3a1230 55%,#0e0612)', minHeight: '100vh' }}>
    <div id="a"><Grade pessoal /></div>
    <div id="b" style={{ marginTop: 300 }}><Grade pessoal={false} /></div>
  </div>
);
