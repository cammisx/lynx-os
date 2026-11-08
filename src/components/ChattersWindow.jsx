import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import ChatterForm from '@/components/chatters/ChatterForm';
import ChatterListRow from '@/components/chatters/ChatterListRow';
import { UsersIcon } from '@/components/icons';
import { emitChattersChanged } from '@/lib/desktopEvents';
import { useMarcarSujo } from '@/components/desktop/JanelaContext';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

export default function ChattersWindow({ onClose }) {
  const [chatters, setChatters] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  useMarcarSujo(Boolean(form));
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
    if (!pendingDelete?.chatter) return;
    await base44.entities.Chatter.delete(pendingDelete.chatter.id);
    setPendingDelete(null);
    await afterChange();
  };

  const rows = useMemo(() => {
    const byUser = {};
    chatters.forEach((chatter) => {
      if (chatter.usuario_id) byUser[chatter.usuario_id] = chatter;
    });

    return users
      .map((user) => {
        const chatter = byUser[user.id] || null;
        return {
          user,
          chatter,
          displayName:
            user.nome_exibicao || chatter?.nome_exibicao || user.full_name || user.email || 'Sem nome',
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
  }, [users, chatters]);

  const withCommission = rows.filter(
    (row) => row.chatter && row.chatter.comissao !== null && row.chatter.comissao !== undefined
  ).length;

  return (
    <>
      <Window title="Chatters" icon={UsersIcon} onClose={onClose} width={560} height={460}>
        {form ? (
          <ChatterForm
            user={form.user}
            chatter={form.chatter}
            onCancel={() => setForm(null)}
            onSaved={afterChange}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--c2)' }}>
              {rows.length} chatters, {withCommission} com comissão definida
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rows.map((row) => (
                <ChatterListRow
                  key={row.user.id}
                  user={row.user}
                  chatter={row.chatter}
                  displayName={row.displayName}
                  onEdit={() => setForm({ user: row.user, chatter: row.chatter })}
                  onRemove={() => setPendingDelete({ user: row.user, chatter: row.chatter })}
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
                Remover a comissão de{' '}
                {pendingDelete.user?.nome_exibicao ||
                  pendingDelete.chatter?.nome_exibicao ||
                  pendingDelete.user?.full_name ||
                  pendingDelete.user?.email}
                ?
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
                    border: '1px solid var(--erro)',
                    background: 'transparent',
                    color: 'var(--erro)',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-main)',
                    cursor: 'pointer',
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}