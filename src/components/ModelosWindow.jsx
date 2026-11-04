import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import ModeloForm from '@/components/ModeloForm';
import { UsersIcon, PlusIcon, PencilIcon, TrashIcon } from '@/components/icons';
import { emitModelsChanged } from '@/lib/desktopEvents';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

export default function ModelosWindow({ onClose }) {
  const [models, setModels] = useState([]);
  const [chatters, setChatters] = useState([]);
  const [form, setForm] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    const [modelResult, chatterResult] = await Promise.all([
      base44.entities.Modelo.list(),
      base44.entities.Chatter.list(),
    ]);
    setModels(asList(modelResult));
    setChatters(asList(chatterResult));
  };

  useEffect(() => {
    load();
  }, []);

  const afterChange = async () => {
    setForm(null);
    await load();
    emitModelsChanged();
  };

  const removeModel = async () => {
    if (!pendingDelete) return;
    await base44.entities.Modelo.delete(pendingDelete.id);
    setPendingDelete(null);
    await afterChange();
  };

  return (
    <>
      <Window title="Modelos" icon={UsersIcon} onClose={onClose} width={620} height={470}>
        {form ? (
          <ModeloForm
            chatters={chatters}
            model={form === 'new' ? null : form}
            onCancel={() => setForm(null)}
            onSaved={afterChange}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <button
                type="button"
                className="md-primary"
                onClick={() => setForm('new')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-main)',
                  cursor: 'pointer',
                }}
              >
                <PlusIcon size={13} />
                Nova modelo
              </button>
            </div>

            {models.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.6 }}>
                Nenhuma modelo cadastrada ainda.
              </span>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {models.map((model) => (
                <div
                  key={model.id}
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c3)' }}>
                      {model.nome}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--c2)' }}>
                      {(model.chatters || []).length} chatters
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="md-icon-btn"
                      title="Editar"
                      aria-label="Editar"
                      onClick={() => setForm(model)}
                    >
                      <PencilIcon size={15} />
                    </button>
                    <button
                      type="button"
                      className="md-icon-btn md-icon-danger"
                      title="Excluir"
                      aria-label="Excluir"
                      onClick={() => setPendingDelete(model)}
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Window>

      {pendingDelete &&
        createPortal(
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
                width: 320,
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
                Excluir “{pendingDelete.nome}”?
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="md-btn"
                  onClick={() => setPendingDelete(null)}
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
                  onClick={removeModel}
                  style={{
                    height: 30,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #ff6b6b',
                    background: 'transparent',
                    color: '#ff6b6b',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-main)',
                    cursor: 'pointer',
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}