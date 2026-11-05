import { useEffect, useRef, useState } from 'react';
import { PauseIcon, PlayIcon } from '@/components/chat/chatIcons';
import { tempoDeAudio } from '@/lib/textoRico';

const VELOCIDADES = [1, 1.5, 2];

/** Player dos áudios do chat, com velocidade 1x, 1,5x e 2x. */
export default function AudioPlayer({ url, duracao }) {
  const audioRef = useRef(null);
  const [tocando, setTocando] = useState(false);
  const [atual, setAtual] = useState(0);
  const [total, setTotal] = useState(Number(duracao) || 0);
  const [velocidade, setVelocidade] = useState(1);

  useEffect(() => {
    setTocando(false);
    setAtual(0);
    setTotal(Number(duracao) || 0);
  }, [url, duracao]);

  useEffect(() => {
    const elemento = audioRef.current;
    if (elemento) elemento.playbackRate = velocidade;
  }, [velocidade]);

  const alternar = async () => {
    const elemento = audioRef.current;
    if (!elemento) return;
    if (elemento.paused) {
      try {
        await elemento.play();
      } catch (falha) {
        setTocando(false);
      }
    } else {
      elemento.pause();
    }
  };

  const buscar = (evento) => {
    const elemento = audioRef.current;
    const caixa = evento.currentTarget.getBoundingClientRect();
    if (!elemento || !caixa.width || !elemento.duration) return;
    const proporcao = Math.min(1, Math.max(0, (evento.clientX - caixa.left) / caixa.width));
    elemento.currentTime = proporcao * elemento.duration;
    setAtual(elemento.currentTime);
  };

  const duracaoFinal = total || audioRef.current?.duration || 0;
  const progresso = duracaoFinal ? Math.min(100, (atual / duracaoFinal) * 100) : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 190, padding: '1px 2px' }}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => {
          setTocando(false);
          setAtual(0);
        }}
        onTimeUpdate={(evento) => setAtual(evento.currentTarget.currentTime)}
        onLoadedMetadata={(evento) => {
          if (!total && Number.isFinite(evento.currentTarget.duration)) {
            setTotal(evento.currentTarget.duration);
          }
        }}
      />

      <button
        type="button"
        onClick={alternar}
        aria-label={tocando ? 'Pausar áudio' : 'Tocar áudio'}
        style={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
          background: 'color-mix(in srgb, var(--c1) 18%, transparent)',
          color: 'var(--c1)',
          cursor: 'pointer',
        }}
      >
        {tocando ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          onClick={buscar}
          style={{
            height: 4,
            borderRadius: 2,
            cursor: 'pointer',
            background: 'color-mix(in srgb, var(--c2) 24%, transparent)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${progresso}%`,
              height: '100%',
              borderRadius: 2,
              background: 'var(--c1)',
            }}
          />
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 8.5,
            letterSpacing: '0.05em',
            color: 'var(--c12)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {tempoDeAudio(atual)} / {tempoDeAudio(duracaoFinal)}
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          setVelocidade((atualVelocidade) => {
            const proxima = VELOCIDADES.indexOf(atualVelocidade) + 1;
            return VELOCIDADES[proxima % VELOCIDADES.length];
          })
        }
        aria-label="Velocidade do áudio"
        style={{
          width: 30,
          height: 22,
          flexShrink: 0,
          borderRadius: 6,
          border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
          background: 'color-mix(in srgb, var(--c2) 8%, transparent)',
          color: 'var(--c1)',
          fontSize: 9,
          fontFamily: 'var(--font-main)',
          cursor: 'pointer',
        }}
      >
        {velocidade === 1 ? '1x' : `${String(velocidade).replace('.', ',')}x`}
      </button>
    </div>
  );
}
