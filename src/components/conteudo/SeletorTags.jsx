import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { comTag, juntarTags, semTag, tagNormalizada } from '@/lib/conteudoPastas';

/* A lista abre sempre para baixo, colada na borda esquerda do campo e na
   mesma largura dele. Se não houver espaço embaixo, o campo sobe um pouco
   dentro do formulário em vez de a lista pular para cima do campo. */
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
  justifyContent: 'space-between',
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

/**
 * Campo de tags: mostra as escolhidas como etiquetas, abre a lista das que já
 * existem, filtra enquanto digita e cria tag nova com o texto digitado.
 *
 * Tag não diferencia maiúscula de minúscula: digitar "natal" acha e cria
 * NATAL, e nunca duplica.
 */
export default function SeletorTags({
  valor = [],
  onChange,
  sugestoes = [],
  label = 'Tags',
  disabled = false,
  onCriarTag,
}) {
  const [texto, setTexto] = useState('');
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef(null);
  const painelRef = useRef(null);
  const [pos, setPos] = useState(null);

  const medir = useCallback(() => {
    const caixa = caixaRef.current;
    if (!caixa) return;

    const inicial = caixa.getBoundingClientRect();
    const abaixo = window.innerHeight - inicial.bottom - FOLGA - 8;

    /* Pouco espaço embaixo: leva o campo para o meio da tela e mede de novo,
       para a lista caber inteira abaixo dele. */
    if (abaixo < ALTURA_MINIMA + 40) {
      caixa.scrollIntoView({ block: 'center' });
    }

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

  const escolhidas = juntarTags(valor);

  const filtradas = useMemo(() => {
    const busca = tagNormalizada(texto);
    return juntarTags(sugestoes).filter(
      (tag) => !escolhidas.includes(tag) && (!busca || tag.includes(busca))
    );
  }, [sugestoes, escolhidas, texto]);

  const digitada = tagNormalizada(texto);
  const podeCriar = Boolean(digitada) && !juntarTags([...sugestoes, ...escolhidas]).includes(digitada);

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
      const dentroDaCaixa = caixaRef.current && caixaRef.current.contains(evento.target);
      const dentroDaLista = painelRef.current && painelRef.current.contains(evento.target);
      if (!dentroDaCaixa && !dentroDaLista) setAberto(false);
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

  const adicionar = (tag) => {
    onChange(comTag(escolhidas, tag));
    onCriarTag?.(tag);
    setTexto('');
    setAberto(true);
  };

  const remover = (tag) => onChange(semTag(escolhidas, tag));

  const aoTeclar = (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      const primeira = filtradas[0];
      if (digitada && podeCriar) adicionar(digitada);
      else if (digitada && primeira) adicionar(primeira);
      else if (primeira) adicionar(primeira);
      return;
    }
    if (evento.key === 'Backspace' && !texto && escolhidas.length) {
      remover(escolhidas[escolhidas.length - 1]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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

      <div
        ref={caixaRef}
        onClick={() => {
          if (!disabled) setAberto(true);
        }}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 4,
          minHeight: 32,
          padding: '4px 6px',
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
          border: '1px solid color-mix(in srgb, var(--c6) 35%, transparent)',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'default' : 'text',
        }}
      >
        {escolhidas.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 6,
              fontSize: 9.5,
              letterSpacing: '0.03em',
              color: 'var(--c1)',
              background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c1) 28%, transparent)',
            }}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(evento) => {
                  evento.stopPropagation();
                  remover(tag);
                }}
                aria-label={`Remover tag ${tag}`}
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

        {!disabled && (
          <input
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            onFocus={() => setAberto(true)}
            onKeyDown={aoTeclar}
            placeholder={escolhidas.length ? '' : 'Escolher ou criar tag'}
            style={{
              flex: 1,
              minWidth: 90,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--c3)',
              fontFamily: 'var(--font-main)',
              fontSize: 11,
              padding: '3px 2px',
            }}
          />
        )}
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
              {podeCriar && (
                <button type="button" onClick={() => adicionar(digitada)} style={opcao(true)}>
                  <span>Criar tag “{digitada}”</span>
                  <span style={{ opacity: 0.7, fontSize: 9.5 }}>nova</span>
                </button>
              )}

              {filtradas.map((tag) => (
                <button key={tag} type="button" onClick={() => adicionar(tag)} style={opcao(false)}>
                  {tag}
                </button>
              ))}

              {!podeCriar && !filtradas.length && (
                <span style={{ padding: '7px 10px', fontSize: 10.5, color: 'var(--c2)', opacity: 0.8 }}>
                  {escolhidas.length ? 'Todas as tags já foram escolhidas.' : 'Nenhuma tag ainda.'}
                </span>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
