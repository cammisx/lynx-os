import Window from '@/components/Window';
import { UsersIcon } from '@/components/icons';

/**
 * Janela de Chatters: vazia de propósito por enquanto.
 *
 * A tela antiga (lista, comissões e formulário) saiu daqui porque a janela vai
 * ser refeita. Os componentes que ela usava continuam no projeto (ChatterForm,
 * ChatterListRow), então nada se perdeu.
 */
export default function ChattersWindow({ onClose }) {
  return (
    <Window title="Chatters" icon={UsersIcon} onClose={onClose} width={620} height={480}>
      <div style={{ height: '100%' }} />
    </Window>
  );
}
