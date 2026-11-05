import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, FireIcon } from '@/components/icons';
import { useAuth } from '@/lib/AuthContext';
import {
  SEQUENCIA_COM_FOGUINHO,
  enviarCutucada,
  registrarAbertura,
  respostaVencida,
} from '@/lib/cutucadas';

export default function CutucadaModal({ notificacao, onClose }) {
  const { user } = useAuth();
  const [cutucada, setCutucada] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  const sequencia = Number(
    notificacao?.cutucada_sequencia || cutucada?.sequencia || 1
  );
  const vencida = respostaVencida(cutucada);

  /* Abrir a notificação é o que liga o relógio das 24h. */
  useEffect(() => {
    let ativo = true;
    if (!notificacao?.cutucada_id) return undefined;
    registrarAbertura(notificacao.cutucada_id)
      .then((item) => {
        if (ativo && item) setCutucada(item);
      })
      .catch((falha) => console.warn('[Cutucada] abertura', falha));
    return () => {
      ativo = false;
    };
  }, [notificacao]);

  const cutucarDeVolta = async () => {
    setEnviando(true);
    setErro('');
    try {
      const eu = { id: user?.id, nome: user?.nome_exibicao || user?.full_name || '' };
      const destino = {
        id: notificacao?.solicitante_id,
        nome: notificacao?.solicitante_nome || '',
      };
      const resultado = await enviarCutucada(eu, destino);
      if (!resultado) throw new Error('Não foi possível cutucar.');
      setEnviado(true);
    } catch (falha) {
      console.error('[Cutucada] não consegui devolver', falha);
      setErro('Não consegui cutucar agora.');
    } finally {
      setEnviando(false);
    }
  };

  const quem = notificacao?.solicitante_nome || 'Alguém';
  const comFoguinho = sequencia >= SEQUENCIA_COM_FOGUINHO;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9250,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 14,
          border: '1px solid color-mix(in srgb, var(--c1) 24%, transparent)',
          background: 'color-mix(in srgb, var(--c8) 90%, transparent)',
          backdropFilter: 'blur(26px) saturate(1.35)',
          WebkitBackdropFilter: 'blur(26px) saturate(1.35)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          fontFamily: 'var(--font-main)',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              letterSpacing: '0.06em',
              color: 'var(--c1)',
            }}
          >
            cutucada
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar cutucada"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              display: 'flex',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {comFoguinho && (
              <span style={{ color: 'var(--c1)', display: 'flex' }}>
                <FireIcon size={22} />
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c3)' }}>
                {comFoguinho ? `${quem} te cutucou ${sequencia} vezes seguidas` : `${quem} te cutucou`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--c2)', marginTop: 2 }}>
                {sequencia > 1
                  ? `Sequência de ${sequencia} cutucadas.`
                  : 'Cutucar de volta também ajuda a manter o contato.'}
              </div>
            </div>
          </div>

          {vencida && !enviado && (
            <div style={{ fontSize: 10, color: 'var(--c1)' }}>
              Passou de 24h desde que você abriu esta cutucada, então a sequência recomeça.
            </div>
          )}

          {enviado ? (
            <div style={{ fontSize: 11, color: 'var(--c1)' }}>Cutucada devolvida. 🔥</div>
          ) : (
            <button
              type="button"
              onClick={cutucarDeVolta}
              disabled={enviando}
              style={{
                height: 34,
                borderRadius: 9,
                border: '1px solid color-mix(in srgb, var(--c1) 34%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 14%, transparent)',
                color: 'var(--c1)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: enviando ? 'default' : 'pointer',
                opacity: enviando ? 0.6 : 1,
                fontFamily: 'var(--font-main)',
              }}
            >
              {enviando ? 'cutucando…' : 'cutucar de volta'}
            </button>
          )}

          {erro && <div style={{ fontSize: 10, color: '#ff6b6b' }}>{erro}</div>}

          <button
            type="button"
            onClick={onClose}
            style={{
              alignSelf: 'flex-end',
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: 'var(--font-main)',
            }}
          >
            fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
