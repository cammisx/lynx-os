import { CheckIcon, VolumeIcon } from '@/components/icons';

/** Interruptor em vidro, o mesmo desenho usado no resto do sistema. */
export function Interruptor({ ligado, onMudar, rotulo }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(ligado)}
      aria-label={rotulo}
      onClick={() => onMudar(!ligado)}
      style={{
        width: 34,
        height: 18,
        flexShrink: 0,
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: ligado ? 'flex-end' : 'flex-start',
        borderRadius: 999,
        border: `1px solid ${
          ligado
            ? 'color-mix(in srgb, var(--c1) 55%, transparent)'
            : 'color-mix(in srgb, var(--c2) 26%, transparent)'
        }`,
        background: ligado
          ? 'color-mix(in srgb, var(--c1) 30%, transparent)'
          : 'color-mix(in srgb, var(--c8) 55%, transparent)',
        cursor: 'pointer',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: ligado ? 'var(--c1)' : 'color-mix(in srgb, var(--c2) 70%, transparent)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }}
      />
    </button>
  );
}

/**
 * Um bloco de som: liga/desliga, lista de sons com prévia ao clicar e volume.
 *
 * A lista vem de fora (`sons`), então a galeria de áudios enviados pela pessoa
 * entra aqui sem mexer no desenho do bloco. `extra` é o espaço embaixo, usado
 * pelo botão de enviar áudio.
 */
export default function BlocoSom({
  titulo,
  dica,
  ligado,
  rotuloInterruptor,
  onAlternar,
  sons = [],
  escolhido,
  onEscolher,
  volume,
  onVolume,
  rodape = null,
  extra = null,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 40%, transparent)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--c2)',
            }}
          >
            {titulo}
          </span>
          {dica ? (
            <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.75, lineHeight: 1.4 }}>
              {dica}
            </span>
          ) : null}
        </div>
        <Interruptor ligado={ligado} onMudar={onAlternar} rotulo={rotuloInterruptor || titulo} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          gap: 6,
          opacity: ligado ? 1 : 0.55,
        }}
      >
        {sons.map((opcao) => {
          const ativo = escolhido === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              onClick={() => onEscolher?.(opcao.id)}
              title={opcao.nome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 8px',
                minHeight: 34,
                borderRadius: 8,
                border: `1px solid ${
                  ativo
                    ? 'color-mix(in srgb, var(--c1) 55%, transparent)'
                    : 'color-mix(in srgb, var(--c2) 16%, transparent)'
                }`,
                background: ativo
                  ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                  : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                color: ativo ? 'var(--c1)' : 'var(--c3)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                fontWeight: ativo ? 700 : 500,
                letterSpacing: '0.03em',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {opcao.nome}
              </span>
              {ativo ? <CheckIcon size={11} /> : null}
            </button>
          );
        })}
      </div>

      {extra}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: ligado ? 1 : 0.55 }}>
        <span style={{ display: 'flex', color: 'var(--c2)', flexShrink: 0 }}>
          <VolumeIcon size={13} />
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={volume ?? 60}
          aria-label={`Volume de ${titulo}`}
          onChange={(evento) => onVolume?.(Number(evento.target.value))}
          className="glass-range"
          style={{ '--glass-range-value': `${volume ?? 60}%` }}
        />
        <span style={{ fontSize: 10, color: 'var(--c2)', width: 30, textAlign: 'right' }}>
          {volume ?? 60}%
        </span>
      </div>

      {rodape ? (
        <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.4 }}>
          {rodape}
        </span>
      ) : null}
    </div>
  );
}
