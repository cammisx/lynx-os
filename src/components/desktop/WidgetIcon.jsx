import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import TurnoIcon from '@/components/icons/TurnoIcon';
import {
  LABEL_OFFSET,
  WIDGET_ICON,
  WIDGET_LABEL,
  WIDGET_TILE,
  WIDGET_TILE_H,
} from './widgetLayout';

const TILE = WIDGET_TILE;
const TILE_H = WIDGET_TILE_H;

/* Folga mínima entre o desenho do ícone e a borda da tela. */
const BORDA = 2;

/* O app aplica zoom no <html> quando a escala de fonte não é a Normal:
   dentro de uma raiz com zoom, o px do estilo não é o px do mouse. */
const zoomDaRaiz = () => {
  if (typeof window === 'undefined') return 1;
  const valor = parseFloat(getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(valor) && valor > 0 ? valor : 1;
};

/* A barra de tarefas ocupa 1.5/24 da altura da tela (ver .taskbar no tema). */
const alturaDaBarra = () =>
  typeof window === 'undefined' ? 0 : (window.innerHeight * 1.5) / 24;

/* Chute inicial da folga em volta do desenho, corrigido pela medição real. */
const CAIXA_ESTIMADA = {
  esq: (TILE - WIDGET_ICON) / 2,
  dir: (TILE - WIDGET_ICON) / 2,
  topo: (TILE_H - WIDGET_ICON) / 2,
  base: (TILE_H - WIDGET_ICON) / 2,
};

/*
 * O quadrado do ícone tem área transparente em volta: 20px de cada lado e um
 * vazio em cima e embaixo. Limitar a posição pelo quadrado fazia o desenho
 * parar longe da borda. Então medimos o conteúdo de verdade (ícone + legenda)
 * e deixamos ELE encostar nos cantos, não a caixa invisível.
 */
const clamp = (x, y, caixa = { esq: 0, dir: 0, topo: 0, base: 0 }) => {
  const zoom = zoomDaRaiz();
  const largura = window.innerWidth / zoom;
  const altura = window.innerHeight / zoom;
  const minX = -caixa.esq + BORDA;
  const maxX = largura - TILE + caixa.dir - BORDA;
  const minY = -caixa.topo + BORDA;
  const maxY = altura - alturaDaBarra() / zoom - (TILE_H - caixa.base) - BORDA;
  return {
    x: Math.min(Math.max(minX, x), Math.max(minX, maxX)),
    y: Math.min(Math.max(minY, y), Math.max(minY, maxY)),
  };
};

/**
 * Ícone do widget no desktop. Arrasta pra reposicionar e abre com duplo clique.
 * Clique simples só seleciona, pra ninguém abrir sem querer no meio de um arrasto.
 */
export default function WidgetIcon({ label, Icon = TurnoIcon, position, onOpen, onCommit, pulsando = false }) {
  const [pos, setPos] = useState(() =>
    clamp(position.icone_x, position.icone_y, CAIXA_ESTIMADA)
  );
  const [arrastando, setArrastando] = useState(false);
  const [selecionado, setSelecionado] = useState(false);
  const containerRef = useRef(null);
  const conteudoRef = useRef(null);
  /* Quanto o desenho está afastado de cada lado do quadrado. */
  const [caixa, setCaixa] = useState(CAIXA_ESTIMADA);
  const caixaRef2 = useRef(caixa);
  caixaRef2.current = caixa;

  const medir = useCallback(() => {
    const tile = containerRef.current;
    const conteudo = conteudoRef.current;
    if (!tile || !conteudo) return;
    const zoom = zoomDaRaiz();
    const a = tile.getBoundingClientRect();
    const b = conteudo.getBoundingClientRect();
    const proxima = {
      esq: Math.max(0, (b.left - a.left) / zoom),
      topo: Math.max(0, (b.top - a.top) / zoom),
      dir: Math.max(0, (a.right - b.right) / zoom),
      base: Math.max(0, (a.bottom - b.bottom) / zoom),
    };
    setCaixa((antes) =>
      Math.abs(antes.esq - proxima.esq) < 0.5 &&
      Math.abs(antes.topo - proxima.topo) < 0.5 &&
      Math.abs(antes.dir - proxima.dir) < 0.5 &&
      Math.abs(antes.base - proxima.base) < 0.5
        ? antes
        : proxima
    );
  }, []);
  const drag = useRef(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    if (!selecionado) return undefined;
    const handleDown = (event) => {
      if (containerRef.current?.contains(event.target)) return;
      setSelecionado(false);
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [selecionado]);

  useEffect(() => {
    if (drag.current) return;
    setPos(clamp(position.icone_x, position.icone_y, caixa));
  }, [position.icone_x, position.icone_y, caixa]);

  useLayoutEffect(() => {
    medir();
  }, [medir, label]);

  useEffect(() => {
    const aoMudarTamanho = () => medir();
    window.addEventListener('resize', aoMudarTamanho);
    return () => window.removeEventListener('resize', aoMudarTamanho);
  }, [medir]);

  const startDrag = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const zoom = zoomDaRaiz();
    drag.current = {
      dx: event.clientX / zoom - pos.x,
      dy: event.clientY / zoom - pos.y,
      moveu: false,
    };
    setArrastando(true);

    const handleMove = (moveEvent) => {
      const data = drag.current;
      if (!data) return;
      const z = zoomDaRaiz();
      const next = clamp(
        moveEvent.clientX / z - data.dx,
        moveEvent.clientY / z - data.dy,
        caixaRef2.current
      );
      if (next.x !== pos.x || next.y !== pos.y) data.moveu = true;
      setPos(next);
    };

    const handleUp = () => {
      const data = drag.current;
      drag.current = null;
      setArrastando(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      if (data?.moveu) {
        onCommit({ icone_x: posRef.current.x, icone_y: posRef.current.y });
      }
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={label}
      onMouseDown={startDrag}
      onClick={() => setSelecionado(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') setSelecionado(true);
      }}
      onDoubleClick={() => {
        if (drag.current?.moveu) return;
        onOpen();
      }}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: TILE,
        height: TILE_H,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        borderRadius: 14,
        background: selecionado ? 'color-mix(in srgb, var(--c1) 20%, transparent)' : 'transparent',
        transition: 'background-color 0.14s ease',
        cursor: arrastando ? 'grabbing' : 'default',
        userSelect: 'none',
        zIndex: 1,
      }}
    >
      <div
        ref={conteudoRef}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
      <div style={{ position: 'relative', display: 'flex' }}>
        <Icon size={WIDGET_ICON} />
        {pulsando && (
          <span
            style={{
              position: 'absolute',
              right: -2,
              top: -2,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'var(--c1)',
              boxShadow: '0 0 10px var(--c1)',
              animation: 'widget-pulse 2s ease-in-out infinite',
            }}
          />
        )}
      </div>
      <span
        style={{
          fontSize: WIDGET_LABEL,
          marginTop: LABEL_OFFSET,
          color: 'var(--c3)',
          textShadow: '0 1px 3px rgba(0,0,0,0.85)',
          maxWidth: TILE,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-main)',
        }}
      >
        {label}
      </span>
      </div>
    </div>
  );
}
