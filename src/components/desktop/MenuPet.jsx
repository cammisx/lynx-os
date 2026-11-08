import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MARGEM = 8;
/* O app aplica zoom no <html> quando a escala de fonte não é a Normal: dentro
   de uma raiz com zoom, position fixed precisa da coordenada dividida. */
const zoomDaRaiz = () => {
  if (typeof window === 'undefined') return 1;
  const valor = parseFloat(getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(valor) && valor > 0 ? valor : 1;
};

const LARGURA_SUB = 190;

/**
 * Menu do pet (clique com o botão direito no bicho).
 *
 * É o mesmo vidro do resto do sistema, com submenu para o lado nos itens que
 * têm `filhos`. Cada item é { id, rotulo, marcado, filhos, acao, perigo } ou
 * { separador: true }; filho é { id, rotulo, marcado, cor, acao }.
 */
/* A barra de tarefas ocupa 1.5/24 da altura da tela (ver .taskbar no tema).
   Nenhum menu pode descer por cima dela. */
const alturaDaBarra = () =>
  typeof window === 'undefined' ? 0 : (window.innerHeight * 1.5) / 24;

export default function MenuPet({ x = 0, y = 0, itens = [], cabecalho = '', onFechar }) {
  const caixaRef = useRef(null);
  /* O submenu é uma caixa separada: sem esta referência, o clique nele conta
     como "clique fora" e o menu fechava antes do clique chegar no item. */
  const subRef = useRef(null);
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;
  const [pos, setPos] = useState(null);
  const [sub, setSub] = useState(null);
  const [topoSub, setTopoSub] = useState(0);

  const ajustar = useCallback(() => {
    const caixa = caixaRef.current;
    if (!caixa) return;
    const largura = caixa.offsetWidth;
    const altura = caixa.offsetHeight;
    const zoom = zoomDaRaiz();
    const tela = window.innerWidth / zoom;
    const alturaTela = (window.innerHeight - alturaDaBarra()) / zoom;
    const px = x / zoom;
    const py = y / zoom;

    let esquerda = px;
    let topo = py;
    if (esquerda + largura > tela - MARGEM) esquerda = tela - largura - MARGEM;
    if (topo + altura > alturaTela - MARGEM) topo = alturaTela - altura - MARGEM;
    setPos({
      esquerda: Math.max(MARGEM, esquerda),
      topo: Math.max(MARGEM, topo),
    });
  }, [x, y]);

  useLayoutEffect(() => {
    ajustar();
  }, [ajustar, itens, cabecalho]);

  useEffect(() => {
    const caixa = caixaRef.current;
    if (!caixa || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(() => ajustar());
    observador.observe(caixa);
    return () => observador.disconnect();
  }, [ajustar]);

  useEffect(() => {
    const fora = (evento) => {
      const dentro =
        (caixaRef.current && caixaRef.current.contains(evento.target)) ||
        (subRef.current && subRef.current.contains(evento.target));
      if (!dentro) fecharRef.current();
    };
    const tecla = (evento) => {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      if (sub) setSub(null);
      else fecharRef.current();
    };
    const fechar = () => fecharRef.current();
    document.addEventListener('mousedown', fora, true);
    document.addEventListener('keydown', tecla, true);
    window.addEventListener('resize', fechar);
    window.addEventListener('blur', fechar);
    return () => {
      document.removeEventListener('mousedown', fora, true);
      document.removeEventListener('keydown', tecla, true);
      window.removeEventListener('resize', fechar);
      window.removeEventListener('blur', fechar);
    };
  }, [sub]);

  /* O submenu só descobre a altura depois de aparecer: aqui ele se mede e
     sobe o suficiente para nunca ficar atrás da barra de tarefas. */
  useLayoutEffect(() => {
    const caixa = subRef.current;
    if (!sub || !caixa) return;
    const zoom = zoomDaRaiz();
    const altura = caixa.offsetHeight;
    const limite = (window.innerHeight - alturaDaBarra()) / zoom - MARGEM;
    const topo = Math.max(MARGEM, Math.min(topoSub, limite - altura));
    if (Math.abs(topo - topoSub) > 0.5) setTopoSub(topo);
  }, [sub, topoSub]);

  /* Abre o submenu encostado no item, virando para a esquerda quando não cabe. */
  const abrirSub = (item, evento) => {
    const alvo = evento.currentTarget;
    const area = alvo.getBoundingClientRect();
    const zoom = zoomDaRaiz();
    const tela = window.innerWidth / zoom;
    const cabeDireita = area.right / zoom + LARGURA_SUB + 6 <= tela - MARGEM;
    setSub({
      indice: itens.indexOf(item),
      esquerda: cabeDireita ? area.right / zoom + 6 : area.left / zoom - LARGURA_SUB - 6,
    });
    /* O submenu nasce na mesma altura do item que o abriu. */
    setTopoSub(area.top / zoom);
  };

  const pintar = (cor) => (
    <span
      aria-hidden="true"
      style={{
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: cor,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)',
        flex: '0 0 auto',
      }}
    />
  );

  const linha = (item, indice, ehSub) => (
    <button
      key={item.id || `${item.rotulo}-${indice}`}
      type="button"
      role="menuitem"
      onClick={() => {
        if (item.acao) item.acao();
        if (!ehSub) fecharRef.current();
      }}
      onMouseEnter={(evento) => {
        if (!ehSub) {
          evento.currentTarget.style.background = 'color-mix(in srgb, var(--c1) 16%, transparent)';
        }
        if (item.filhos?.length) abrirSub(item, evento);
        else if (!ehSub) setSub(null);
      }}
      onMouseLeave={(evento) => {
        if (!ehSub) evento.currentTarget.style.background = 'transparent';
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        minHeight: 29,
        padding: '0 9px',
        border: 'none',
        borderRadius: 8,
        background:
          ehSub && item.marcado ? 'color-mix(in srgb, var(--c1) 12%, transparent)' : 'transparent',
        color: item.perigo ? 'var(--erro)' : 'var(--c3)',
        fontFamily: 'inherit',
        fontSize: 11,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      {item.cor ? pintar(item.cor) : null}
      <span style={{ flex: '1 1 auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.rotulo}
      </span>
      {item.marcado ? (
        <span aria-hidden="true" style={{ color: 'var(--c1)', fontSize: 10 }}>
          ✓
        </span>
      ) : null}
      {item.filhos?.length ? (
        <span aria-hidden="true" style={{ color: 'var(--c2)', fontSize: 10 }}>
          ▸
        </span>
      ) : null}
    </button>
  );

  const filhos = sub ? itens[sub.indice]?.filhos || [] : [];

  return createPortal(
    <div data-menu-own="true" onContextMenu={(evento) => evento.preventDefault()}>
      <div
        ref={caixaRef}
        role="menu"
        onMouseDown={(evento) => evento.stopPropagation()}
        style={{
          position: 'fixed',
          left: pos ? pos.esquerda : -9999,
          top: pos ? pos.topo : -9999,
          minWidth: 188,
          padding: 6,
          zIndex: 9800,
          borderRadius: 12,
          border: '1px solid color-mix(in srgb, var(--c1) 28%, transparent)',
          background: 'color-mix(in srgb, var(--c8) 88%, transparent)',
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
        {cabecalho ? (
          <span
            style={{
              padding: '4px 9px 6px',
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'color-mix(in srgb, var(--c2) 85%, transparent)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {cabecalho}
          </span>
        ) : null}
        {itens.map((item, indice) =>
          item.separador ? (
            <span
              key={`sep-${indice}`}
              aria-hidden="true"
              style={{
                height: 1,
                margin: '4px 6px',
                background: 'color-mix(in srgb, var(--c2) 25%, transparent)',
              }}
            />
          ) : (
            linha(item, indice, false)
          )
        )}
      </div>

      {sub && filhos.length ? (
        <div
          ref={subRef}
          role="menu"
          onMouseDown={(evento) => evento.stopPropagation()}
          style={{
            position: 'fixed',
            left: sub.esquerda,
            top: topoSub,
            minWidth: LARGURA_SUB,
            padding: 6,
            zIndex: 9801,
            borderRadius: 12,
            border: '1px solid color-mix(in srgb, var(--c1) 28%, transparent)',
            background: 'color-mix(in srgb, var(--c8) 90%, transparent)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
            fontFamily: 'var(--font-main)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            animation: 'clk-menu-in 110ms ease',
          }}
        >
          {filhos.map((filho, indice) => linha(filho, indice, true))}
        </div>
      ) : null}
    </div>,
    document.body
  );
}
