import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { CloseIcon, VolumeIcon } from '@/components/icons';
import { Interruptor } from '@/components/config/BlocoSom';
import {
  DURACAO_MAXIMA,
  cortarParaWav,
  decodificarAudio,
  formatarSegundos,
  picosDaOnda,
  tocarTrecho,
} from '@/lib/audioCorte';

const CAIXA = {
  width: 420,
  maxWidth: '92vw',
  borderRadius: 14,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  background: 'color-mix(in srgb, var(--c8) 88%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c1) 26%, transparent)',
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
  fontFamily: 'var(--font-main)',
  color: 'var(--c3)',
};

const COLUNAS = 320;

/**
 * Envio de áudio para a galeria de notificações.
 *
 * Lê o arquivo, desenha a forma de onda e deixa escolher os 4 segundos que
 * viram o som. Arquivo com 4 segundos ou menos entra inteiro. O trecho é
 * renderizado em WAV mono e sobe já cortado, então o que toca depois é
 * exatamente o que foi ouvido aqui.
 */
export default function CortarSomModal({ arquivo, usuarioId, autor, onFechar, onSalvo }) {
  const [estado, setEstado] = useState('lendo');
  const [erro, setErro] = useState('');
  const [buffer, setBuffer] = useState(null);
  const [inicio, setInicio] = useState(0);
  const [nome, setNome] = useState('');
  const [compartilhado, setCompartilhado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const canvasRef = useRef(null);
  const faixaRef = useRef(null);
  const tocaRef = useRef(null);
  const esperaRef = useRef(null);
  const [tocando, setTocando] = useState(false);

  const total = buffer?.duration || 0;
  const dur = Math.min(DURACAO_MAXIMA, total);
  const maxInicio = Math.max(0, total - DURACAO_MAXIMA);
  const precisaCortar = total > DURACAO_MAXIMA + 0.05;

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const decodificado = await decodificarAudio(arquivo);
        if (!ativo) return;
        setBuffer(decodificado);
        const semExtensao = (arquivo?.name || 'Meu som').replace(/\.[^.]+$/, '');
        setNome(semExtensao.slice(0, 40));
        setEstado('pronto');
      } catch (falha) {
        if (!ativo) return;
        setErro(falha?.message || 'Não consegui abrir o arquivo.');
        setEstado('erro');
      }
    })();
    return () => {
      ativo = false;
      tocaRef.current?.parar?.();
      if (esperaRef.current) clearTimeout(esperaRef.current);
    };
  }, [arquivo]);

  /* A onda é desenhada uma vez, em coordenadas fixas: a seleção é uma camada
     por cima, em porcentagem, então a caixa pode mudar de largura à vontade. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !buffer) return;
    const altura = 96;
    const densidade = window.devicePixelRatio || 1;
    canvas.width = COLUNAS * densidade;
    canvas.height = altura * densidade;
    const ctx = canvas.getContext('2d');
    const estilo = getComputedStyle(canvas);
    const cor = estilo.getPropertyValue('--c2').trim() || '#9aa';
    const corEscolhida = estilo.getPropertyValue('--c1').trim() || '#fd7';
    ctx.scale(densidade, densidade);
    ctx.clearRect(0, 0, COLUNAS, altura);
    const picos = picosDaOnda(buffer, COLUNAS);
    const meio = altura / 2;
    const passoBarra = COLUNAS / Math.max(1, picos.length);
    picos.forEach((pico, indice) => {
      const quando = (indice / Math.max(1, picos.length)) * total;
      const dentro = quando >= inicio && quando <= inicio + dur;
      ctx.fillStyle = dentro ? corEscolhida : cor;
      ctx.globalAlpha = dentro ? 0.95 : 0.35;
      const alturaBarra = Math.max(1, pico * (altura - 8));
      ctx.fillRect(indice * passoBarra, meio - alturaBarra / 2, Math.max(1, passoBarra - 0.6), alturaBarra);
    });
    ctx.globalAlpha = 1;
  }, [buffer, inicio, dur, total]);

  const ouvir = () => {
    if (!buffer) return;
    if (tocando) {
      tocaRef.current?.parar?.();
      setTocando(false);
      return;
    }
    tocaRef.current = tocarTrecho(buffer, inicio, dur);
    setTocando(true);
    if (esperaRef.current) clearTimeout(esperaRef.current);
    esperaRef.current = setTimeout(() => setTocando(false), Math.max(400, dur * 1000));
  };

  const marcarPonto = (evento) => {
    if (!precisaCortar) return;
    const faixa = faixaRef.current;
    if (!faixa) return;
    const caixa = faixa.getBoundingClientRect();
    const proporcao = Math.min(1, Math.max(0, (evento.clientX - caixa.left) / caixa.width));
    /* Tocar na onda centraliza a janela de 4s no ponto tocado. */
    setInicio(Math.min(maxInicio, Math.max(0, proporcao * total - dur / 2)));
  };

  const salvar = async () => {
    if (!buffer || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      const blob = await cortarParaWav(buffer, inicio, dur);
      const limpo = (nome || 'meu-som')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 32);
      const file = new File([blob], `${limpo || 'meu-som'}.wav`, { type: 'audio/wav' });
      const resposta = await base44.integrations.Core.UploadFile({ file });
      const url = resposta?.file_url;
      if (!url) throw new Error('O upload não devolveu o arquivo.');
      const registro = await base44.entities.SomNotificacao.create({
        nome: nome.trim().slice(0, 40) || 'Meu som',
        url,
        duracao: Number(dur.toFixed(2)),
        compartilhado,
        usuario_id: usuarioId,
        autor: autor || '',
      });
      onSalvo?.(registro);
    } catch (falha) {
      setErro(falha?.message || 'Não consegui enviar o áudio.');
    } finally {
      setEnviando(false);
    }
  };

  const selecao = useMemo(() => {
    if (!total) return { esquerda: 0, largura: 100 };
    return { esquerda: (inicio / total) * 100, largura: (dur / total) * 100 };
  }, [inicio, dur, total]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9950,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar?.();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Enviar áudio de notificação" style={CAIXA}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--c1)',
              }}
            >
              Enviar áudio
            </span>
            <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.8, lineHeight: 1.45 }}>
              {estado === 'lendo'
                ? 'Lendo o arquivo…'
                : estado === 'erro'
                  ? 'Deu problema com este arquivo.'
                  : precisaCortar
                    ? `O arquivo tem ${formatarSegundos(total)}. Escolha os ${DURACAO_MAXIMA} segundos que vão tocar.`
                    : `Arquivo de ${formatarSegundos(total)}, entra inteiro.`}
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
              background: 'transparent',
              color: 'var(--c2)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <CloseIcon size={13} />
          </button>
        </div>

        {estado === 'pronto' && (
          <>
            <div
              ref={faixaRef}
              onClick={marcarPonto}
              style={{
                position: 'relative',
                height: 96,
                borderRadius: 10,
                overflow: 'hidden',
                background: 'color-mix(in srgb, var(--c8) 70%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                cursor: precisaCortar ? 'crosshair' : 'default',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: '100%' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${selecao.esquerda}%`,
                  width: `${selecao.largura}%`,
                  border: '1px solid color-mix(in srgb, var(--c1) 80%, transparent)',
                  borderRadius: 6,
                  background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {precisaCortar && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9.5, color: 'var(--c2)' }}>
                  {formatarSegundos(inicio)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={maxInicio}
                  step="0.05"
                  value={inicio}
                  aria-label="Posição do corte"
                  onChange={(evento) => setInicio(Number(evento.target.value))}
                  className="glass-range"
                  style={{
                    '--glass-range-value': `${maxInicio ? (inicio / maxInicio) * 100 : 0}%`,
                  }}
                />
                <span style={{ fontSize: 9.5, color: 'var(--c2)' }}>
                  {formatarSegundos(inicio + dur)}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={ouvir}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
                  background: 'color-mix(in srgb, var(--c1) 14%, transparent)',
                  color: 'var(--c1)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <VolumeIcon size={12} />
                {tocando ? 'Parar' : 'Ouvir o trecho'}
              </button>
              <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.75 }}>
                {formatarSegundos(dur)} selecionados
              </span>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c2)' }}>
                Nome do som
              </span>
              <input
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                maxLength={40}
                placeholder="Meu som"
                style={{
                  height: 32,
                  borderRadius: 8,
                  padding: '0 10px',
                  border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
                  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
                  color: 'var(--c3)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 12,
                }}
              />
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10.5, color: 'var(--c3)' }}>Compartilhar com todo mundo</span>
                <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.75, lineHeight: 1.4 }}>
                  Entra na galeria compartilhada. Desligado, só você vê, nos seus dois aparelhos.
                </span>
              </div>
              <Interruptor
                ligado={compartilhado}
                onMudar={setCompartilhado}
                rotulo="Compartilhar este áudio com todo mundo"
              />
            </div>

            {erro && <span style={{ fontSize: 10, color: 'var(--erro)' }}>{erro}</span>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={onFechar}
                style={{
                  height: 30,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--c2) 24%, transparent)',
                  background: 'transparent',
                  color: 'var(--c3)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={enviando}
                style={{
                  height: 30,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--c1) 60%, transparent)',
                  background: 'color-mix(in srgb, var(--c1) 22%, transparent)',
                  color: 'var(--c1)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: enviando ? 'wait' : 'pointer',
                  opacity: enviando ? 0.6 : 1,
                }}
              >
                {enviando ? 'Enviando…' : 'Salvar som'}
              </button>
            </div>
          </>
        )}

        {estado === 'erro' && (
          <>
            <span style={{ fontSize: 11, color: 'var(--erro)', lineHeight: 1.5 }}>{erro}</span>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onFechar}
                style={{
                  height: 30,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--c2) 24%, transparent)',
                  background: 'transparent',
                  color: 'var(--c3)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
