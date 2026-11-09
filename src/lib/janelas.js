/**
 * Catálogo das janelas que abrem do menu iniciar.
 * O mesmo título e ícone aparecem na barra de tarefas quando a janela está
 * aberta, então os dois lugares bebem daqui.
 */
import {
  StarIcon,
  UsersIcon,
  CalendarIcon,
  MoneyIcon,
  BookIcon,
  ImageIcon,
  GearIcon,
  PaletteIcon,
  GamepadIcon,
  EstrategiaIcon,
} from '@/components/icons';

/*
 * `somenteAdmin`: janela que um chatter nem enxerga no celular, igual ao menu
 * iniciar do desktop (lá o chatter só vê playbook, conteúdo, paint e jogos).
 * `naGrade`: se o app aparece na grade do "Mais". Playbook e conteúdo já estão
 * no dock e configurações mora na engrenagem da barra de status.
 */
export const JANELAS = {
  chatters: { titulo: 'Chatters', Icone: UsersIcon, somenteAdmin: true, naGrade: true },
  modelos: { titulo: 'Modelos', Icone: StarIcon, somenteAdmin: true, naGrade: true },
  turnos: { titulo: 'Turnos', Icone: CalendarIcon, somenteAdmin: true, naGrade: true },
  financeiro: { titulo: 'Financeiro', Icone: MoneyIcon, somenteAdmin: true, naGrade: true },
  playbook: { titulo: 'Playbook', Icone: BookIcon, naGrade: false },
  estrategias: { titulo: 'Estratégias', Icone: EstrategiaIcon, naGrade: true },
  conteudo: { titulo: 'Conteúdo', Icone: ImageIcon, naGrade: false },
  paint: { titulo: 'Paint', Icone: PaletteIcon, naGrade: true },
  jogos: { titulo: 'Jogos', Icone: GamepadIcon, naGrade: true },
  config: { titulo: 'Configurações', Icone: GearIcon, naGrade: false },
};

/* Apps que a grade do "Mais" mostra para quem está logado. */
export const janelasDaGrade = (admin) =>
  Object.entries(JANELAS).filter(
    ([, meta]) => meta.naGrade && (admin || !meta.somenteAdmin)
  );

export const janelaPorId = (id) => JANELAS[id] || null;
