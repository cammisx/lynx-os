import Window from '@/components/Window';
import { PaletteIcon } from '@/components/icons';

/**
 * Janela do Paint: a referência da API de plugins do Paint.NET embutida.
 *
 * O que entra aqui é a API em si (namespaces, classes e membros), não a página
 * de introdução: é o que se consulta de verdade enquanto se escreve um efeito.
 * A janela é grande por padrão e o iframe ocupa tudo o que sobrar; no celular
 * ela vira tela cheia como as outras.
 */

const DOCS = 'https://paintdotnet.github.io/apidocs/api/index.html';

export default function PaintWindow({ onClose }) {
  return (
    <Window title="Paint" icon={PaletteIcon} onClose={onClose} width={980} height={640}>
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
