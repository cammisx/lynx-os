import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MODAL_CAIXA } from '@/lib/modalStyles';

const rotulo = {
  fontSize: 9.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

const campo = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  outline: 'none',
  boxSizing: 'border-box',
};

const emailValido = (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor || '').trim());

/**
 * Convite de chatter: nome e e-mail. Quem envia é a janela de Chatters (o
 * convite do Base44 sai por lá); aqui só juntamos os dados e mostramos o erro,
 * se houver.
 */
export default function ModalConvidar({ onFechar, onEnviar }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape' && !enviando) onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar, enviando]);

  const enviar = async () => {
    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim();
    if (!nomeLimpo) {
      setErro('Diz o nome de quem você quer convidar.');
      return;
    }
    if (!emailValido(emailLimpo)) {
      setErro('Esse e-mail não parece certo.');
      return;
    }

    setErro('');
    setEnviando(true);
    const resultado = await onEnviar({ nome: nomeLimpo, email: emailLimpo });
    setEnviando(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    onFechar();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 14000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.42)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !enviando) onFechar();
      }}
    >
      <div style={{ ...MODAL_CAIXA, width: 380 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--c1)' }}>Convidar chatter</span>
          <button
            type="button"
            onClick={onFechar}
            disabled={enviando}
            aria-label="Fechar"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              fontSize: 13,
              cursor: enviando ? 'default' : 'pointer',
              padding: 2,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Nome</span>
            <input
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Como a pessoa aparece no app"
              autoFocus
              style={campo}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>E-mail</span>
            <input
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') enviar();
              }}
              placeholder="nome@email.com"
              inputMode="email"
              type="email"
              style={campo}
            />
          </div>

          {erro ? <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{erro}</span> : null}

          <span style={{ fontSize: 9.5, color: 'var(--c2)', lineHeight: 1.5 }}>
            O Base44 manda o convite por e-mail. Quando a pessoa aceitar, ela entra como chatter.
          </span>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
            <button
              type="button"
              onClick={onFechar}
              disabled={enviando}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                background: 'transparent',
                color: 'var(--c3)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                cursor: enviando ? 'default' : 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 16%, transparent)',
                color: 'var(--c1)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: enviando ? 'default' : 'pointer',
                opacity: enviando ? 0.7 : 1,
              }}
            >
              {enviando ? 'Enviando…' : 'Enviar convite'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
