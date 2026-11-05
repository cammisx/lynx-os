import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ImageIcon, TrashIcon } from '@/components/icons';

const LARGURA = 178;

const itemStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 9px',
  border: 'none',
  borderRadius: 7,
  background: 'transparent',
  color: 'var(--c3)',
  fontSize: 11,
  fontFamily: 'var(--font-main)',
  textAlign: 'left',
  cursor: 'pointer',
};

/**
 * Menu do canal, aberto com o botão direito. Hoje só o admin usa, para trocar
 * ou remover a imagem do canal.
 */
export default function CanalMenu({ canal, nome, posicao, salvando, erro, onAlterar, onRemover, onFechar }) {
  const arquivoRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const fechar = () => onFechar();
    const tecla = (event) => {
      if (event.key === 'Escape') onFechar();
    };
    /* Fecha no clique fora e no botão direito em outro lugar. */
    window.addEventListener('mousedown', fechar);
    window.addEventListener('contextmenu', fechar);
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('mousedown', fechar);
      window.removeEventListener('contextmenu', fechar);
      window.removeEventListener('keydown', tecla);
    };
  }, [onFechar]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const { innerWidth, innerHeight } = window;
    const altura = menu.offsetHeight || 0;
    const esquerda = Math.min(posicao.x, innerWidth - LARGURA - 8);
    const topo = Math.min(posicao.y, innerHeight - altura - 8);
    menu.style.left = `${Math.max(8, esquerda)}px`;
    menu.style.top = `${Math.max(8, topo)}px`;
  }, [posicao]);

  const escolherArquivo = () => arquivoRef.current?.click();

  const aoEscolher = (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (arquivo) onAlterar(arquivo);
  };

  return createPortal(
    <div
      ref={menuRef}
      className="canal-menu"
      style={{
        position: 'fixed',
        left: posicao.x,
        top: posicao.y,
        zIndex: 3000,
        width: LARGURA,
        padding: 5,
        borderRadius: 10,
        border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 88%, transparent)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--c2)',
          padding: '4px 9px 6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {nome || 'canal'}
      </div>

      <button
        type="button"
        style={itemStyle}
        disabled={salvando}
        onClick={escolherArquivo}
      >
        <span style={{ color: 'var(--c1)', display: 'flex' }}>
          <ImageIcon size={14} />
        </span>
        {salvando ? 'Enviando imagem…' : 'Alterar imagem'}
      </button>

      {canal?.foto_url && (
        <button
          type="button"
          style={{ ...itemStyle, color: 'var(--c1)' }}
          disabled={salvando}
          onClick={onRemover}
        >
          <span style={{ display: 'flex' }}>
            <TrashIcon size={14} />
          </span>
          Remover imagem
        </button>
      )}

      {erro && (
        <span style={{ fontSize: 10, color: '#ff6b6b', padding: '4px 9px 6px' }}>{erro}</span>
      )}

      <input
        ref={arquivoRef}
        type="file"
        accept="image/*"
        onChange={aoEscolher}
        style={{ display: 'none' }}
      />
    </div>,
    document.body
  );
}
