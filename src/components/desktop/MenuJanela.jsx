import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const LARGURA = 208;
const ALTURA_ITEM = 33;
const MARGEM = 8;

/**
 * Menu do botão direito nos ícones da barra de tarefas.
 * Fecha ao clicar fora, no Esc, ao rolar a página ou ao redimensionar.
 */
export default function MenuJanela({ x = 0, y = 0, opcoes = [], onEscolher, onFechar }) {
  const caixaRef = useRef(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const altura = opcoes.length * ALTURA_ITEM + 12;
    setPos({
      x: Math.min(Math.max(MARGEM, x), Math.max(MARGEM, window.innerWidth - LARGURA - MARGEM)),
      y: Math.min(Math.max(MARGEM, y - altura - 6), Math.max(MARGEM, window.innerHeight - altura - MARGEM)),
    });
  }, [x, y, opcoes.length]);

  useEffect(() => {
    const foraDoMenu = (evento) => {
      if (caixaRef.current && !caixaRef.current.contains(evento.target)) onFechar();
    };
    const tecla = (evento) => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('mousedown', foraDoMenu, true);
    document.addEventListener('keydown', tecla);
    window.addEventListener('resize', onFechar);
    window.addEventListener('blur', onFechar);
    return () => {
      document.removeEventListener('mousedown', foraDoMenu, true);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('resize', onFechar);
      window.removeEventListener('blur', onFechar);
    };
  }, [onFechar]);

  return createPortal(
    <div
      ref={caixaRef}
      role="menu"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: LARGURA,
        zIndex: 9700,
        padding: 6,
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--c1) 28%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 82%, transparent)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
        fontFamily: 'var(--font-main)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        animation: 'clk-menu-in 130ms ease',
      }}
    >
      {opcoes.map((opcao) => (
        <button
          key={opcao.id}
          type="button"
          role="menuitem"
          onClick={() => {
            onEscolher(opcao.id);
            onFechar();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            height: ALTURA_ITEM - 3,
            padding: '0 9px',
            border: 'none',
            borderRadius: 8,
            background: 'transparent',
            color: opcao.perigo ? 'var(--erro)' : 'var(--c3)',
            fontFamily: 'inherit',
            fontSize: 11,
            textAlign: 'left',
            cursor: 'pointer',
          }}
          onMouseEnter={(evento) => {
            evento.currentTarget.style.background = opcao.perigo
              ? 'color-mix(in srgb, var(--erro) 16%, transparent)'
              : 'color-mix(in srgb, var(--c1) 16%, transparent)';
          }}
          onMouseLeave={(evento) => {
            evento.currentTarget.style.background = 'transparent';
          }}
        >
          {opcao.Icone ? <opcao.Icone size={13} /> : null}
          {opcao.rotulo}
        </button>
      ))}
    </div>,
    document.body
  );
}
