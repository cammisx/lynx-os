import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import ChatterForm from '@/components/chatters/ChatterForm';
import ChatterListRow from '@/components/chatters/ChatterListRow';
import { UsersIcon, PlusIcon } from '@/components/icons';
import { emitChattersChanged } from '@/lib/desktopEvents';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

export default function ChattersWindow({ onClose }) {
  const [chatters, setChatters] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    const [chatterResult, userResult] = await Promise.all([
      base44.entities.Chatter.list(),
      base44.entities.User.list(),
    ]);
    setChatters(asList(chatterResult));
    setUsers(asList(userResult));
  };

  useEffect(() => {
    load();
  }, []);

  const afterChange = async () => {
    setForm(null);
    await load();
    emitChattersChanged();
  };

  const removeChatter = async () => {
    if (!pendingDelete) return;
    await base44.entities.Chatter.delete(pendingDelete.id);
    setPendingDelete(null);
    await afterChange();
  };

  const availableUsers = users.filter(
    (user) => !chatters.some((chatter) => chatter.usuario_id === user.id)
  );
  const sortedChatters = [...chatters].sort((a, b) =>
    String(a.nome_exibicao || '').localeCompare(String(b.nome_exibicao || ''), 'pt-BR')
  );

  return (
    <>
      <Window title="Chatters" icon={UsersIcon} onClose={onClose} width={560} height={460}>
        {form ? (
          <ChatterForm
            chatter={form === 'new' ? null : form}
            users={availableUsers}
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
                Novo chatter
              </button>
            </div>

            {sortedChatters.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.6 }}>
                Nenhum chatter cadastrado ainda.
              </span>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sortedChatters.map((chatter) => (
                <ChatterListRow
                  key={chatter.id}
                  chatter={chatter}
                  onEdit={setForm}
                  onDelete={setPendingDelete}
                />
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
                Excluir “{pendingDelete.nome_exibicao || pendingDelete.usuario_email}”?
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
                  onClick={removeChatter}
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