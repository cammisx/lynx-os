import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BackIcon,
  CloseIcon,
  DownloadIcon,
  EyeOffIcon,
  FileIcon,
  MoreIcon,
  PaperclipIcon,
  PencilIcon,
  SendIcon,
  TrashIcon,
} from '@/components/chat/chatIcons';
import { useChatPanel } from '@/components/chat/ChatProvider';
import { useAuth } from '@/lib/AuthContext';
import {
  CANAL_PRIVADO,
  corDaPessoa,
  diaDaMensagem,
  horaDaMensagem,
  iniciais,
  nomeDoCanal,
  podeApagarParaTodos,
  tamanhoLegivel,
} from '@/lib/chat';

const LIMITE_ANEXO = 10 * 1024 * 1024;

const botaoMenu = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '7px 10px',
  border: 'none',
  background: 'transparent',
  color: 'var(--c3)',
  fontSize: 11,
  fontFamily: 'var(--font-main)',
  textAlign: 'left',
  cursor: 'pointer',
};

export default function ChatConversa({ onVoltar }) {
  const { user } = useAuth();
  const {
    canalAtivo,
    mensagens,
    modelos,
    pessoas,
    enviar,
    enviarAnexo,
    editar,
    apagar,
    enviando,
    fecharCanal,
  } = useChatPanel();

  const [texto, setTexto] = useState('');
  const [falha, setFalha] = useState('');
  const [anexo, setAnexo] = useState(null);
  const [editando, setEditando] = useState(null);
  const [menuDe, setMenuDe] = useState(null);
  const [imagemAberta, setImagemAberta] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const fimRef = useRef(null);
  const areaRef = useRef(null);
  const arquivoRef = useRef(null);

  const nome = nomeDoCanal(canalAtivo, { usuario: user, pessoas, modelos });

  useEffect(() => {
    if (fimRef.current) fimRef.current.scrollIntoView({ block: 'end' });
  }, [mensagens.length, canalAtivo?.id]);

  useEffect(() => {
    if (areaRef.current) {
      areaRef.current.style.height = 'auto';
      areaRef.current.style.height = `${Math.min(168, Math.max(58, areaRef.current.scrollHeight))}px`;
    }
  }, [texto]);

  /* Menu da mensagem fecha ao clicar fora. */
  useEffect(() => {
    if (!menuDe) return undefined;
    const fechar = () => setMenuDe(null);
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, [menuDe]);

  /* Prévia local da imagem some da memória ao trocar ou cancelar. */
  useEffect(
    () => () => {
      if (anexo?.previa) URL.revokeObjectURL(anexo.previa);
    },
    [anexo]
  );

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

  const prepararArquivo = (arquivo) => {
    if (!arquivo) return;
    setFalha('');
    if (arquivo.size > LIMITE_ANEXO) {
      setFalha('Arquivo muito grande. O limite é 10 MB.');
      return;
    }
    const imagem = String(arquivo.type || '').startsWith('image/');
    setAnexo({
      arquivo,
      nome: arquivo.name || (imagem ? 'imagem.png' : 'arquivo'),
      tamanho: arquivo.size || 0,
      imagem,
      previa: imagem ? URL.createObjectURL(arquivo) : '',
    });
  };

  const limparAnexo = () => {
    if (anexo?.previa) URL.revokeObjectURL(anexo.previa);
    setAnexo(null);
  };

  const submeter = async () => {
    const conteudo = texto.trim();
    if (editando) {
      if (!conteudo || ocupado) return;
      setOcupado(true);
      setFalha('');
      try {
        await editar(editando.id, conteudo);
        setEditando(null);
        setTexto('');
      } catch (erro) {
        setFalha('Não consegui salvar a edição.');
      } finally {
        setOcupado(false);
      }
      return;
    }

    if ((!conteudo && !anexo) || enviando || ocupado) return;
    const enviado = anexo;
    setFalha('');
    setTexto('');
    setAnexo(null);
    setOcupado(true);
    try {
      if (enviado) await enviarAnexo(canalAtivo.id, enviado.arquivo, conteudo);
      else await enviar(canalAtivo.id, conteudo);
      if (enviado?.previa) URL.revokeObjectURL(enviado.previa);
    } catch (erro) {
      setFalha(
        enviado ? 'Não consegui enviar o anexo. Tenta de novo.' : 'Não consegui enviar. Tenta de novo.'
      );
      setTexto(conteudo);
      if (enviado) setAnexo(enviado);
    } finally {
      setOcupado(false);
    }
  };

  const comecarEdicao = (mensagem) => {
    setMenuDe(null);
    setEditando({ id: mensagem.id });
    setTexto(mensagem.texto || '');
    limparAnexo();
    if (areaRef.current) areaRef.current.focus();
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setTexto('');
  };

  const apagarMensagem = async (mensagem, paraTodos) => {
    setMenuDe(null);
    setOcupado(true);
    setFalha('');
    try {
      await apagar(mensagem, paraTodos);
      if (editando?.id === mensagem.id) cancelarEdicao();
    } catch (erro) {
      setFalha('Não consegui apagar a mensagem.');
    } finally {
      setOcupado(false);
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
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 10px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {mensagens.length === 0 && (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--c12)',
              lineHeight: 1.6,
              padding: 16,
            }}
          >
            Nada por aqui ainda.
            <br />
            Mande a primeira mensagem.
          </div>
        )}

        {blocos.map((bloco) => {
          if (bloco.tipo === 'dia') {
            return (
              <div
                key={bloco.chave}
                style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 2px' }}
              >
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
          const temAnexo = Boolean(mensagem.anexo_url) && !apagada;
          const ehImagem = mensagem.tipo === 'imagem' && temAnexo;

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

              <div style={{ maxWidth: '78%', minWidth: 0, position: 'relative' }}>
                {mostrarAutor && (
                  <div style={{ fontSize: 9, color: 'var(--c2)', margin: '0 0 2px 3px' }}>
                    {mensagem.autor_nome}
                    {mensagem.autor_cargo === 'admin' ? ' · admin' : ''}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <div
                    style={{
                      padding: ehImagem ? 4 : '6px 9px',
                      borderRadius: minha ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                      border: `1px solid color-mix(in srgb, var(--c1) ${
                        minha ? 26 : 12
                      }%, transparent)`,
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
                    {ehImagem && (
                      <img
                        src={mensagem.anexo_url}
                        alt={mensagem.anexo_nome || 'imagem'}
                        onClick={() => setImagemAberta(mensagem.anexo_url)}
                        style={{
                          display: 'block',
                          maxWidth: 210,
                          maxHeight: 210,
                          borderRadius: 7,
                          cursor: 'zoom-in',
                          marginBottom: mensagem.texto ? 5 : 0,
                        }}
                      />
                    )}

                    {temAnexo && !ehImagem && (
                      <a
                        href={mensagem.anexo_url}
                        target="_blank"
                        rel="noreferrer"
                        download={mensagem.anexo_nome || undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '4px 2px',
                          textDecoration: 'none',
                          color: 'var(--c3)',
                        }}
                      >
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            flexShrink: 0,
                            borderRadius: 7,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--c1)',
                            background: 'color-mix(in srgb, var(--c1) 16%, transparent)',
                          }}
                        >
                          <FileIcon size={14} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: 'block',
                              fontSize: 10.5,
                              maxWidth: 150,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {mensagem.anexo_nome || 'arquivo'}
                          </span>
                          <span style={{ display: 'block', fontSize: 8.5, color: 'var(--c12)' }}>
                            {tamanhoLegivel(mensagem.anexo_tamanho) || 'baixar'}
                          </span>
                        </span>
                        <DownloadIcon size={12} />
                      </a>
                    )}

                    {apagada ? 'mensagem apagada' : mensagem.texto}
                  </div>

                  <button
                    type="button"
                    onClick={(evento) => {
                      evento.stopPropagation();
                      setMenuDe((atual) => (atual === mensagem.id ? null : mensagem.id));
                    }}
                    aria-label="Opções da mensagem"
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 2,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--c12)',
                      cursor: 'pointer',
                      opacity: menuDe === mensagem.id ? 1 : 0.55,
                    }}
                  >
                    <MoreIcon size={13} />
                  </button>
                </div>

                {menuDe === mensagem.id && (
                  <div
                    className="chat-menu"
                    onClick={(evento) => evento.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: minha ? 0 : 'auto',
                      left: minha ? 'auto' : 0,
                      zIndex: 20,
                      minWidth: 160,
                      padding: 4,
                      borderRadius: 9,
                      border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
                      background: 'color-mix(in srgb, var(--c8) 92%, transparent)',
                      backdropFilter: 'blur(14px)',
                      boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
                    }}
                  >
                    {minha && !apagada && mensagem.tipo !== 'imagem' && mensagem.tipo !== 'arquivo' && (
                      <button
                        type="button"
                        style={botaoMenu}
                        onClick={() => comecarEdicao(mensagem)}
                      >
                        <PencilIcon size={12} /> Editar
                      </button>
                    )}
                    {!apagada && (
                      <button
                        type="button"
                        style={botaoMenu}
                        onClick={() => apagarMensagem(mensagem, false)}
                      >
                        <EyeOffIcon size={12} /> Apagar para mim
                      </button>
                    )}
                    {!apagada && podeApagarParaTodos(mensagem, user) && (
                      <button
                        type="button"
                        style={{ ...botaoMenu, color: 'var(--c6)' }}
                        onClick={() => apagarMensagem(mensagem, true)}
                      >
                        <TrashIcon size={12} /> Apagar para todos
                      </button>
                    )}
                    {apagada && (
                      <div style={{ ...botaoMenu, cursor: 'default', color: 'var(--c12)' }}>
                        mensagem apagada
                      </div>
                    )}
                  </div>
                )}

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
                  {mensagem.editada_em && !apagada && <span>· editada</span>}
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

      {editando && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            fontSize: 9.5,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--c1)',
            borderTop: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
          }}
        >
          <PencilIcon size={11} /> editando mensagem
          <button
            type="button"
            onClick={cancelarEdicao}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              fontSize: 9.5,
              cursor: 'pointer',
            }}
          >
            cancelar
          </button>
        </div>
      )}

      {anexo && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '0 10px',
            marginTop: editando ? 0 : 8,
            padding: '7px 9px',
            borderRadius: 9,
            border: '1px solid color-mix(in srgb, var(--c1) 26%, transparent)',
            background: 'color-mix(in srgb, var(--c1) 10%, transparent)',
          }}
        >
          {anexo.imagem ? (
            <img
              src={anexo.previa}
              alt={anexo.nome}
              style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 6 }}
            />
          ) : (
            <span style={{ color: 'var(--c1)', display: 'flex' }}>
              <FileIcon size={16} />
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--c3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {anexo.nome}
            </div>
            <div style={{ fontSize: 8.5, color: 'var(--c12)' }}>
              {tamanhoLegivel(anexo.tamanho)}
            </div>
          </div>
          <button
            type="button"
            onClick={limparAnexo}
            aria-label="Remover anexo"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              display: 'flex',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={13} />
          </button>
        </div>
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
        <input
          ref={arquivoRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(evento) => {
            const escolhido = evento.target.files?.[0];
            prepararArquivo(escolhido);
            evento.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => arquivoRef.current?.click()}
          disabled={Boolean(editando)}
          aria-label="Anexar arquivo"
          className="chat-anexar"
          style={{
            width: 30,
            height: 34,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9,
            border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
            background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
            color: editando ? 'var(--c12)' : 'var(--c2)',
            cursor: editando ? 'default' : 'pointer',
          }}
        >
          <PaperclipIcon size={14} />
        </button>

        <textarea
          ref={areaRef}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onPaste={(evento) => {
            if (editando) return;
            const itens = Array.from(evento.clipboardData?.items || []);
            const imagem = itens.find((item) => item.type.startsWith('image/'));
            if (!imagem) return;
            const arquivo = imagem.getAsFile();
            if (!arquivo) return;
            evento.preventDefault();
            prepararArquivo(arquivo);
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter' && !evento.shiftKey) {
              evento.preventDefault();
              submeter();
            }
            if (evento.key === 'Escape' && editando) {
              evento.preventDefault();
              cancelarEdicao();
            }
          }}
          placeholder={
            editando ? 'edite a mensagem…' : 'escrever mensagem… (cole uma imagem com Ctrl+V)'
          }
          rows={2}
          className="chat-campo"
          style={{
            flex: 1,
            minHeight: 58,
            maxHeight: 168,
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
          disabled={(!texto.trim() && !anexo) || enviando || ocupado}
          aria-label={editando ? 'Salvar edição' : 'Enviar mensagem'}
          className="chat-enviar"
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 9,
            border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
            background:
              texto.trim() || anexo
                ? 'color-mix(in srgb, var(--c1) 22%, transparent)'
                : 'color-mix(in srgb, var(--c2) 8%, transparent)',
            color: texto.trim() || anexo ? 'var(--c1)' : 'var(--c12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: texto.trim() || anexo ? 'pointer' : 'default',
            transition: 'background 140ms ease, color 140ms ease',
          }}
        >
          <SendIcon size={15} />
        </button>
      </div>

      {imagemAberta &&
        createPortal(
          <div
            onClick={() => setImagemAberta('')}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 4000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              background: 'rgba(8, 8, 12, 0.82)',
              backdropFilter: 'blur(6px)',
              cursor: 'zoom-out',
            }}
          >
            <img
              src={imagemAberta}
              alt="imagem ampliada"
              style={{
                maxWidth: '92vw',
                maxHeight: '88vh',
                borderRadius: 10,
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              }}
            />
            <button
              type="button"
              onClick={() => setImagemAberta('')}
              aria-label="Fechar imagem"
              style={{
                position: 'fixed',
                top: 18,
                right: 18,
                width: 34,
                height: 34,
                borderRadius: 17,
                border: '1px solid color-mix(in srgb, var(--c2) 30%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 80%, transparent)',
                color: 'var(--c3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <CloseIcon size={15} />
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
