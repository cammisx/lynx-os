import { useState } from 'react';

const formatArchivedAt = (value) => {
  if (!value) return 'data desconhecida';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'data desconhecida';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function ArchivedSection({ models, onRestore }) {
  const [open, setOpen] = useState(false);

  if (models.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 0',
          border: 'none',
          background: 'none',
          color: 'var(--c2)',
          fontSize: 11,
          fontFamily: 'var(--font-main)',
          cursor: 'pointer',
        }}
      >
        <span>{open ? '▾' : '▸'}</span>
        Modelos arquivadas ({models.length})
      </button>

      {open &&
        models.map((model) => (
          <div
            key={model.id}
            className="md-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
              opacity: 0.6,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c3)' }}>{model.nome}</span>
              <span style={{ fontSize: 11, color: 'var(--c2)' }}>
                Arquivada em {formatArchivedAt(model.arquivada_em)}
              </span>
            </div>

            <button
              type="button"
              className="md-restore"
              onClick={() => onRestore(model)}
              style={{
                flexShrink: 0,
                padding: '4px 8px',
                borderRadius: 7,
                border: 'none',
                background: 'none',
                color: 'var(--c1)',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--font-main)',
                cursor: 'pointer',
              }}
            >
              Restaurar
            </button>
          </div>
        ))}
    </div>
  );
}