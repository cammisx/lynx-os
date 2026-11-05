import { useRef, useState } from 'react';
import {
  CloseIcon,
  FileIcon,
  MicIcon,
  PaperclipIcon,
  PencilIcon,
  SendIcon,
} from '@/components/chat/chatIcons';
import EmojiPicker from '@/components/chat/EmojiPicker';
import GifPicker from '@/components/chat/GifPicker';
import GravadorAudio from '@/components/chat/GravadorAudio';
import { inserirEmoji } from '@/lib/emojis';
import { SmileIcon } from '@/components/chat/chatIcons';
import { aplicarMarcador } from '@/lib/textoRico';
import { tamanhoLegivel } from '@/lib/chat';
import { consultaDeMencao, opcoesDeMencao } from '@/lib/mencoes';
import { iniciais } from '@/lib/chat';

const BOTOES_FORMATO = [
  { tipo: 'forte', rotulo: 'B', titulo: 'Negrito (Ctrl+B)', estilo: { fontWeight: 700 } },
  { tipo: 'italico', rotulo: 'I', titulo: 'Itálico (Ctrl+I)', estilo: { fontStyle: 'italic' } },
  { tipo: 'riscado', rotulo: 'S', titulo: 'Riscado', estilo: { textDecoration: 'line-through' } },
  { tipo: 'codigo', rotulo: '</>', titulo: 'Código', estilo: { fontFamily: 'monospace', fontSize: 8.5 } },
  { tipo: 'link', rotulo: 'link', titulo: 'Link', estilo: { fontSize: 8.5, letterSpacing: '0.04em' } },
];

