import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import ModeloForm from '@/components/ModeloForm';
import ModeloRow from '@/components/models/ModeloRow';
import ArchivedSection from '@/components/models/ArchivedSection';
import ArchiveDialog from '@/components/models/ArchiveDialog';
import { UsersIcon, PlusIcon } from '@/components/icons';
import { emitModelsChanged } from '@/lib/desktopEvents';
import { buildChatterNames } from '@/lib/chatterNames';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

export default function ModelosWindow({ onClose }) {
  const [models, setModels] = useState([]);
  const [chatters, setChatters] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    const [modelResult, chatterResult, userResult] = await Promise.all([
      base44.entities.Modelo.list(),
      base44.entities.Chatter.list(),
      base44.entities.User.list(),
    ]);
    setModels(asList(modelResult));
    setChatters(asList(chatterResult));
    setUsers(asList(userResult));
  };

  useEffect(() => {
    load();
  }, []);

  const afterChange = async () => {
    setForm(null);
    await load();
    emitModelsChanged();
  };

  const archiveModel = async () => {
    if (!pendingArchive) return;
    await base44.entities.Modelo.update(pendingArchive.id, {
      arquivada: true,
      arquivada_em: new Date().toISOString(),
    });
    setPendingArchive(null);
    await afterChange();
  };

  const restoreModel = async (model) => {
    await base44.entities.Modelo.update(model.id, { arquivada: false, arquivada_em: null });
    await afterChange();
  };

  const openDelete = async (model) => {
    const result = await base44.entities.Shift.filter({ modelo_id: model.id }, { limit: 500 });
    setPendingDelete({ model, count: asList(result).length });
  };

  const removeModel = async () => {
    if (!pendingDelete) return;
    await base44.entities.Shift.deleteMany({ modelo_id: pendingDelete.model.id });
    await base44.entities.Modelo.delete(pendingDelete.model.id);
    setPendingDelete(null);
    await afterChange();
  };

  const chatterOptions = useMemo(() => {
    const names = buildChatterNames(chatters);
    return users.map((user) => ({
      usuario_id: user.id,
      nome: names[user.id] || user.full_name || user.email || '',
    }));
  }, [users, chatters]);

  const activeModels = models.filter((model) => !model.arquivada);
  const archivedModels = models.filter((model) => model.arquivada);

  return (
    <>
      <Window title="Modelos" icon={UsersIcon} onClose={onClose} width={620} height={470}>
        {form ? (
          <ModeloForm
            chatters={chatterOptions}
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

            {activeModels.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.6 }}>
                Nenhuma modelo cadastrada ainda.
              </span>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeModels.map((model) => (
                <ModeloRow
                  key={model.id}
                  model={model}
                  onEdit={setForm}
                  onArchive={setPendingArchive}
                  onDelete={openDelete}
                />
              ))}
            </div>

            <ArchivedSection models={archivedModels} onRestore={restoreModel} />
          </div>
        )}
      </Window>

      {pendingArchive &&
        createPortal(
          <ArchiveDialog
            model={pendingArchive}
            onCancel={() => setPendingArchive(null)}
            onConfirm={archiveModel}
          />,
          document.body
        )}

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
                Excluir “{pendingDelete.model.nome}”?
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--c2)', lineHeight: 1.5 }}>
                {pendingDelete.count > 0
                  ? `${pendingDelete.count} ${pendingDelete.count === 1 ? 'turno será apagado' : 'turnos serão apagados'} junto com ela.`
                  : 'Esta modelo não tem turnos salvos.'}
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