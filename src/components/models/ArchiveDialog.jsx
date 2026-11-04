export default function ArchiveDialog({ model, onCancel, onConfirm }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          width: 340,
          background: 'color-mix(in srgb, var(--c8) 72%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
          borderRadius: 12,
          boxShadow: '0 16px 56px rgba(0,0,0,0.5)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          fontFamily: 'var(--font-main)',
        }}
      >
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--c3)' }}>
          Arquivar a modelo {model.nome}?
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--c2)', lineHeight: 1.5 }}>
          Ela sai das abas do calendário e do cadastro de turnos. Os turnos e o histórico continuam
          salvos, e você pode desarquivar quando quiser.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            className="md-btn"
            onClick={onCancel}
            style={{
              height: 30,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
              color: 'var(--c2)',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="md-primary"
            onClick={onConfirm}
            style={{
              height: 30,
              padding: '0 14px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
            }}
          >
            Arquivar
          </button>
        </div>
      </div>
    </div>
  );
}