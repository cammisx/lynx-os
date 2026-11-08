import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import GlassSelect from '@/components/GlassSelect';
import DateTimePicker from '@/components/DateTimePicker';
import SeletorTags from '@/components/conteudo/SeletorTags';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import { prepararFundo } from '@/lib/fundo';
import {
  TIPOS,
  diaDeISO,
  diaISO,
  duracaoTexto,
  itemNormalizado,
  novoItemDeConteudo,
  partesDaDuracao,
  precisaDuracao,
  segundosDe,
  validarItem,
} from '@/lib/conteudoPastas';

const campo = {
  width: '100%',
  padding: '7px 9px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c6) 35%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  outline: 'none',
  boxSizing: 'border-box',
};

const rotulo = {
  fontSize: 9.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

const erroTexto = { fontSize: 9.5, color: 'var(--erro)' };

const numero = (texto) => String(texto || '').replace(/\D/g, '').slice(0, 4);

/**
 * Formulário de um item do conteúdo.
 *
 * Imagem, tipo, duração (quando vídeo ou áudio) e data são obrigatórios; nome,
 * descrição e tags são opcionais. O mesmo formulário abre em modo leitura para
 * quem não é admin.
 */
export default function ModalItem({
  item = null,
  sugestoesTags = [],
  somenteLeitura = false,
  onCriarTag,
  onFechar,
  onSalvar,
}) {
  const [dados, setDados] = useState(() => itemNormalizado(item || novoItemDeConteudo()));
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState('');
  const arquivoRef = useRef(null);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar]);

  const erros = validarItem(dados);
  const temErro = Object.keys(erros).length > 0;
  const mostrarErro = (chave) => tentouSalvar && erros[chave];

  const mudar = (campoAlvo, valor) => setDados((atual) => ({ ...atual, [campoAlvo]: valor }));

  const subirImagem = async (arquivo) => {
    if (!arquivo) return;
    if (!arquivo.type?.startsWith('image/')) {
      setFalha('O arquivo precisa ser uma imagem.');
      return;
    }
    setEnviando(true);
    setFalha('');
    try {
      /* A imagem do item vira capa: reduzimos antes de subir para o conteúdo
         abrir rápido mesmo com várias pastas cheias. */
      const leve = await prepararFundo(arquivo);
      const resposta = await base44.integrations.Core.UploadFile({ file: leve });
      const url = resposta?.file_url;
      if (!url) throw new Error('upload sem url');
      mudar('imagem_url', url);
    } catch (erro) {
      console.warn('[Conteúdo] upload da imagem', erro);
      setFalha('Não consegui subir a imagem. Tente de novo.');
    } finally {
      setEnviando(false);
      if (arquivoRef.current) arquivoRef.current.value = '';
    }
  };

  const escolherImagem = (evento) => subirImagem(evento.target.files?.[0]);

  /* Ctrl+V em qualquer lugar do formulário: se veio imagem na área de
     transferência, ela vira a capa do item. Texto continua indo para o campo
     que estiver em foco, sem interferência. */
  useEffect(() => {
    if (somenteLeitura) return undefined;
    const aoColar = (evento) => {
      const itens = Array.from(evento.clipboardData?.items || []);
      const imagem = itens.find((item) => item.kind === 'file' && item.type?.startsWith('image/'));
      if (!imagem) return;
      const arquivo = imagem.getAsFile();
      if (!arquivo) return;
      evento.preventDefault();
      subirImagem(arquivo);
    };
    document.addEventListener('paste', aoColar);
    return () => document.removeEventListener('paste', aoColar);
  }, [somenteLeitura]);

  const partes = partesDaDuracao(dados.duracao_seg || 0);

  const salvar = () => {
    setTentouSalvar(true);
    if (temErro) return;
    onSalvar(itemNormalizado(dados));
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Item do conteúdo" style={{ ...MODAL_CAIXA, width: 520 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 12.5,
                letterSpacing: '0.04em',
                color: 'var(--c1)',
              }}
            >
              {item ? 'EDITAR ITEM' : 'NOVO ITEM'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--c2)' }}>
              {somenteLeitura ? 'só leitura' : 'imagem, tipo, duração e data são obrigatórios'}
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
              background: 'color-mix(in srgb, var(--c8) 50%, transparent)',
              color: 'var(--c3)',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="glass-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {/* imagem */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 132,
                height: 96,
                flexShrink: 0,
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {dados.imagem_url ? (
                <img
                  src={dados.imagem_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.75 }}>sem imagem</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <span style={rotulo}>Imagem</span>
              {!somenteLeitura && (
                <>
                  <input
                    ref={arquivoRef}
                    type="file"
                    accept="image/*"
                    onChange={escolherImagem}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => arquivoRef.current?.click()}
                    disabled={enviando}
                    style={{
                      padding: '7px 11px',
                      borderRadius: 8,
                      border: '1px solid color-mix(in srgb, var(--c1) 34%, transparent)',
                      background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
                      color: 'var(--c1)',
                      fontFamily: 'var(--font-main)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: enviando ? 'default' : 'pointer',
                      opacity: enviando ? 0.6 : 1,
                    }}
                  >
                    {enviando ? 'Subindo…' : dados.imagem_url ? 'Trocar imagem' : 'Escolher imagem'}
                  </button>
                </>
              )}
              {mostrarErro('imagem_url') ? <span style={erroTexto}>{erros.imagem_url}</span> : null}

              <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.75, lineHeight: 1.5 }}>
                {somenteLeitura
                  ? 'Imagem do item.'
                  : 'Escolha o arquivo ou cole com Ctrl+V. JPG, PNG ou WEBP; a imagem é reduzida antes de subir.'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <GlassSelect
              label="Tipo"
              value={dados.tipo}
              onChange={(tipo) => mudar('tipo', tipo)}
              options={TIPOS.map(({ value, label }) => ({ value, label }))}
              placeholder="Vídeo, foto ou áudio"
              disabled={somenteLeitura}
            />
            <DateTimePicker
              label="Data"
              mode="date"
              value={diaDeISO(dados.data)}
              onChange={(data) => mudar('data', data ? diaISO(data) : '')}
            />
          </div>
          {mostrarErro('tipo') ? <span style={erroTexto}>{erros.tipo}</span> : null}
          {mostrarErro('data') ? <span style={erroTexto}>{erros.data}</span> : null}

          {precisaDuracao(dados.tipo) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={rotulo}>Duração</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <input
                    value={partes.minutos ? String(partes.minutos) : ''}
                    onChange={(evento) =>
                      mudar(
                        'duracao_seg',
                        segundosDe(numero(evento.target.value), partes.segundos)
                      )
                    }
                    disabled={somenteLeitura}
                    inputMode="numeric"
                    placeholder="00"
                    style={{ ...campo, width: 58, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--c2)' }}>min</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <input
                    value={partes.segundos ? String(partes.segundos) : ''}
                    onChange={(evento) => {
                      const segundos = Math.min(59, Number(numero(evento.target.value)) || 0);
                      mudar('duracao_seg', segundosDe(partes.minutos, segundos));
                    }}
                    disabled={somenteLeitura}
                    inputMode="numeric"
                    placeholder="00"
                    style={{ ...campo, width: 58, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--c2)' }}>seg</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.8 }}>
                  {duracaoTexto(dados.duracao_seg)}
                </span>
              </div>
              {mostrarErro('duracao') ? <span style={erroTexto}>{erros.duracao}</span> : null}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={rotulo}>Descrição (opcional)</span>
            <textarea
              value={dados.descricao}
              onChange={(evento) => mudar('descricao', evento.target.value)}
              disabled={somenteLeitura}
              rows={3}
              placeholder="O que é, para quem, como usar"
              style={{ ...campo, resize: 'vertical', minHeight: 64, opacity: somenteLeitura ? 0.7 : 1 }}
            />
          </div>

          <SeletorTags
            valor={dados.tags}
            onChange={(tags) => mudar('tags', tags)}
            sugestoes={sugestoesTags}
            onCriarTag={onCriarTag}
            disabled={somenteLeitura}
            label="Tags (opcional)"
          />

          {falha ? <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{falha}</span> : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '10px 16px',
            borderTop: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <button
            type="button"
            onClick={onFechar}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
              background: 'transparent',
              color: 'var(--c3)',
              fontFamily: 'var(--font-main)',
              fontSize: 10.5,
              cursor: 'pointer',
            }}
          >
            {somenteLeitura ? 'Fechar' : 'Cancelar'}
          </button>
          {!somenteLeitura && (
            <button
              type="button"
              onClick={salvar}
              disabled={enviando}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c1) 55%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
                color: 'var(--c1)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: enviando ? 'default' : 'pointer',
                opacity: enviando ? 0.6 : 1,
              }}
            >
              Salvar item
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
