import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, MaximizeIcon, MinimizeIcon, RestoreIcon } from '@/components/icons';
import { useJanela } from '@/components/desktop/JanelaContext';
import { BackIcon } from '@/components/chat/chatIcons';
import { useIsMobile } from '@/hooks/use-mobile';

const MIN_W = 420;
const MIN_H = 260;
const MARGEM = 8;

/* Com o tamanho de fonte fora do Normal o html recebe zoom: o innerWidth
   continua sendo a tela física, então a área útil precisa ser dividida por
   ele para as janelas não saírem da tela. */
const zoomAtual = () => {
  const valor = parseFloat(getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(valor) && valor > 0 ? valor : 1;
};

const areaUtil = () => {
  const zoom = zoomAtual();
  return { w: window.innerWidth / zoom, h: window.innerHeight / zoom };
};

/* A barra de tarefas ocupa 1,5/24 da altura da tela. Maximizada, a janela
   para em cima dela, como no Windows. */
const alturaBarra = () => (window.innerHeight * 1.5) / 24 / zoomAtual();

const BORDAS = [
  { dir: 'n', style: { top: 0, left: 10, right: 10, height: 5 }, cursor: 'ns-resize' },
  { dir: 's', style: { bottom: 0, left: 10, right: 10, height: 5 }, cursor: 'ns-resize' },
  { dir: 'w', style: { left: 0, top: 10, bottom: 10, width: 5 }, cursor: 'ew-resize' },
  { dir: 'e', style: { right: 0, top: 10, bottom: 10, width: 5 }, cursor: 'ew-resize' },
  { dir: 'nw', style: { top: 0, left: 0, width: 12, height: 12 }, cursor: 'nwse-resize' },
  { dir: 'ne', style: { top: 0, right: 0, width: 12, height: 12 }, cursor: 'nesw-resize' },
  { dir: 'sw', style: { bottom: 0, left: 0, width: 12, height: 12 }, cursor: 'nesw-resize' },
  { dir: 'se', style: { bottom: 0, right: 0, width: 12, height: 12 }, cursor: 'nwse-resize' },
];

const botaoDaBarra = () => ({
  width: 24,
  height: 24,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: 'var(--c2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
  flexShrink: 0,
});

export default function Window({ title, icon: Icon, onClose, children, width = 620, height = 460 }) {
  const janela = useJanela();
  const telaPequena = useIsMobile();
  const [maximizado, setMaximizado] = useState(false);
  const [, setReagir] = useState(0);
  const [size, setSize] = useState(() => {
    const area = areaUtil();
    return {
      w: Math.min(width, Math.max(MIN_W, area.w - MARGEM * 2)),
      h: Math.min(height, Math.max(MIN_H, area.h - MARGEM * 2)),
    };
  });
  const [pos, setPos] = useState(() => {
    const area = areaUtil();
    const largura = Math.min(width, Math.max(MIN_W, area.w - MARGEM * 2));
    const altura = Math.min(height, Math.max(MIN_H, area.h - MARGEM * 2));
    return {
      x: Math.max(MARGEM, Math.round((area.w - largura) / 2)),
      y: Math.max(MARGEM, Math.round((area.h - altura) / 2)),
    };
  });
  const offsetRef = useRef(null);
  const [redimensionando, setRedimensionando] = useState(false);
  const sizeRef = useRef(size);
  const posRef = useRef(pos);
  const maximizadoRef = useRef(maximizado);
  sizeRef.current = size;
  posRef.current = pos;
  maximizadoRef.current = maximizado;

  /* Tela mudou (ou o tamanho da fonte mudou): a janela volta para dentro. */
  useEffect(() => {
    const ajustar = () => {
      if (maximizadoRef.current) {
        setReagir((n) => n + 1);
        return;
      }
      const area = areaUtil();
      const tamanho = {
        w: Math.min(sizeRef.current.w, Math.max(MIN_W, area.w - MARGEM * 2)),
        h: Math.min(sizeRef.current.h, Math.max(MIN_H, area.h - MARGEM * 2)),
      };
      setSize(tamanho);
      setPos({
        x: Math.min(Math.max(MARGEM, posRef.current.x), Math.max(MARGEM, area.w - tamanho.w - MARGEM)),
        y: Math.min(Math.max(0, posRef.current.y), Math.max(0, area.h - tamanho.h - MARGEM)),
      });
    };
    window.addEventListener('resize', ajustar);
    window.addEventListener('lynx:fonte', ajustar);
    return () => {
      window.removeEventListener('resize', ajustar);
      window.removeEventListener('lynx:fonte', ajustar);
    };
  }, []);

  const startDrag = (event) => {
    if (maximizado) return;
    event.preventDefault();
    offsetRef.current = {
      dx: event.clientX - pos.x * zoomAtual(),
      dy: event.clientY - pos.y * zoomAtual(),
    };

    const handleMove = (moveEvent) => {
      const offset = offsetRef.current;
      if (!offset) return;
      const zoom = zoomAtual();
      const area = areaUtil();
      const x = (moveEvent.clientX - offset.dx) / zoom;
      const y = (moveEvent.clientY - offset.dy) / zoom;
      setPos({
        x: Math.min(Math.max(-size.w + 120, x), area.w - 120),
        y: Math.min(Math.max(0, y), area.h - 60),
      });
    };

    const handleUp = () => {
      offsetRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  /* Arrastar borda e canto: cresce para o lado que está sendo puxado. Nas
     bordas de cima e da esquerda a posição anda junto, para a janela não
     "fugir" debaixo do mouse. */
  const startResize = (event, dir) => {
    if (maximizado) return;
    event.preventDefault();
    event.stopPropagation();
    setRedimensionando(true);

    const inicio = { px: pos.x, py: pos.y, w: size.w, h: size.h, mx: event.clientX, my: event.clientY };

    const handleMove = (moveEvent) => {
      const zoom = zoomAtual();
      const area = areaUtil();
      const dx = (moveEvent.clientX - inicio.mx) / zoom;
      const dy = (moveEvent.clientY - inicio.my) / zoom;

      let x = inicio.px;
      let y = inicio.py;
      let w = inicio.w;
      let h = inicio.h;

      if (dir.includes('e')) {
        w = Math.min(Math.max(MIN_W, inicio.w + dx), Math.max(MIN_W, area.w - inicio.px - MARGEM));
      }
      if (dir.includes('s')) {
        h = Math.min(Math.max(MIN_H, inicio.h + dy), Math.max(MIN_H, area.h - inicio.py - MARGEM));
      }
      if (dir.includes('w')) {
        w = Math.max(MIN_W, inicio.w - dx);
        x = inicio.px + (inicio.w - w);
        if (x < MARGEM) {
          w = Math.max(MIN_W, w + (x - MARGEM));
          x = MARGEM;
        }
      }
      if (dir.includes('n')) {
        h = Math.max(MIN_H, inicio.h - dy);
        y = inicio.py + (inicio.h - h);
        if (y < MARGEM) {
          h = Math.max(MIN_H, h + (y - MARGEM));
          y = MARGEM;
        }
      }

      setPos({ x, y });
      setSize({ w: Math.round(w), h: Math.round(h) });
    };

    const handleUp = () => {
      setRedimensionando(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  /* No celular a janela é a tela inteira: sem arrastar, sem redimensionar e
     sem barra de tarefas. O cabeçalho é o de app de celular: voltar à
     esquerda, título no meio e fechar à direita. */
  if (telaPequena) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: 'calc(46px + env(safe-area-inset-top))',
          bottom: 0,
          paddingBottom: 'calc(58px + env(safe-area-inset-bottom))',
          zIndex: janela.zIndex || 8000,
          display: janela.oculta ? 'none' : 'flex',
          flexDirection: 'column',
          background: 'color-mix(in srgb, var(--c8) 74%, transparent)',
          backdropFilter: 'blur(22px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
          fontFamily: 'var(--font-main)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 50,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 6px 0 2px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
          }}
        >
          <button
            type="button"
            aria-label="Voltar"
            onClick={janela.onMinimize || onClose}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--c3)',
              borderRadius: 12,
              padding: 0,
            }}
          >
            <BackIcon size={19} />
          </button>
          <span
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minWidth: 0,
              color: 'var(--c1)',
            }}
          >
            {Icon ? <Icon size={15} /> : null}
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13.5,
                letterSpacing: '0.04em',
                color: 'var(--c3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </span>
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              borderRadius: 12,
              padding: 0,
            }}
          >
            <CloseIcon size={15} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 14 }}>{children}</div>
      </div>,
      document.body
    );
  }

  const area = areaUtil();
  const medidas = maximizado
    ? {
        left: MARGEM,
        top: MARGEM,
        width: Math.max(MIN_W, area.w - MARGEM * 2),
        height: Math.max(MIN_H, area.h - alturaBarra() - MARGEM),
      }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h };

  return createPortal(
    <div
      data-janela="true"
      data-pixie-alvo={janela.id ? `janela-${janela.id}` : undefined}
      onMouseDown={() => janela.onFocus && janela.onFocus()}
      style={{
        position: 'fixed',
        left: medidas.left,
        top: medidas.top,
        width: medidas.width,
        height: medidas.height,
        zIndex: janela.zIndex || 8000,
        display: janela.oculta ? 'none' : 'flex',
        background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid color-mix(in srgb, var(--c1) 22%, transparent)',
        borderRadius: 14,
        boxShadow: redimensionando
          ? '0 22px 70px rgba(0,0,0,0.6)'
          : '0 16px 56px rgba(0,0,0,0.5)',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-main)',
        transition: 'box-shadow 140ms ease',
      }}
    >
      <div
        onMouseDown={startDrag}
        style={{
          height: 38,
          flexShrink: 0,
          padding: '0 10px 0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
          cursor: maximizado ? 'default' : 'grab',
          userSelect: 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, color: 'var(--c1)' }}>
          {Icon && <Icon size={14} />}
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--c3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {janela.onMinimize ? (
            <button
              type="button"
              aria-label="Minimizar"
              title="Minimizar"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={janela.onMinimize}
              style={botaoDaBarra()}
            >
              <MinimizeIcon size={12} />
            </button>
          ) : null}

          <button
            type="button"
            aria-label={maximizado ? 'Restaurar tamanho' : 'Maximizar'}
            title={maximizado ? 'Restaurar tamanho' : 'Maximizar'}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => setMaximizado((antes) => !antes)}
            style={botaoDaBarra()}
          >
            {maximizado ? <RestoreIcon size={12} /> : <MaximizeIcon size={12} />}
          </button>

          <button
            type="button"
            aria-label="Fechar"
            title="Fechar"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClose}
            className="clk-nav-btn"
            style={botaoDaBarra()}
          >
            <CloseIcon size={12} />
          </button>
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>{children}</div>

      {BORDAS.map((borda) => (
        <div
          key={borda.dir}
          onMouseDown={(event) => startResize(event, borda.dir)}
          aria-hidden="true"
          style={{
            position: 'absolute',
            zIndex: 2,
            cursor: borda.cursor,
            ...borda.style,
          }}
        />
      ))}
    </div>,
    document.body
  );
}
