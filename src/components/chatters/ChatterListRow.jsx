import { PencilIcon, TrashIcon } from '@/components/icons';

const formatCommission = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return `${Number.isInteger(num) ? num : num.toFixed(1)}%`;
};

export default function ChatterListRow({ chatter, displayName, user, onEdit, onRemove }) {
  const commission = chatter ? formatCommission(chatter.comissao) : null;

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--c3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--c2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {user?.email || chatter?.usuario_email || '—'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {commission ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c1)' }}>{commission}</span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.6 }}>sem comissão</span>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="md-icon-btn"
            title="Editar"
            aria-label="Editar"
            onClick={onEdit}
          >
            <PencilIcon size={15} />
          </button>

          {chatter && (
            <button
              type="button"
              className="md-icon-btn md-icon-danger"
              title="Remover comissão"
              aria-label="Remover comissão"
              onClick={onRemove}
            >
              <TrashIcon size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}