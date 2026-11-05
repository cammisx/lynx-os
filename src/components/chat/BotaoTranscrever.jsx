import { useState } from 'react';
import { TextoIcon } from '@/components/chat/chatIcons';
import { transcreverAudio } from '@/lib/transcricao';

/**
 * Botão discreto que transcreve o áudio da mensagem no próprio navegador.
 * Na primeira vez ele baixa o modelo, então o rótulo mostra o progresso.
 */
export default function BotaoTranscrever({ mensagem, onSalvar }) {
  const [estado, setEstado] = useState('parado');
  const [progresso, setProgresso] = useState(0);
  const [falha, setFalha] = useState('');

  const ocupado = estado !== 'parado';

  const rodar = async () => {
    if (ocupado || !mensagem?.audio_url) return;
    setFalha('');
    setProgresso(0);
    setEstado('preparando');
    try {
      const texto = await transcreverAudio(mensagem.audio_url, ({ fase, valor }) => {
        setEstado(fase === 'modelo' ? 'preparando' : 'transcrevendo');
        setProgresso(valor || 0);
      });
      if (!texto) {
        setFalha('não saiu texto deste áudio');
        setEstado('parado');
        return;
      }
      setEstado('salvando');
      await onSalvar(mensagem.id, texto);
      setEstado('parado');
    } catch (erro) {
      console.warn('[Chat] transcrição falhou', erro);
      setFalha('não consegui transcrever');
      setEstado('parado');
    }
  };

  const rotulo
    = estado === 'preparando'
      ? `preparando${progresso ? ` ${progresso}%` : '…'}`
      : estado === 'transcrevendo'
        ? 'transcrevendo…'
        : estado === 'salvando'
          ? 'salvando…'
          : falha || 'transcrever';

  return (
    <button
      type="button"
      onClick={rodar}
      disabled={ocupado}
      title={falha || 'Transcrever este áudio aqui no navegador'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        padding: '2px 6px',
        borderRadius: 6,
        border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
        color: falha ? 'var(--c4)' : 'var(--c2)',
        fontSize: 9,
        letterSpacing: 0.2,
        cursor: ocupado ? 'default' : 'pointer',
        opacity: ocupado ? 0.85 : 1,
      }}
    >
      <TextoIcon size={10} />
      {rotulo}
    </button>
  );
}
