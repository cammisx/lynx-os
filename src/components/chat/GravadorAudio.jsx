import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CloseIcon, StopIcon } from '@/components/chat/chatIcons';
import AudioPlayer from '@/components/chat/AudioPlayer';
import { tempoDeAudio } from '@/lib/textoRico';

const LIMITE_SEGUNDOS = 180;

const melhorMime = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const opcoes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return opcoes.find((tipo) => MediaRecorder.isTypeSupported?.(tipo)) || '';
};

/**
 * Grava até 3 minutos, mostra o áudio antes de enviar e tenta transcrever
 * enquanto grava (Web Speech, quando o navegador oferece).
 */
export default function GravadorAudio({ onEnviar, onCancelar, enviando }) {
  const [fase, setFase] = useState('gravando');
  const [segundos, setSegundos] = useState(0);
  const [url, setUrl] = useState('');
  const [blob, setBlob] = useState(null);
  const [transcricao, setTranscricao] = useState('');
  const [erro, setErro] = useState('');

  const gravadorRef = useRef(null);
  const pedacosRef = useRef([]);
  const fluxoRef = useRef(null);
  const cronometroRef = useRef(null);
  const textoRef = useRef('');
  const reconhecimentoRef = useRef(null);
  const iniciadoRef = useRef(false);
  const segundosRef = useRef(0);

  const encerrarRecursos = () => {
    if (cronometroRef.current) clearInterval(cronometroRef.current);
    cronometroRef.current = null;
    try {
      reconhecimentoRef.current?.stop();
    } catch (falha) {
      // já estava parado
    }
    reconhecimentoRef.current = null;
    fluxoRef.current?.getTracks?.().forEach((track) => track.stop());
    fluxoRef.current = null;
  };

  const parar = () => {
    const gravador = gravadorRef.current;
    if (gravador && gravador.state !== 'inactive') {
      gravador.stop();
    }
  };

  const iniciarTranscricao = () => {
    const Motor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Motor) return;
    try {
      const reconhecimento = new Motor();
      reconhecimento.lang = 'pt-BR';
      reconhecimento.continuous = true;
      reconhecimento.interimResults = false;
      reconhecimento.onresult = (evento) => {
        let novo = '';
        for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
          if (evento.results[i].isFinal) novo += `${evento.results[i][0].transcript} `;
        }
        if (novo.trim()) {
          textoRef.current = `${textoRef.current} ${novo}`.trim().slice(0, 4000);
          setTranscricao(textoRef.current);
        }
      };
      reconhecimento.onerror = () => {};
      reconhecimento.start();
      reconhecimentoRef.current = reconhecimento;
    } catch (falha) {
      reconhecimentoRef.current = null;
    }
  };

  useEffect(() => {
    if (iniciadoRef.current) return undefined;
    iniciadoRef.current = true;

    const comecar = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
          setErro('Este navegador não grava áudio.');
          setFase('erro');
          return;
        }
        const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
        fluxoRef.current = fluxo;
        const mime = melhorMime();
        const gravador = new MediaRecorder(fluxo, mime ? { mimeType: mime } : undefined);
        gravadorRef.current = gravador;
        pedacosRef.current = [];

        gravador.ondataavailable = (evento) => {
          if (evento.data?.size) pedacosRef.current.push(evento.data);
        };
        gravador.onstop = () => {
          const tipo = mime || pedacosRef.current[0]?.type || 'audio/webm';
          const montado = new Blob(pedacosRef.current, { type: tipo });
          encerrarRecursos();
          setBlob(montado);
          setUrl((anterior) => {
            if (anterior) URL.revokeObjectURL(anterior);
            return URL.createObjectURL(montado);
          });
          setFase('revisao');
        };

        gravador.start(1000);
        iniciarTranscricao();

        cronometroRef.current = setInterval(() => {
          segundosRef.current += 1;
          setSegundos(segundosRef.current);
          if (segundosRef.current >= LIMITE_SEGUNDOS) parar();
        }, 1000);
      } catch (falha) {
        setErro(
          falha?.name === 'NotAllowedError'
            ? 'Preciso da permissão do microfone para gravar.'
            : 'Não consegui abrir o microfone.'
        );
        setFase('erro');
      }
    };

    comecar();

    return () => {
      encerrarRecursos();
      if (gravadorRef.current?.state !== 'inactive') {
        try {
          gravadorRef.current?.stop();
        } catch (falha) {
          // ignora
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );

  const enviar = () => {
    if (!blob || enviando) return;
    onEnviar({
      blob,
      segundos: segundosRef.current || segundos,
      transcricao: textoRef.current.trim(),
    });
  };

  if (fase === 'erro') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 42,
          padding: '0 10px',
          borderRadius: 9,
          border: '1px solid color-mix(in srgb, var(--c6) 34%, transparent)',
          background: 'color-mix(in srgb, var(--c6) 10%, transparent)',
          fontSize: 10.5,
          color: 'var(--c6)',
        }}
      >
        {erro}
        <button
          type="button"
          onClick={onCancelar}
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: 'transparent',
            color: 'var(--c2)',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          fechar
        </button>
      </div>
    );
  }

  if (fase === 'revisao') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '7px 9px',
          borderRadius: 9,
          border: '1px solid color-mix(in srgb, var(--c1) 28%, transparent)',
          background: 'color-mix(in srgb, var(--c1) 9%, transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AudioPlayer url={url} duracao={segundos} />
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Descartar áudio"
            style={{
              width: 24,
              height: 24,
              flexShrink: 0,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
              background: 'transparent',
              color: 'var(--c2)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={11} />
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            aria-label="Enviar áudio"
            style={{
              width: 28,
              height: 28,
              flexShrink: 0,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
              background: 'color-mix(in srgb, var(--c1) 24%, transparent)',
              color: 'var(--c1)',
              cursor: enviando ? 'default' : 'pointer',
            }}
          >
            <CheckIcon size={13} />
          </button>
        </div>
        {transcricao && (
          <div style={{ fontSize: 9.5, lineHeight: 1.45, color: 'var(--c2)' }}>
            {transcricao}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        minHeight: 42,
        padding: '0 10px',
        borderRadius: 9,
        border: '1px solid color-mix(in srgb, var(--c6) 34%, transparent)',
        background: 'color-mix(in srgb, var(--c6) 8%, transparent)',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          background: 'var(--c6)',
          boxShadow: '0 0 0 3px color-mix(in srgb, var(--c6) 22%, transparent)',
        }}
      />
      <span
        style={{
          fontSize: 11,
          color: 'var(--c3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        gravando {tempoDeAudio(segundos)}
      </span>
      <span style={{ fontSize: 9, color: 'var(--c12)' }}>
        {transcricao ? 'transcrevendo…' : `limite ${tempoDeAudio(LIMITE_SEGUNDOS)}`}
      </span>
      <button
        type="button"
        onClick={onCancelar}
        style={{
          marginLeft: 'auto',
          border: 'none',
          background: 'transparent',
          color: 'var(--c2)',
          fontSize: 9.5,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        cancelar
      </button>
      <button
        type="button"
        onClick={parar}
        aria-label="Parar gravação"
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid color-mix(in srgb, var(--c6) 45%, transparent)',
          background: 'color-mix(in srgb, var(--c6) 20%, transparent)',
          color: 'var(--c6)',
          cursor: 'pointer',
        }}
      >
        <StopIcon size={12} />
      </button>
    </div>
  );
}