export default function ChatComposer({
  texto,
  setTexto,
  anexo,
  onLimparAnexo,
  onEscolherArquivo,
  editando,
  onEnviar,
  onEnviarAnexo,
  onEnviarGif,
  onCancelarEdicao,
  ocupado,
  falha,
  setFalha,
  pessoasMencionaveis = [],
}) {
  const [gravando, setGravando] = useState(false);
  const [mencao, setMencao] = useState(null); // { inicio, consulta }
  const [mencaoAtiva, setMencaoAtiva] = useState(0);
  const [emojisAbertos, setEmojisAbertos] = useState(false);
  const [gifsAbertos, setGifsAbertos] = useState(false);
  const areaRef = useRef(null);
  const arquivoRef = useRef(null);

  /* Abre o seletor quando alguém digita "@" e fecha ao sair do trecho. */
  const acompanharMencao = (valor, cursor) => {
    if (editando) {
      setMencao(null);
      return;
    }
    const achado = consultaDeMencao(valor, cursor);
    setMencao(achado);
    setMencaoAtiva(0);
  };

  const opcoes = mencao ? opcoesDeMencao(mencao.consulta, pessoasMencionaveis) : [];

  const inserirMencao = (opcao) => {
    if (!mencao || !opcao) return;
    const campo = areaRef.current;
    const cursor = campo?.selectionStart ?? texto.length;
    const antes = texto.slice(0, mencao.inicio);
    const depois = texto.slice(cursor);
    const pedaco = `@${opcao.rotulo} `;
    setTexto(`${antes}${pedaco}${depois}`);
    setMencao(null);
    requestAnimationFrame(() => {
      const alvo = areaRef.current;
      if (!alvo) return;
      const posicao = antes.length + pedaco.length;
      alvo.focus();
      alvo.setSelectionRange(posicao, posicao);
    });
  };

  const aplicarFormato = (tipo) => {
    const campo = areaRef.current;
    const inicio = campo?.selectionStart ?? texto.length;
    const fim = campo?.selectionEnd ?? texto.length;
    const resultado = aplicarMarcador(texto, inicio, fim, tipo);
    setTexto(resultado.texto);
    requestAnimationFrame(() => {
      const alvo = areaRef.current;
      if (!alvo) return;
      alvo.focus();
      alvo.setSelectionRange(resultado.inicio, resultado.fim);
    });
  };

  const escolherEmoji = (emoji) => {
    const campo = areaRef.current;
    const inicio = campo?.selectionStart ?? texto.length;
    const fim = campo?.selectionEnd ?? texto.length;
    const resultado = inserirEmoji(texto, inicio, fim, emoji);
    setTexto(resultado.texto);
    requestAnimationFrame(() => {
      const alvo = areaRef.current;
      if (!alvo) return;
      alvo.focus();
      alvo.setSelectionRange(resultado.cursor, resultado.cursor);
    });
  };

  const enviarAudio = async (gravacao) => {
    if (!onEnviarAnexo || ocupado) return;
    const extensao = gravacao.blob.type.includes('mp4') ? 'm4a' : 'webm';
    const arquivo = new File([gravacao.blob], `audio-${Date.now()}.${extensao}`, {
      type: gravacao.blob.type || 'audio/webm',
    });
    try {
      await onEnviarAnexo(arquivo, texto, {
        segundos: gravacao.segundos,
        transcricao: gravacao.transcricao,
      });
      setTexto('');
      setGravando(false);
    } catch (erro) {
      setFalha?.('Não consegui enviar o áudio. Tenta de novo.');
    }
  };

  return (
    <>
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
            onClick={onCancelarEdicao}
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
            onClick={onLimparAnexo}
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
          position: 'relative',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          padding: '8px 10px 10px',
          borderTop: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
        }}
      >
        {emojisAbertos && !gravando && (
          <EmojiPicker onEscolher={escolherEmoji} onFechar={() => setEmojisAbertos(false)} />
        )}

        {gifsAbertos && !gravando && (
          <GifPicker
            onEscolher={(gif) => {
              setGifsAbertos(false);
              onEnviarGif?.(gif);
            }}
            onFechar={() => setGifsAbertos(false)}
          />
        )}

        <input
          ref={arquivoRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(evento) => {
            const escolhido = evento.target.files?.[0];
            onEscolherArquivo(escolhido);
            evento.target.value = '';
          }}
        />

        {gravando ? (
          <GravadorAudio
            onEnviar={enviarAudio}
            onCancelar={() => setGravando(false)}
            enviando={ocupado}
          />
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setEmojisAbertos(false);
                  setGifsAbertos((aberto) => !aberto);
                }}
                disabled={Boolean(editando)}
                aria-label="Enviar GIF"
                title="Enviar GIF"
                className="chat-gif"
                style={{
                  width: 30,
                  height: 20,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 7,
                  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                  background: gifsAbertos
                    ? 'color-mix(in srgb, var(--c1) 18%, transparent)'
                    : 'color-mix(in srgb, var(--c8) 55%, transparent)',
                  color: gifsAbertos ? 'var(--c1)' : editando ? 'var(--c12)' : 'var(--c2)',
                  cursor: editando ? 'default' : 'pointer',
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  fontFamily: 'var(--font-main)',
                  padding: 0,
                }}
              >
                GIF
              </button>

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
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {BOTOES_FORMATO.map((botao) => (
                  <button
                    key={botao.tipo}
                    type="button"
                    onMouseDown={(evento) => evento.preventDefault()}
                    onClick={() => aplicarFormato(botao.tipo)}
                    title={botao.titulo}
                    aria-label={botao.titulo}
                    style={{
                      minWidth: 20,
                      height: 18,
                      padding: '0 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--c2)',
                      fontSize: 10,
                      fontFamily: 'var(--font-main)',
                      cursor: 'pointer',
                      ...botao.estilo,
                    }}
                  >
                    {botao.rotulo}
                  </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--c12)' }}>
                  Ctrl+B negrito · Ctrl+I itálico
                </span>
              </div>

              {mencao && opcoes.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Mencionar alguém"
                  className="chat-mencoes"
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: 6,
                    width: 210,
                    maxHeight: 190,
                    overflowY: 'auto',
                    zIndex: 30,
                    borderRadius: 10,
                    border: '1px solid color-mix(in srgb, var(--c1) 26%, transparent)',
                    background: 'color-mix(in srgb, var(--c8) 96%, transparent)',
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                    boxShadow: '0 14px 34px rgba(0,0,0,0.42)',
                    padding: 4,
                  }}
                >
                  {opcoes.map((opcao, indice) => {
                    const escolhida = indice === mencaoAtiva;
                    return (
                      <button
                        key={opcao.id}
                        type="button"
                        role="option"
                        aria-selected={escolhida}
                        onMouseDown={(evento) => evento.preventDefault()}
                        onMouseEnter={() => setMencaoAtiva(indice)}
                        onClick={() => inserirMencao(opcao)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '5px 7px',
                          border: 'none',
                          borderRadius: 7,
                          background: escolhida
                            ? 'color-mix(in srgb, var(--c1) 16%, transparent)'
                            : 'transparent',
                          color: escolhida ? 'var(--c1)' : 'var(--c3)',
                          fontFamily: 'var(--font-main)',
                          fontSize: 11,
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        {opcao.atalho ? (
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
                              fontSize: 9,
                              color: 'var(--c1)',
                            }}
                          >
                            @
                          </span>
                        ) : opcao.foto_url ? (
                          <img
                            src={opcao.foto_url}
                            alt=""
                            style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
                              fontSize: 8,
                              fontWeight: 700,
                              color: 'var(--c1)',
                            }}
                          >
                            {iniciais(opcao.nome)}
                          </span>
                        )}
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opcao.atalho ? 'todos do canal' : opcao.rotulo}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <textarea
                ref={areaRef}
                value={texto}
                onChange={(evento) => {
                  setTexto(evento.target.value);
                  acompanharMencao(evento.target.value, evento.target.selectionStart);
                }}
                onClick={(evento) => acompanharMencao(texto, evento.currentTarget.selectionStart)}
                onPaste={(evento) => {
                  if (editando) return;
                  const itens = Array.from(evento.clipboardData?.items || []);
                  const imagem = itens.find((item) => item.type.startsWith('image/'));
                  if (!imagem) return;
                  const arquivo = imagem.getAsFile();
                  if (!arquivo) return;
                  evento.preventDefault();
                  onEscolherArquivo(arquivo);
                }}
                onKeyDown={(evento) => {
                  if (mencao && opcoes.length > 0) {
                    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
                      evento.preventDefault();
                      setMencaoAtiva((indice) => {
                        const passo = evento.key === 'ArrowDown' ? 1 : -1;
                        return (indice + passo + opcoes.length) % opcoes.length;
                      });
                      return;
                    }
                    if (evento.key === 'Enter' || evento.key === 'Tab') {
                      evento.preventDefault();
                      inserirMencao(opcoes[mencaoAtiva] || opcoes[0]);
                      return;
                    }
                    if (evento.key === 'Escape') {
                      evento.preventDefault();
                      setMencao(null);
                      return;
                    }
                  }

                  const comando = evento.ctrlKey || evento.metaKey;
                  if (comando && evento.key.toLowerCase() === 'b') {
                    evento.preventDefault();
                    aplicarFormato('forte');
                    return;
                  }
                  if (comando && evento.key.toLowerCase() === 'i') {
                    evento.preventDefault();
                    aplicarFormato('italico');
                    return;
                  }
                  if (evento.key === 'Enter' && !evento.shiftKey) {
                    evento.preventDefault();
                    onEnviar();
                  }
                  if (evento.key === 'Escape' && editando) {
                    evento.preventDefault();
                    onCancelarEdicao();
                  }
                }}
                placeholder={
                  editando ? 'edite a mensagem…' : 'escrever mensagem… (Ctrl+V cola print)'
                }
                rows={2}
                className="chat-campo"
                style={{
                  width: '100%',
                  minHeight: 52,
                  maxHeight: 160,
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
            </div>

            <button
              type="button"
              onClick={() => setEmojisAbertos((aberto) => !aberto)}
              disabled={Boolean(editando)}
              aria-label="Emojis"
              title="Emojis"
              className="chat-emojis"
              style={{
                width: 30,
                height: 34,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9,
                border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                background: emojisAbertos
                  ? 'color-mix(in srgb, var(--c1) 18%, transparent)'
                  : 'color-mix(in srgb, var(--c8) 55%, transparent)',
                color: emojisAbertos ? 'var(--c1)' : editando ? 'var(--c12)' : 'var(--c2)',
                cursor: editando ? 'default' : 'pointer',
              }}
            >
              <SmileIcon size={15} />
            </button>

            <button
              type="button"
              onClick={() => {
                setEmojisAbertos(false);
                setGifsAbertos(false);
                setGravando(true);
              }}
              disabled={Boolean(editando)}
              aria-label="Gravar áudio"
              title="Gravar áudio (até 3 min)"
              className="chat-microfone"
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
              <MicIcon size={14} />
            </button>

            <button
              type="button"
              onClick={onEnviar}
              disabled={(!texto.trim() && !anexo) || ocupado}
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
          </>
        )}
      </div>
    </>
  );
}
