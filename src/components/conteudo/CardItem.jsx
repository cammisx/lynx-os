import { diaTexto, duracaoTexto, precisaDuracao, tipoLabel, tituloDoItem } from '@/lib/conteudoPastas';

const selo = {
  padding: '2px 6px',
  borderRadius: 6,
  fontSize: 8.5,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

/** Cartão de um item do conteúdo: capa, tipo, duração, data e tags. */
export default function CardItem({ item, admin, onAbrir, onRemover }) {
  const tags = item.tags || [];
  const visiveis = tags.slice(0, 3);
  const resto = tags.length - visiveis.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
      }}
    >
      <div
        onClick={onAbrir}
        style={{ position: 'relative', height: 104, cursor: 'pointer', background: 'var(--c16)' }}
      >
        {item.imagem_url ? (
          <img
            src={item.imagem_url}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9.5,
              color: 'var(--c2)',
            }}
          >
            sem imagem
          </div>
        )}

        <span
          style={{
            ...selo,
            position: 'absolute',
            left: 6,
            top: 6,
            color: 'var(--c1)',
            background: 'color-mix(in srgb, var(--c8) 72%, transparent)',
            border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
          }}
        >
          {tipoLabel(item.tipo)}
        </span>

        {precisaDuracao(item.tipo) && item.duracao_seg ? (
          <span
            style={{
              ...selo,
              position: 'absolute',
              right: 6,
              top: 6,
              color: 'var(--c3)',
              background: 'color-mix(in srgb, var(--c8) 72%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c2) 24%, transparent)',
            }}
          >
            {duracaoTexto(item.duracao_seg)}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '7px 8px 8px' }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: 'var(--c3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={tituloDoItem(item)}
        >
          {tituloDoItem(item)}
        </span>
        <span style={{ fontSize: 9, color: 'var(--c2)' }}>{diaTexto(item.data)}</span>

        {visiveis.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {visiveis.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '1px 5px',
                  borderRadius: 5,
                  fontSize: 8,
                  letterSpacing: '0.04em',
                  color: 'var(--c1)',
                  background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--c1) 24%, transparent)',
                }}
              >
                {tag}
              </span>
            ))}
            {resto > 0 ? (
              <span style={{ fontSize: 8, color: 'var(--c2)', alignSelf: 'center' }}>+{resto}</span>
            ) : null}
          </div>
        ) : null}

        {admin ? (
          <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
            <button
              type="button"
              onClick={onAbrir}
              style={{
                flex: 1,
                padding: '4px 6px',
                borderRadius: 6,
                border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                background: 'transparent',
                color: 'var(--c3)',
                fontFamily: 'var(--font-main)',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={onRemover}
              aria-label="Remover item"
              style={{
                padding: '4px 7px',
                borderRadius: 6,
                border: '1px solid color-mix(in srgb, var(--erro) 30%, transparent)',
                background: 'color-mix(in srgb, var(--erro) 10%, transparent)',
                color: 'var(--erro)',
                fontFamily: 'var(--font-main)',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
