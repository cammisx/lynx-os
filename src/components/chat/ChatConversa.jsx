import { useEffect, useMemo, useRef, useState } from 'react';
import { BackIcon, SendIcon } from '@/components/chat/chatIcons';
import { useChatPanel } from '@/components/chat/ChatProvider';
import { useAuth } from '@/lib/AuthContext';
import {
  CANAL_PRIVADO,
  corDaPessoa,
  diaDaMensagem,
  horaDaMensagem,
  iniciais,
  nomeDoCanal,
} from '@/lib/chat';

export default function ChatConversa({ onVoltar }) {
  const { user } = useAuth();
  const { canalAtivo, mensagens, modelos, pessoas, enviar, enviando, fecharCanal } = useChatPanel();
  const [texto, setTexto] = useState('');
  const [falha, setFalha] = useState('');
  const fimRef = useRef(null);
  const areaRef = useRef(null);

  const nome = nomeDoCanal(canalAtivo, { usuario: user, pessoas, modelos });

  useEffect(() => {
    if (fimRef.current) fimRef.current.scrollIntoView({ block: 'end' });
  }, [mensagens.length, canalAtivo?.id]);

  useEffect(() => {
    if (areaRef.current) {
      areaRef.current.style.height = 'auto';
      areaRef.current.style.height = `${Math.min(96, Math.max(34, areaRef.current.scrollHeight))}px`;
    }
  }, [texto]);

  const blocos = useMemo(() => {
    const lista = [];
    let diaAtual = '';
    mensagens.forEach((mensagem) => {
      const dia = diaDaMensagem(mensagem.created_date);
      if (dia !== diaAtual) {
        diaAtual = dia;
        lista.push({ tipo: 'dia', chave: `dia-${dia}-${mensagem.id}`, dia });
      }
      lista.push({ tipo: 'mensagem', chave: mensagem.id, mensagem });
    });
    return lista;
  }, [mensagens]);

  const submeter = async () => {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setFalha('');
    setTexto('');
    try {
      await enviar(canalAtivo.id, conteudo);
    } catch (erro) {
      setFalha('Não consegui enviar. Tenta de novo.');
      setTexto(conteudo);
    }
  };

  const voltar = () => {
    if (onVoltar) onVoltar();
    else fecharCanal();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          height: 46,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px 0 6px',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
        }}
      >
        <button
          type="button"
          onClick={voltar}
          aria-label="Voltar para as conversas"
          className="chat-icone"
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
          <BackIcon size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--c3)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nome}
          </div>
          <div style={{ fontSize: 9, color: 'var(--c12)', letterSpacing: '0.06em' }}>
            {mensagens.length ? `${mensagens.length} mensagem(ns) recentes` : 'comece a conversa'}
          </div>
        </div>
      </div>

      <div
        className="glass-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {mensagens.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', fontSize: 11, color: 'var(--c12)', lineHeight: 1.6, padding: 16 }}>
            Nada por aqui ainda.<br />Mande a primeira mensagem.
          </div>
        )}

        {blocos.map((bloco) => {
          if (bloco.tipo === 'dia') {
            return (
              <div key={bloco.chave} style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 2px' }}>
                <span
                  style={{
                    fontSize: 8.5,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--c2)',
                    padding: '2px 8px',
                    borderRadius: 8,
                    background: 'color-mix(in srgb, var(--c2) 10%, transparent)',
                  }}
                >
                  {bloco.dia}
                </span>
              </div>
            );
          }

          const mensagem = bloco.mensagem;
          const minha = mensagem.autor_id === user?.id;
          const mostrarAutor = !minha && canalAtivo?.tipo !== CANAL_PRIVADO;
          const apagada = Boolean(mensagem.apagada);

          return (
            <div
              key={bloco.chave}
              style={{ display: 'flex', gap: 6, justifyContent: minha ? 'flex-end' : 'flex-start' }}
            >
              {!minha && (
                <span
                  style={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: 11,
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: 'var(--c8)',
                    background: corDaPessoa(mensagem.autor_id),
                  }}
                >
                  {iniciais(mensagem.autor_nome)}
                </span>
              )}
              <div style={{ maxWidth: '78%', minWidth: 0 }}>
                {mostrarAutor && (
                  <div style={{ fontSize: 9, color: 'var(--c2)', margin: '0 0 2px 3px' }}>
                    {mensagem.autor_nome}
                    {mensagem.autor_cargo === 'admin' ? ' · admin' : ''}
                  </div>
                )}
                <div
                  style={{
                    padding: '6px 9px',
                    borderRadius: minha ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                    border: `1px solid color-mix(in srgb, var(--c1) ${minha ? 26 : 12}%, transparent)`,
                    background: minha
                      ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                      : 'color-mix(in srgb, var(--c2) 8%, transparent)',
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    color: apagada ? 'var(--c2)' : 'var(--c3)',
                    fontStyle: apagada ? 'italic' : 'normal',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {apagada ? 'mensagem apagada' : mensagem.texto}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: minha ? 'flex-end' : 'flex-start',
                    gap: 4,
                    fontSize: 8,
                    color: 'var(--c12)',
                    margin: '2px 3px 0',
                  }}
                >
                  <span>{horaDaMensagem(mensagem.created_date)}</span>
                  {mensagem.editada_em && <span>· editada</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>

      {falha && (
        <div style={{ padding: '0 12px 4px', fontSize: 10, color: 'var(--c6)' }}>{falha}</div>
      )}

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          padding: '8px 10px 10px',
          borderTop: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
        }}
      >
        <textarea
          ref={areaRef}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter' && !evento.shiftKey) {
              evento.preventDefault();
              submeter();
            }
          }}
          placeholder="escrever mensagem…"
          rows={1}
          className="chat-campo"
          style={{
            flex: 1,
            minHeight: 34,
            maxHeight: 96,
            resize: 'none',
            background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
            border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
            borderRadius: 9,
            color: 'var(--c3)',
            fontSize: 11.5,
            lineHeight: 1.45,
            padding: '8px 9px',
            fontFamily: 'var(--font-main)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={submeter}
          disabled={!texto.trim() || enviando}
          aria-label="Enviar mensagem"
          className="chat-enviar"
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 9,
            border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
            background: texto.trim()
              ? 'color-mix(in srgb, var(--c1) 22%, transparent)'
              : 'color-mix(in srgb, var(--c2) 8%, transparent)',
            color: texto.trim() ? 'var(--c1)' : 'var(--c12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: texto.trim() ? 'pointer' : 'default',
            transition: 'background 140ms ease, color 140ms ease',
          }}
        >
          <SendIcon size={15} />
        </button>
      </div>
    </div>
  );
}
