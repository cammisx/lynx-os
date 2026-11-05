import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BackIcon,
  CloseIcon,
  DownloadIcon,
  EyeOffIcon,
  FileIcon,
  MoreIcon,
  PencilIcon,
  TrashIcon,
} from '@/components/chat/chatIcons';
import AudioPlayer from '@/components/chat/AudioPlayer';
import BotaoTranscrever from '@/components/chat/BotaoTranscrever';
import ChatComposer from '@/components/chat/ChatComposer';
import TextoRico from '@/components/chat/TextoRico';
import { useChatPanel } from '@/components/chat/ChatProvider';
import PerfilUsuarioModal from '@/components/chat/PerfilUsuarioModal';
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
    salvarTranscricao,
  } = useChatPanel();

  const [texto, setTexto] = useState('');
  const [falha, setFalha] = useState('');
  const [anexo, setAnexo] = useState(null);
  const [editando, setEditando] = useState(null);
  const [menuDe, setMenuDe] = useState(null);
  const [imagemAberta, setImagemAberta] = useState('');
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const fimRef = useRef(null);
  const areaRef = useRef(null);

  const nome = nomeDoCanal(canalAtivo, { usuario: user, pessoas, modelos });

  /* Nome e foto vêm do perfil atual: trocar o nome no sistema atualiza também
     as mensagens que já estavam na tela. */
  const pessoaPorId = useMemo(() => {
    const mapa = new Map();
    (Array.isArray(pessoas) ? pessoas : []).forEach((pessoa) => {
      if (pessoa?.id) mapa.set(pessoa.id, pessoa);
    });
    return mapa;
  }, [pessoas]);

  /* Em conversa privada o cabeçalho mostra quem está do outro lado. */
  const outraPessoa = useMemo(() => {
    if (canalAtivo?.tipo !== CANAL_PRIVADO) return null;
    const outroId = (canalAtivo.participantes || []).find((id) => id !== user?.id);
    return pessoaPorId.get(outroId) || null;
  }, [canalAtivo, pessoaPorId, user]);

  useEffect(() => {
    if (fimRef.current) fimRef.current.scrollIntoView({ block: 'end' });
  }, [mensagens.length, canalAtivo?.id]);

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
    requestAnimationFrame(() => {
      const campo = document.querySelector('.chat-campo');
      if (campo) {
        campo.focus();
        campo.setSelectionRange(campo.value.length, campo.value.length);
      }
    });
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

  /** Áudio: sobe o arquivo gravado junto do texto e da transcrição. */
  const enviarAudio = async (arquivo, conteudo, extras) => {
    setFalha('');
    setOcupado(true);
    try {
      await enviarAnexo(canalAtivo.id, arquivo, conteudo, extras);
      setTexto('');
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
          <button
            type="button"
            onClick={() => outraPessoa && setPerfilAberto(true)}
            disabled={!outraPessoa}
            title={outraPessoa ? `Ver o perfil de ${nome}` : undefined}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: 0,
              border: 'none',
              background: 'transparent',
              fontSize: 12,
              color: 'var(--c3)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: outraPessoa ? 'pointer' : 'default',
              fontFamily: 'var(--font-main)',
            }}
          >
            {nome}
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 9,
              color: 'var(--c12)',
              letterSpacing: '0.06em',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {outraPessoa?.subnick && (
              <span
                style={{
                  fontStyle: 'italic',
                  color: 'var(--c1)',
                  letterSpacing: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {outraPessoa.subnick}
              </span>
            )}
            <span style={{ flexShrink: 0 }}>
              {outraPessoa?.subnick ? '· ' : ''}
              {mensagens.length ? `${mensagens.length} mensagem(ns)` : 'comece a conversa'}
            </span>
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
          const ehAudio = Boolean(mensagem.audio_url);
          const autor = pessoaPorId.get(mensagem.autor_id);
          const autorNome = autor?.nome || mensagem.autor_nome;
          const autorFoto = autor?.foto_url || '';

          return (
            <div
              key={bloco.chave}
              style={{ display: 'flex', gap: 6, justifyContent: minha ? 'flex-end' : 'flex-start' }}
            >
              {!minha &&
                (autorFoto ? (
                  <img
                    src={autorFoto}
                    alt=""
                    style={{
                      width: 22,
                      height: 22,
                      flexShrink: 0,
                      borderRadius: 11,
                      marginTop: 2,
                      objectFit: 'cover',
                      border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                    }}
                  />
                ) : (
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
                    {iniciais(autorNome)}
                  </span>
                ))}

              <div style={{ maxWidth: '78%', minWidth: 0, position: 'relative' }}>
                {mostrarAutor && (
                  <div style={{ fontSize: 9, color: 'var(--c2)', margin: '0 0 2px 3px' }}>
                    {autorNome}
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
                      whiteSpace: 'normal',
                    }}
                  >
                    {ehImagem && (
                      <img
                        src={mensagem.anexo_url}
                        alt={mensagem.anexo_nome || 'imagem'}
                        onClick={() => setImagemAberta(mensagem.anexo_url)}
                        title="Clique para ampliar"
                        style={{
                          display: 'block',
                          maxWidth: 220,
                          maxHeight: 220,
                          borderRadius: 7,
                          cursor: 'zoom-in',
                          marginBottom: mensagem.texto ? 5 : 0,
                        }}
                      />
                    )}

                    {temAnexo && !ehImagem && !ehAudio && (
                      <a
                        href={mensagem.anexo_url}
                        target="_blank"
                        rel="noreferrer"
                        title={`Abrir ${mensagem.anexo_nome || 'arquivo'}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          minWidth: 190,
                          padding: '5px 3px',
                          textDecoration: 'none',
                          color: 'var(--c3)',
                        }}
                      >
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            flexShrink: 0,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--c1)',
                            background: 'color-mix(in srgb, var(--c1) 18%, transparent)',
                            border: '1px solid color-mix(in srgb, var(--c1) 26%, transparent)',
                          }}
                        >
                          <FileIcon size={15} />
                        </span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              display: 'block',
                              fontSize: 10.5,
                              lineHeight: 1.35,
                              color: 'var(--c3)',
                              wordBreak: 'break-word',
                            }}
                          >
                            {mensagem.anexo_nome || 'arquivo'}
                          </span>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 8.5,
                              letterSpacing: '0.04em',
                              color: 'var(--c1)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {tamanhoLegivel(mensagem.anexo_tamanho)}
                            {mensagem.anexo_tamanho ? ' · ' : ''}abrir
                            <DownloadIcon size={9} />
                          </span>
                        </span>
                      </a>
                    )}

                    {!temAnexo && !ehAudio && (mensagem.tipo === 'arquivo' || mensagem.tipo === 'imagem') && (
                      <span style={{ fontSize: 10.5, color: 'var(--c2)' }}>
                        anexo indisponível
                      </span>
                    )}

                    {mensagem.tipo === 'audio' && mensagem.audio_url && !apagada && (
                      <div style={{ marginBottom: mensagem.texto ? 5 : 0 }}>
                        <AudioPlayer
                          url={mensagem.audio_url}
                          duracao={mensagem.audio_duracao}
                        />
                        {!mensagem.transcricao && (
                          <BotaoTranscrever mensagem={mensagem} onSalvar={salvarTranscricao} />
                        )}
                      </div>
                    )}

                    {apagada ? (
                      'mensagem apagada'
                    ) : mensagem.texto ? (
                      <TextoRico texto={mensagem.texto} />
                    ) : null}

                    {!apagada && mensagem.transcricao && (
                      <div
                        style={{
                          marginTop: mensagem.texto || mensagem.audio_url ? 5 : 0,
                          paddingTop: 4,
                          borderTop: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
                          fontSize: 9.5,
                          fontStyle: 'italic',
                          color: 'var(--c2)',
                          lineHeight: 1.45,
                        }}
                      >
                        {mensagem.transcricao}
                      </div>
                    )}
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

      {perfilAberto && outraPessoa && (
        <PerfilUsuarioModal pessoa={outraPessoa} onClose={() => setPerfilAberto(false)} />
      )}

      <ChatComposer
        texto={texto}
        setTexto={setTexto}
        anexo={anexo}
        onLimparAnexo={limparAnexo}
        onEscolherArquivo={prepararArquivo}
        editando={editando}
        onEnviar={submeter}
        onEnviarAnexo={enviarAudio}
        onCancelarEdicao={cancelarEdicao}
        ocupado={ocupado || enviando}
        falha={falha}
        setFalha={setFalha}
      />

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
