import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons';
import ChatIcon from '@/components/icons/ChatIcon';
import { useAuth } from '@/lib/AuthContext';
import { useChatPanel } from '@/components/chat/ChatProvider';
import { CANAL_PRIVADO, iniciais, nomeDoCanal } from '@/lib/chat';
import { enviarCutucada } from '@/lib/cutucadas';

const cartao = {
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
  borderRadius: 10,
  padding: '9px 10px',
  fontSize: 11,
  color: 'var(--c3)',
};

const botao = {
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 32,
  borderRadius: 9,
  border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
  background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
  color: 'var(--c1)',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};

/** Perfil de outra pessoa, aberto pelo nome no cabeçalho da conversa. */
export default function PerfilUsuarioModal({ pessoa, onClose }) {
  const { user } = useAuth();
  const { canais, modelos, criarCanal, abrirCanal } = useChatPanel();
  const [fotoAberta, setFotoAberta] = useState(false);
  const [cutucando, setCutucando] = useState(false);
  const [aviso, setAviso] = useState('');

  const euId = user?.id;

  const modelosComuns = useMemo(() => {
    if (!pessoa?.id) return [];
    const participa = (modelo, id) =>
      (modelo.chatters || []).some((membro) => membro?.usuario_id === id);
    return (modelos || []).filter(
      (modelo) => !modelo.arquivada && participa(modelo, pessoa.id) && participa(modelo, euId)
    );
  }, [modelos, pessoa, euId]);

  const conversasComuns = useMemo(() => {
    if (!pessoa?.id) return [];
    return (canais || [])
      .filter((canal) => {
        const dentro = canal.participantes || [];
        if (canal.tipo === CANAL_PRIVADO) {
          return dentro.includes(pessoa.id) && dentro.includes(euId);
        }
        return dentro.includes(pessoa.id) && dentro.includes(euId);
      })
      .sort((a, b) => (a.tipo === CANAL_PRIVADO ? -1 : b.tipo === CANAL_PRIVADO ? 1 : 0));
  }, [canais, pessoa, euId]);

  if (!pessoa) return null;

  const abrirConversa = (canalId) => {
    abrirCanal(canalId);
    onClose();
  };

  const mandarMensagem = async () => {
    const existente = conversasComuns.find((canal) => canal.tipo === CANAL_PRIVADO);
    if (existente) {
      abrirConversa(existente.id);
      return;
    }
    const criado = await criarCanal({ tipo: CANAL_PRIVADO, participantes: [pessoa.id] });
    if (criado?.id) abrirConversa(criado.id);
  };

  const cutucar = async () => {
    setCutucando(true);
    setAviso('');
    try {
      const eu = { id: euId, nome: user?.nome_exibicao || user?.full_name || '' };
      const resultado = await enviarCutucada(eu, { id: pessoa.id, nome: pessoa.nome });
      setAviso(
        resultado?.sequencia >= 4
          ? `Cutucada enviada. ${resultado.sequencia} seguidas!`
          : 'Cutucada enviada.'
      );
    } catch (falha) {
      console.error('[Perfil] não consegui cutucar', falha);
      setAviso('Não consegui cutucar agora.');
    } finally {
      setCutucando(false);
    }
  };

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9200,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: 480,
            maxWidth: '100%',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 14,
            border: '1px solid color-mix(in srgb, var(--c1) 22%, transparent)',
            background: 'color-mix(in srgb, var(--c8) 90%, transparent)',
            backdropFilter: 'blur(26px) saturate(1.35)',
            WebkitBackdropFilter: 'blur(26px) saturate(1.35)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            fontFamily: 'var(--font-main)',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              height: 42,
              borderBottom: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                letterSpacing: '0.06em',
                color: 'var(--c1)',
              }}
            >
              perfil
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar perfil"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--c2)',
                display: 'flex',
                cursor: 'pointer',
              }}
            >
              <CloseIcon size={14} />
            </button>
          </div>

          <div className="glass-scroll" style={{ overflowY: 'auto', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {pessoa.foto_url ? (
                <img
                  src={pessoa.foto_url}
                  alt={pessoa.nome}
                  onClick={() => setFotoAberta(true)}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    objectFit: 'cover',
                    cursor: 'zoom-in',
                    border: '1px solid color-mix(in srgb, var(--c1) 35%, transparent)',
                  }}
                />
              ) : (
                <span
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--c8)',
                    background: 'color-mix(in srgb, var(--c1) 70%, transparent)',
                  }}
                >
                  {iniciais(pessoa.nome)}
                </span>
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c3)' }}>
                  {pessoa.nome}
                </div>
                {pessoa.subnick && (
                  <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--c1)' }}>
                    {pessoa.subnick}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--c12)', marginTop: 2 }}>
                  {pessoa.cargo === 'admin' ? 'administração' : 'chatter'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" style={botao} onClick={mandarMensagem}>
                <ChatIcon size={14} />
                Mensagem direta
              </button>
              <button
                type="button"
                style={{ ...botao, opacity: cutucando ? 0.6 : 1 }}
                onClick={cutucar}
                disabled={cutucando}
              >
                <UsersIcon size={14} />
                {cutucando ? 'Cutucando…' : 'Cutucar'}
              </button>
            </div>

            {aviso && (
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--c1)' }}>{aviso}</div>
            )}

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--c2)',
                  marginBottom: 6,
                }}
              >
                modelos em comum
              </div>
              {modelosComuns.length === 0 ? (
                <div style={{ ...cartao, color: 'var(--c12)' }}>Nenhuma modelo em comum.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {modelosComuns.map((modelo) => (
                    <span
                      key={modelo.id}
                      style={{
                        ...cartao,
                        padding: '4px 9px',
                        borderRadius: 14,
                        border: '1px solid color-mix(in srgb, var(--c1) 25%, transparent)',
                        color: 'var(--c1)',
                      }}
                    >
                      {modelo.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--c2)',
                  marginBottom: 6,
                }}
              >
                conversas em comum
              </div>
              {conversasComuns.length === 0 ? (
                <div style={{ ...cartao, color: 'var(--c12)' }}>Nenhuma conversa ainda.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {conversasComuns.map((canal) => (
                    <button
                      key={canal.id}
                      type="button"
                      onClick={() => abrirConversa(canal.id)}
                      style={{
                        ...cartao,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-main)',
                      }}
                    >
                      <span style={{ color: 'var(--c1)', display: 'flex' }}>
                        <ChatIcon size={13} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nomeDoCanal(canal, { usuario: user, modelos })}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--c12)',
                        }}
                      >
                        {canal.tipo === CANAL_PRIVADO ? 'privado' : canal.tipo}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {fotoAberta && pessoa.foto_url && (
        <div
          onClick={() => setFotoAberta(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.82)',
            cursor: 'zoom-out',
            padding: 20,
          }}
        >
          <img
            src={pessoa.foto_url}
            alt={pessoa.nome}
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              borderRadius: 10,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      )}
    </>,
    document.body
  );
}
