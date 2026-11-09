import Window from '@/components/Window';
import { PaletteIcon } from '@/components/icons';
import PaintCanvas from '@/components/paint/PaintCanvas';

/**
 * Janela do Paint: o editor de pintura.
 *
 * A janela é grande por padrão porque a tela de desenho aproveita tudo. No
 * celular ela vira tela cheia como as outras.
 */
export default function PaintWindow({ onClose }) {
  return (
    <Window title="Paint" icon={PaletteIcon} onClose={onClose} width={1080} height={700}>
      <PaintCanvas />
    </Window>
  );
}
