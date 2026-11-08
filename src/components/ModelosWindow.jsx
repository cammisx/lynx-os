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
import { useAuth } from '@/lib/AuthContext';
import { sincronizarAdminsUmaVez } from '@/lib/admins';
import { arquivarPlaybookDaModelo, restaurarPlaybookDaModelo } from '@/lib/playbooksSync';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

/* Cada lista responde por si: uma leitura recusada não pode esconder as
   modelos que já existem. */
const carregarLista = async (promessa) => {
  try {
    return { lista: asList(await promessa), falhou: false };
  } catch (falha) {
    console.warn('[Modelos] consulta falhou', falha?.message || falha);
    return { lista: [], falhou: true };
  }
};

export default function ModelosWindow({ onClose }) {
  const [models, setModels] = useState([]);
  const [chatters, setChatters] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [falhouModelos, setFalhouModelos] = useState(false);

  const { user } = useAuth();
  const ehAdmin = user?.role === 'admin';

  /* A janela pede a equipe ao backend: o RLS das entidades esconde modelos e
     usuários de quem não é admin, e era isso que deixava a lista vazia. */
  const load = async () => {
    try {
      const resposta = await base44.functions.invoke('equipeModelos', {});
      const dados = resposta?.data;
      if (dados?.ok) {
        setModels(dados.modelos || []);
        setUsers(dados.usuarios || []);
        setChatters([]);
        setFalhouModelos(false);
        return;
      }
    } catch (falha) {
      console.warn('[Modelos] leitura da equipe falhou, tentando direto', falha?.message || falha);
    }

    const [modelosLidos, chattersLidos, usuariosLidos] = await Promise.all([
      carregarLista(base44.entities.Modelo.list()),
      carregarLista(base44.entities.Chatter.list()),
      carregarLista(base44.entities.User.list()),
    ]);
    setModels(modelosLidos.lista);
    setChatters(chattersLidos.lista);
    setUsers(usuariosLidos.lista);
    setFalhouModelos(modelosLidos.falhou);
  };

  /* Admin novo entra em todas as modelos automaticamente. */
  useEffect(() => {
    if (!ehAdmin) return;
    sincronizarAdminsUmaVez().then((ajustadas) => {
      if (ajustadas > 0) load();
    });
  }, [ehAdmin]);

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
    /* O playbook sai da visão geral junto com a modelo, sem ser apagado. */
    await arquivarPlaybookDaModelo(pendingArchive.id);
    setPendingArchive(null);
    await afterChange();
  };

  const restoreModel = async (model) => {
    await base44.entities.Modelo.update(model.id, { arquivada: false, arquivada_em: null });
    await restaurarPlaybookDaModelo(model.id);
    await afterChange();
  };

  const openDelete = async (model) => {
    const result = await base44.entities.Shift.filter({ modelo_id: model.id }, { limit: 500 });
    setPendingDelete({ model, count: asList(result).length });
  };

  const removeModel = async () => {
    if (!pendingDelete) return;
    await base44.entities.Shift.deleteMany({ modelo_id: pendingDelete.model.id });
    /* Playbook nunca é excluído: fica arquivado com o texto guardado. */
    await arquivarPlaybookDaModelo(pendingDelete.model.id);
    await base44.entities.Modelo.delete(pendingDelete.model.id);
    setPendingDelete(null);
    await afterChange();
  };

  const chatterOptions = useMemo(() => {
    const names = buildChatterNames(chatters);
    if (users.length === 0) {
      return chatters
        .filter((chatter) => chatter?.usuario_id)
        .map((chatter) => ({
          usuario_id: chatter.usuario_id,
          nome: chatter.nome_exibicao || chatter.usuario_email || '',
          isAdmin: false,
        }));
    }
    return users.map((pessoa) => ({
      usuario_id: pessoa.id,
      nome:
        pessoa.nome_exibicao || names[pessoa.id] || pessoa.full_name || pessoa.email || '',
      isAdmin: pessoa.role === 'admin',
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
                {falhouModelos
                  ? 'Não consegui carregar a lista agora.'
                  : 'Nenhuma modelo cadastrada ainda.'}
              </span>
            )}

            {falhouModelos && (
              <div>
                <button
                  type="button"
                  onClick={load}
                  style={{
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'var(--font-main)',
                    cursor: 'pointer',
                    border: '1px solid color-mix(in srgb, var(--c1) 35%, transparent)',
                    background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
                    color: 'var(--c1)',
                  }}
                >
                  Tentar de novo
                </button>
              </div>
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
                    border: '1px solid var(--erro)',
                    background: 'transparent',
                    color: 'var(--erro)',
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