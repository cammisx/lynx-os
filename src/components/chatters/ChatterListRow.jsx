import { PencilIcon, TrashIcon } from '@/components/icons';

export default function ChatterListRow({ chatter, onEdit, onDelete }) {
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
          {chatter.nome_exibicao || 'Sem nome'}
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
          {chatter.usuario_email || '—'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c1)' }}>
          {`${Number(chatter.comissao ?? 0)}%`}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="md-icon-btn"
            title="Editar"
            aria-label="Editar"
            onClick={() => onEdit(chatter)}
          >
            <PencilIcon size={15} />
          </button>
          <button
            type="button"
            className="md-icon-btn md-icon-danger"
            title="Excluir"
            aria-label="Excluir"
            onClick={() => onDelete(chatter)}
          >
            <TrashIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}