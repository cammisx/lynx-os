import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MARGEM = 8;

/**
 * Menu que flutua junto do cursor ou acima de um ícone.
 *
 * Com `ancora` (o elemento clicado) ele se centraliza no ícone e abre para
 * cima; sem âncora fica no ponteiro. Em qualquer caso se ajusta para não
 * sair da tela.
 *
 * Cada item é { id, rotulo, atalho, perigo, desabilitado, acao } ou
 * { separador: true }.
 */
export default function MenuFlutuante({ x = 0, y = 0, ancora = null, itens = [], onFechar }) {
  const caixaRef = useRef(null);
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;
  const [pos, setPos] = useState(null);

  /* Mede o menu de verdade antes de posicionar: estimar pela quantidade de
     itens erra quando tem separador ou texto que quebra linha. */
  useLayoutEffect(() => {
    const caixa = caixaRef.current;
    if (!caixa) return;
    const { width, height } = caixa.getBoundingClientRect();
    const tela = window.innerWidth;
    const alturaTela = window.innerHeight;
    const alvo = ancora?.current || ancora;
    const area = alvo?.getBoundingClientRect ? alvo.getBoundingClientRect() : null;

    let esquerda;
    let topo;
    if (area) {
      esquerda = area.left + area.width / 2 - width / 2;
      topo = area.top - height - 8;
      if (topo < MARGEM) topo = area.bottom + 8;
    } else {
      esquerda = x - width / 2;
      topo = y + 4;
      if (topo + height > alturaTela - MARGEM) topo = y - height - 4;
    }
    esquerda = Math.min(Math.max(MARGEM, esquerda), Math.max(MARGEM, tela - width - MARGEM));
    topo = Math.min(Math.max(MARGEM, topo), Math.max(MARGEM, alturaTela - height - MARGEM));
    setPos({ esquerda, topo });
  }, [x, y, ancora, itens]);

  useEffect(() => {
    const foraDoMenu = (evento) => {
      if (caixaRef.current && !caixaRef.current.contains(evento.target)) fecharRef.current();
    };
    const tecla = (evento) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        fecharRef.current();
      }
    };
    const fechar = () => fecharRef.current();
    document.addEventListener('mousedown', foraDoMenu, true);
    document.addEventListener('keydown', tecla, true);
    window.addEventListener('resize', fechar);
    window.addEventListener('blur', fechar);
    return () => {
      document.removeEventListener('mousedown', foraDoMenu, true);
      document.removeEventListener('keydown', tecla, true);
      window.removeEventListener('resize', fechar);
      window.removeEventListener('blur', fechar);
    };
  }, []);

  return createPortal(
    <div
      ref={caixaRef}
      role="menu"
      data-menu-own="true"
      onMouseDown={(evento) => {
        /* Não rouba o foco do campo: sem isso o Copiar/Colar perde o alvo. */
        evento.preventDefault();
        evento.stopPropagation();
      }}
      style={{
        position: 'fixed',
        left: pos ? pos.esquerda : -9999,
        top: pos ? pos.topo : -9999,
        minWidth: 196,
        maxWidth: 300,
        zIndex: 9700,
        padding: 6,
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--c1) 28%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 86%, transparent)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
        fontFamily: 'var(--font-main)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        visibility: pos ? 'visible' : 'hidden',
        animation: 'clk-menu-in 130ms ease',
      }}
    >
      {itens.map((item, indice) => {
        if (item.separador) {
          return (
            <span
              key={`sep-${indice}`}
              aria-hidden="true"
              style={{
                height: 1,
                margin: '4px 6px',
                background: 'color-mix(in srgb, var(--c2) 25%, transparent)',
              }}
            />
          );
        }
        return (
          <button
            key={item.id || `${item.rotulo}-${indice}`}
            type="button"
            role="menuitem"
            disabled={item.desabilitado}
            onClick={() => {
              if (item.desabilitado) return;
              if (item.acao) item.acao();
              fecharRef.current();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              width: '100%',
              minHeight: 29,
              padding: '0 9px',
              border: 'none',
              borderRadius: 8,
              background: 'transparent',
              color: item.desabilitado
                ? 'color-mix(in srgb, var(--c2) 55%, transparent)'
                : item.perigo
                  ? 'var(--erro)'
                  : 'var(--c3)',
              fontFamily: 'inherit',
              fontSize: 11,
              textAlign: 'left',
              cursor: item.desabilitado ? 'default' : 'pointer',
            }}
            onMouseEnter={(evento) => {
              if (item.desabilitado) return;
              evento.currentTarget.style.background = item.perigo
                ? 'color-mix(in srgb, var(--erro) 16%, transparent)'
                : 'color-mix(in srgb, var(--c1) 16%, transparent)';
            }}
            onMouseLeave={(evento) => {
              evento.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.rotulo}
            </span>
            {item.atalho ? (
              <span
                style={{
                  fontSize: 9.5,
                  letterSpacing: '0.04em',
                  color: 'color-mix(in srgb, var(--c2) 75%, transparent)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.atalho}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
