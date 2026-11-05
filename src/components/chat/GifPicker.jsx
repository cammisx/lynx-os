import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/chat/chatIcons';
import { buscarGifs, chaveGiphy, guardarChaveGiphy } from '@/lib/giphy';

/** Painel de GIFs em vidro: busca no Giphy e manda o escolhido na hora. */
export default function GifPicker({ onEscolher, onFechar }) {
  const [termo, setTermo] = useState('');
  const [gifs, setGifs] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [chave, setChave] = useState(() => chaveGiphy());
  const caixaRef = useRef(null);
  const buscaRef = useRef(0);

  const buscar = async (texto) => {
    const pedido = buscaRef.current + 1;
    buscaRef.current = pedido;
    setCarregando(true);
    setErro('');
    try {
      const lista = await buscarGifs(texto);
      if (buscaRef.current !== pedido) return;
      setGifs(lista);
    } catch (falha) {
      if (buscaRef.current !== pedido) return;
      setGifs([]);
      if (falha?.code === 'sem-chave') setErro('sem-chave');
      else if (falha?.code === 'chave-invalida') setErro('chave-invalida');
      else setErro('falha');
    } finally {
      if (buscaRef.current === pedido) setCarregando(false);
    }
  };

  useEffect(() => {
    if (chave) buscar('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  useEffect(() => {
    const fora = (evento) => {
      if (!caixaRef.current?.contains(evento.target)) onFechar();
    };
    const tecla = (evento) => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [onFechar]);

  useEffect(() => {
    if (!chave) return undefined;
    const espera = setTimeout(() => buscar(termo), 420);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo, chave]);

  const salvarChave = () => {
    const limpa = guardarChaveGiphy(chave);
    setChave(limpa);
    if (!limpa) setErro('sem-chave');
  };

  return (
    <div
      ref={caixaRef}
      style={{
        position: 'absolute',
        right: 8,
        bottom: 50,
        width: 300,
        height: 324,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--c1) 26%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 94%, transparent)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 14px 38px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        zIndex: 40,
        fontFamily: 'var(--font-main)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 8px',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: '0.08em',
            fontWeight: 700,
            color: 'var(--c1)',
          }}
        >
          GIF
        </span>
        <input
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') buscar(termo);
          }}
          placeholder="Procurar no Giphy"
          style={{
            flex: 1,
            minWidth: 0,
            height: 24,
            padding: '0 8px',
            borderRadius: 7,
            border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
            background: 'color-mix(in srgb, var(--c8) 70%, transparent)',
            color: 'var(--c3)',
            fontSize: 10.5,
            fontFamily: 'var(--font-main)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar GIFs"
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--c2)',
            cursor: 'pointer',
          }}
        >
          <CloseIcon size={12} />
        </button>
      </div>

      <div className="glass-scroll" style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {(erro === 'sem-chave' || erro === 'chave-invalida') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 10.5, color: 'var(--c2)', lineHeight: 1.6 }}>
              {erro === 'chave-invalida'
                ? 'O Giphy recusou a chave salva. Cole outra para continuar.'
                : 'Falta a chave do Giphy. É gratuita e leva um minuto:'}
            </p>
            <a
              href="https://developers.giphy.com/dashboard/"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 10, color: 'var(--c1)' }}
            >
              developers.giphy.com/dashboard
            </a>
            <input
              value={chave}
              onChange={(evento) => setChave(evento.target.value)}
              placeholder="Cole a API key aqui"
              style={{
                height: 26,
                padding: '0 8px',
                borderRadius: 7,
                border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 70%, transparent)',
                color: 'var(--c3)',
                fontSize: 10.5,
                fontFamily: 'var(--font-main)',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={salvarChave}
              style={{
                height: 26,
                borderRadius: 7,
                border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 18%, transparent)',
                color: 'var(--c1)',
                fontSize: 10.5,
                fontWeight: 700,
                fontFamily: 'var(--font-main)',
                cursor: 'pointer',
              }}
            >
              Usar esta chave
            </button>
          </div>
        )}

        {erro === 'falha' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 10.5, color: 'var(--c2)' }}>
              Não consegui falar com o Giphy agora.
            </p>
            <button
              type="button"
              onClick={() => buscar(termo)}
              style={{
                height: 26,
                borderRadius: 7,
                border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
                background: 'transparent',
                color: 'var(--c2)',
                fontSize: 10.5,
                fontWeight: 600,
                fontFamily: 'var(--font-main)',
                cursor: 'pointer',
              }}
            >
              Tentar de novo
            </button>
          </div>
        )}

        {!erro && carregando && gifs.length === 0 && (
          <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.7 }}>Procurando…</span>
        )}

        {!erro && !carregando && gifs.length === 0 && (
          <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.7 }}>
            Nenhum GIF para “{termo}”.
          </span>
        )}

        {!erro && gifs.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
            }}
          >
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onEscolher(gif)}
                title={gif.titulo}
                style={{
                  padding: 0,
                  border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
                  borderRadius: 8,
                  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  lineHeight: 0,
                }}
              >
                <img
                  src={gif.previa}
                  alt={gif.titulo}
                  loading="lazy"
                  style={{ display: 'block', width: '100%', height: 92, objectFit: 'cover' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
