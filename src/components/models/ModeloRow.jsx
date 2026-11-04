import { useEffect, useRef, useState } from 'react';
import { ArchiveIcon, MoreIcon, PencilIcon, TrashIcon } from '@/components/icons';

const iconStyle = {
  width: 28,
  height: 28,
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 7,
  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  background: 'none',
  color: 'var(--c2)',
  cursor: 'pointer',
};

export default function ModeloRow({ model, onEdit, onArchive, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleDown = (event) => {
      if (wrapRef.current && wrapRef.current.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [menuOpen]);

  return (
    <div
      className="md-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c3)' }}>{model.nome}</span>
        <span style={{ fontSize: 11, color: 'var(--c2)' }}>
          {(model.chatters || []).length} chatters
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          className="md-icon-btn"
          title="Editar"
          aria-label="Editar"
          onClick={() => onEdit(model)}
        >
          <PencilIcon size={15} />
        </button>

        <button
          type="button"
          className="md-icon-btn"
          title="Arquivar modelo"
          aria-label="Arquivar modelo"
          onClick={() => onArchive(model)}
        >
          <ArchiveIcon size={15} />
        </button>

        <div ref={wrapRef} style={{ position: 'relative' }}>
          <button
            type="button"
            title="Mais ações"
            aria-label="Mais ações"
            onClick={() => setMenuOpen((prev) => !prev)}
            style={iconStyle}
          >
            <MoreIcon size={15} />
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 32,
                right: 0,
                minWidth: 148,
                zIndex: 20,
                padding: 4,
                borderRadius: 9,
                border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 82%, transparent)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
              }}
            >
              <button
                type="button"
                className="md-row"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(model);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'none',
                  color: '#ff6b6b',
                  fontSize: 11,
                  fontFamily: 'var(--font-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <TrashIcon size={13} />
                Excluir modelo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}