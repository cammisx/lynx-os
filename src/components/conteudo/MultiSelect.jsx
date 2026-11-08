import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* Lista de escolha múltipla no vidro do projeto: abre para baixo, alinhada e
   na largura do campo, com marcação em cada opção. */
const ALTURA_MAXIMA = 220;
const ALTURA_MINIMA = 120;
const FOLGA = 6;

const painel = {
  position: 'fixed',
  left: 0,
  top: 0,
  zIndex: 12000,
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 12,
  background:
    'linear-gradient(to bottom, color-mix(in srgb, var(--ink-hex) 4%, transparent) 0%, transparent 18%), color-mix(in srgb, var(--c8) 72%, transparent)',
  backdropFilter: 'blur(32px) saturate(1.5)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
  border: '1px solid color-mix(in srgb, var(--ink-hex) 16%, color-mix(in srgb, var(--c1) 20%, transparent))',
  boxShadow: '0 16px 40px color-mix(in srgb, black 35%, transparent)',
  overflow: 'hidden',
};

const opcao = (ativa) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '7px 10px',
  borderRadius: 7,
  border: 'none',
  background: ativa ? 'color-mix(in srgb, var(--c6) 75%, transparent)' : 'transparent',
  color: ativa ? 'var(--c8)' : 'var(--c2)',
  fontSize: 11.5,
  fontFamily: 'var(--font-main)',
  fontWeight: ativa ? 700 : 400,
  cursor: 'pointer',
  textAlign: 'left',
});

const caixa = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 4,
  minHeight: 32,
  padding: '4px 6px',
  borderRadius: 8,
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c6) 35%, transparent)',
};

export default function MultiSelect({
  valores = [],
  opcoes = [],
  onChange,
  label,
  placeholder = 'Escolher',
  disabled = false,
}) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState(null);
  const caixaRef = useRef(null);
  const painelRef = useRef(null);

  const medir = useCallback(() => {
    const elemento = caixaRef.current;
    if (!elemento) return;
    const inicial = elemento.getBoundingClientRect();
    const abaixo = window.innerHeight - inicial.bottom - FOLGA - 8;
    if (abaixo < ALTURA_MINIMA + 40) elemento.scrollIntoView({ block: 'center' });

    const r = caixaRef.current?.getBoundingClientRect() || inicial;
    const sobra = window.innerHeight - r.bottom - FOLGA - 8;
    const largura = Math.round(r.width);
    setPos({
      left: Math.max(8, Math.min(Math.round(r.left), window.innerWidth - largura - 8)),
      top: Math.round(r.bottom) + FOLGA,
      width: largura,
      maxHeight: Math.max(ALTURA_MINIMA, Math.min(ALTURA_MAXIMA, sobra)),
    });
  }, []);

  useEffect(() => {
    if (!aberto) {
      setPos(null);
      return undefined;
    }
    medir();
    const aoMover = () => medir();
    window.addEventListener('scroll', aoMover, true);
    window.addEventListener('resize', aoMover);
    return () => {
      window.removeEventListener('scroll', aoMover, true);
      window.removeEventListener('resize', aoMover);
    };
  }, [aberto, medir]);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento) => {
      const dentroDoCampo = caixaRef.current && caixaRef.current.contains(evento.target);
      const dentroDaLista = painelRef.current && painelRef.current.contains(evento.target);
      if (!dentroDoCampo && !dentroDaLista) setAberto(false);
    };
    const tecla = (evento) => {
      if (evento.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  const alternar = (valor) => {
    const marcados = (valores || []).map(String);
    if (marcados.includes(String(valor))) {
      onChange((valores || []).filter((item) => String(item) !== String(valor)));
    } else {
      onChange([...(valores || []), valor]);
    }
  };

  const escolhidos = opcoes.filter((opcaoItem) =>
    (valores || []).map(String).includes(String(opcaoItem.value))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span
          style={{
            fontSize: 9.5,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--c2)',
          }}
        >
          {label}
        </span>
      )}

      <div
        ref={caixaRef}
        onClick={() => {
          if (!disabled) setAberto(true);
        }}
        style={{ ...caixa, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'default' : 'pointer' }}
      >
        {!escolhidos.length && (
          <span style={{ fontSize: 11, color: 'var(--c2)', padding: '2px 4px' }}>{placeholder}</span>
        )}

        {escolhidos.map((opcaoItem) => (
          <span
            key={opcaoItem.value}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 6,
              fontSize: 9.5,
              color: 'var(--c1)',
              background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c1) 28%, transparent)',
            }}
          >
            {opcaoItem.label}
            {!disabled && (
              <button
                type="button"
                onClick={(evento) => {
                  evento.stopPropagation();
                  alternar(opcaoItem.value);
                }}
                aria-label={`Remover ${opcaoItem.label}`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: 10,
                  lineHeight: 1,
                  padding: 0,
                  opacity: 0.75,
                }}
              >
                ✕
              </button>
            )}
          </span>
        ))}
      </div>

      {aberto &&
        !disabled &&
        pos &&
        createPortal(
          <div
            ref={painelRef}
            style={{ ...painel, left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight }}
          >
            <div
              className="glass-scroll"
              style={{
                maxHeight: Math.max(ALTURA_MINIMA, pos.maxHeight - 12),
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                padding: '6px 5px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {!opcoes.length && (
                <span style={{ padding: '7px 10px', fontSize: 10.5, color: 'var(--c2)', opacity: 0.8 }}>
                  Nada disponível ainda.
                </span>
              )}

              {opcoes.map((opcaoItem) => {
                const marcado = (valores || []).map(String).includes(String(opcaoItem.value));
                return (
                  <button
                    key={opcaoItem.value}
                    type="button"
                    onClick={() => alternar(opcaoItem.value)}
                    style={opcao(marcado)}
                  >
                    <span
                      style={{
                        width: 13,
                        height: 13,
                        borderRadius: 4,
                        border: `1px solid ${marcado ? 'transparent' : 'color-mix(in srgb, var(--c2) 45%, transparent)'}`,
                        background: marcado ? 'color-mix(in srgb, var(--c1) 85%, transparent)' : 'transparent',
                        color: 'var(--c8)',
                        fontSize: 9,
                        lineHeight: '12px',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {marcado ? '✓' : ''}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opcaoItem.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
