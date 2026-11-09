import Window from '@/components/Window';
import { PaletteIcon } from '@/components/icons';

/**
 * Janela do Paints: a documentação da API de plugins do Paint.NET embutida.
 *
 * É um app de consulta, então a janela é grande por padrão e o iframe ocupa
 * tudo o que sobrar. O site é o mesmo em qualquer aparelho; no celular a
 * janela vira tela cheia como as outras.
 */

const DOCS = 'https://paintdotnet.github.io/apidocs/index.html';

export default function PaintsWindow({ onClose }) {
  return (
    <Window title="Paints" icon={PaletteIcon} onClose={onClose} width={980} height={640}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <iframe
          src={DOCS}
          title="Paint.NET Plugin API Documentation"
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            border: 'none',
            display: 'block',
            background: '#fff',
          }}
          referrerPolicy="no-referrer"
          allow="fullscreen"
        />
      </div>
    </Window>
  );
}
