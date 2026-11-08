import Window from '@/components/Window';
import { ImageIcon } from '@/components/icons';

/* Janela de Conteúdo: por enquanto só o lugar reservado, sem nada dentro. */
export default function ConteudoWindow({ onClose }) {
  return (
    <Window title="Conteúdo" icon={ImageIcon} onClose={onClose} width={720} height={520}>
      <div
        style={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
          borderRadius: 12,
          border: '1px dashed color-mix(in srgb, var(--c1) 22%, transparent)',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: '50%',
            color: 'var(--c1)',
            background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--c1) 26%, transparent)',
          }}
        >
          <ImageIcon size={20} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c3)' }}>
          Conteúdo
        </span>
        <span style={{ fontSize: 12, color: 'var(--c2)', maxWidth: 320 }}>
          Nada por aqui ainda.
        </span>
      </div>
    </Window>
  );
}
