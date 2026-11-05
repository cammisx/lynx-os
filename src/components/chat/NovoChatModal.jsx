import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import { CheckIcon, CloseIcon, UsersIcon } from '@/components/icons';
import { useAuth } from '@/lib/AuthContext';
import { corDaPessoa, iniciais } from '@/lib/chat';
import { useChatPanel } from '@/components/chat/ChatProvider';

const rotulo = {
  fontSize: 9,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
  marginBottom: 6,
};

const campo = {
  width: '100%',
  boxSizing: 'border-box',
  height: 34,
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  color: 'var(--c3)',
  fontSize: 12,
  padding: '0 10px',
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

export default function NovoChatModal({ onClose }) {
  const { user } = useAuth();
  const { pessoas, canais, criarCanal, abrirCanal } = useChatPanel();
  const [tipo, setTipo] = useState('privado');
  const [nome, setNome] = useState('');
  const [escolhidos, setEscolhidos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const disponiveis = useMemo(
    () =>
      pessoas
        .filter((pessoa) => pessoa.id !== user?.id)
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')),
    [pessoas, user?.id]
  );

  const alternar = (id) => {
    setErro('');
    if (tipo === 'privado') {
      setEscolhidos((anterior) => (anterior[0] === id ? [] : [id]));
      return;
    }
    setEscolhidos((anterior) =>
      anterior.includes(id) ? anterior.filter((item) => item !== id) : [...anterior, id]
    );
  };

  const trocarTipo = (novo) => {
    setTipo(novo);
    setErro('');
    if (novo === 'privado') setEscolhidos((anterior) => anterior.slice(0, 1));
  };

  const jaExistePrivado = () => {
    if (tipo !== 'privado' || escolhidos.length !== 1) return null;
    return (
      canais.find(
        (canal) =>
          canal.tipo === 'privado' &&
          (canal.participantes || []).length === 2 &&
          (canal.participantes || []).includes(escolhidos[0]) &&
          (canal.participantes || []).includes(user?.id)
      ) || null
    );
  };

  const salvar = async () => {
    const limpo = nome.trim();
    if (!escolhidos.length) {
      setErro(tipo === 'privado' ? 'Escolha com quem você quer falar.' : 'Escolha quem entra no grupo.');
      return;
    }
    if (tipo === 'grupo' && !limpo) {
      setErro('Dê um nome para o grupo.');
      return;
    }

    const existente = jaExistePrivado();
    if (existente) {
      abrirCanal(existente.id);
      onClose();
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      await criarCanal({
        tipo,
        nome: tipo === 'grupo' ? limpo : '',
        participantes: escolhidos,
      });
      onClose();
    } catch (falha) {
      console.error('[Chat] não consegui criar o canal', falha);
      setErro('Não consegui criar. Tenta de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const aba = (valor, texto) => (
    <button
      key={valor}
      type="button"
      onClick={() => trocarTipo(valor)}
      style={{
        flex: 1,
        height: 30,
        borderRadius: 8,
        border: `1px solid ${
          tipo === valor ? 'color-mix(in srgb, var(--c1) 45%, transparent)' : 'color-mix(in srgb, var(--c2) 18%, transparent)'
        }`,
        background:
          tipo === valor ? 'color-mix(in srgb, var(--c1) 16%, transparent)' : 'transparent',
        color: tipo === valor ? 'var(--c1)' : 'var(--c2)',
        fontSize: 10,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-main)',
        cursor: 'pointer',
      }}
    >
      {texto}
    </button>
  );

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9600,
        background: 'rgba(10, 3, 8, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div style={MODAL_CAIXA} onClick={(evento) => evento.stopPropagation()}>
        <div
          style={{
            height: 42,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '0 8px 0 14px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--c1)',
            }}
          >
            Nova conversa
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={13} />
          </button>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {aba('privado', 'Conversa privada')}
            {aba('grupo', 'Grupo')}
          </div>

          {tipo === 'grupo' && (
            <label style={{ display: 'block' }}>
              <div style={rotulo}>nome do grupo</div>
              <input
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                placeholder="ex: Time da Ayumi"
                style={campo}
                maxLength={40}
              />
            </label>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...rotulo, marginBottom: 0 }}>
              {tipo === 'privado' ? 'quem você quer chamar' : 'quem entra no grupo'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--c12)' }}>
              {escolhidos.length} selecionado(s)
            </div>
          </div>

          <div
            className="glass-scroll"
            style={{
              maxHeight: 240,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              paddingRight: 2,
            }}
          >
            {disponiveis.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--c12)', padding: 8 }}>
                Nenhuma outra pessoa cadastrada ainda.
              </div>
            )}
            {disponiveis.map((pessoa) => {
              const marcado = escolhidos.includes(pessoa.id);
              return (
                <button
                  key={pessoa.id}
                  type="button"
                  onClick={() => alternar(pessoa.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: `1px solid ${
                      marcado ? 'color-mix(in srgb, var(--c1) 35%, transparent)' : 'transparent'
                    }`,
                    background: marcado ? 'color-mix(in srgb, var(--c1) 10%, transparent)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: 'var(--c8)',
                      background: corDaPessoa(pessoa.id),
                    }}
                  >
                    {iniciais(pessoa.nome)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11.5,
                        color: 'var(--c3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pessoa.nome}
                    </span>
                    <span style={{ display: 'block', fontSize: 9, color: 'var(--c12)' }}>
                      {pessoa.cargo === 'admin' ? 'administração' : 'chatter'}
                    </span>
                  </span>
                  {marcado && <CheckIcon size={13} style={{ color: 'var(--c1)' }} />}
                </button>
              );
            })}
          </div>

          {erro && <div style={{ fontSize: 10.5, color: 'var(--c6)' }}>{erro}</div>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--c12)' }}>
              <UsersIcon size={12} />
              {tipo === 'grupo' ? 'todos do grupo veem as mensagens' : 'só vocês dois veem'}
            </div>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              style={{
                height: 32,
                padding: '0 16px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
                color: 'var(--c1)',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--font-main)',
                cursor: salvando ? 'default' : 'pointer',
                opacity: salvando ? 0.6 : 1,
              }}
            >
              {salvando ? 'criando…' : tipo === 'grupo' ? 'Criar grupo' : 'Abrir conversa'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
