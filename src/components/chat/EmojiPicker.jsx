import { useEffect, useRef, useState } from 'react';
import { CATEGORIAS_EMOJI } from '@/lib/emojis';

/** Teclado de emojis em vidro, abre acima do campo e fecha ao clicar fora. */
export default function EmojiPicker({ onEscolher, onFechar }) {
  const [categoria, setCategoria] = useState(CATEGORIAS_EMOJI[0].id);
  const caixaRef = useRef(null);

  useEffect(() => {
    const fora = (evento) => {
      if (!caixaRef.current?.contains(evento.target)) onFechar();
    };
    const tecla = (evento) => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [onFechar]);

  const atual = CATEGORIAS_EMOJI.find((item) => item.id === categoria) || CATEGORIAS_EMOJI[0];

  return (
    <div
      ref={caixaRef}
      style={{
        position: 'absolute',
        right: 8,
        bottom: 50,
        width: 262,
        maxHeight: 236,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--c1) 26%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 94%, transparent)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 14px 38px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '5px 6px',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
        }}
      >
        {CATEGORIAS_EMOJI.map((item) => {
          const ativa = item.id === categoria;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategoria(item.id)}
              title={item.titulo}
              aria-label={item.titulo}
              style={{
                flex: 1,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: 6,
                background: ativa ? 'color-mix(in srgb, var(--c1) 20%, transparent)' : 'transparent',
                fontSize: 12,
                lineHeight: 1,
                cursor: 'pointer',
                opacity: ativa ? 1 : 0.6,
              }}
            >
              {item.rotulo}
            </button>
          );
        })}
      </div>

      <div
        className="glass-scroll"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 2,
          padding: 7,
          overflowY: 'auto',
        }}
      >
        {atual.itens.map((emoji, indice) => (
          <button
            key={`${atual.id}-${indice}`}
            type="button"
            onMouseDown={(evento) => evento.preventDefault()}
            onClick={() => onEscolher(emoji)}
            style={{
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              fontSize: 16,
              lineHeight: 1,
              cursor: 'pointer',
            }}
            onMouseEnter={(evento) => {
              evento.currentTarget.style.background = 'color-mix(in srgb, var(--c2) 16%, transparent)';
            }}
            onMouseLeave={(evento) => {
              evento.currentTarget.style.background = 'transparent';
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
