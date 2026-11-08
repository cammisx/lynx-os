/**
 * Catálogo das janelas que abrem do menu iniciar.
 * O mesmo título e ícone aparecem na barra de tarefas quando a janela está
 * aberta, então os dois lugares bebem daqui.
 */
import { UsersIcon, CalendarIcon, MoneyIcon, BookIcon, GearIcon } from '@/components/icons';

export const JANELAS = {
  chatters: { titulo: 'Chatters', Icone: UsersIcon },
  modelos: { titulo: 'Modelos', Icone: UsersIcon },
  turnos: { titulo: 'Turnos', Icone: CalendarIcon },
  financeiro: { titulo: 'Financeiro', Icone: MoneyIcon },
  playbook: { titulo: 'Playbook', Icone: BookIcon },
  config: { titulo: 'Configurações', Icone: GearIcon },
};

export const janelaPorId = (id) => JANELAS[id] || null;
