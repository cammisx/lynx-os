import { useCallback, useEffect, useRef } from 'react';
import { dourado, escuro } from '@/components/jogos/EstruturaJogo';

/**
 * Controles dos jogos.
 *
 * O LynxOS roda no celular tambem, e la nao existe teclado: por isso todo jogo
 * aceita setas do teclado, deslize (swipe) no tabuleiro e um direcional de
 * vidro. O direcional pode ser escondido nas configuracoes para quem prefere
 * so deslizar.
 */

const vidro = (valor = 52) => `color-mix(in srgb, var(--c8) ${valor}%, transparent)`;

/** Teclas: cada jogo diz o que cada tecla faz e se esta ouvindo agora. */
export function useTeclado(mapa, ativo = true) {
  const ref = useRef(mapa);
  ref.current = mapa;

  useEffect(() => {
    if (!ativo) return undefined;
    const aoTeclar = (evento) => {
      const alvo = evento.target;
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return;
      const acao = ref.current?.[evento.key];
      if (!acao) return;
      /* Setas e espaco rolam a janela: no jogo elas so jogam. */
      evento.preventDefault();
      acao(evento);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [ativo]);
}

const DIRECOES = { cima: 'cima', baixo: 'baixo', esquerda: 'esquerda', direita: 'direita' };

/**
 * Deslize no elemento. Usa pointer events, entao vale para dedo e para o mouse
 * arrastando, e nao rouba o clique normal (o limiar corta movimentos curtos).
 */
export function useSwipe(alvoRef, aoDirecao, ativo = true) {
  const inicio = useRef(null);
  const callback = useRef(aoDirecao);
  callback.current = aoDirecao;

  useEffect(() => {
    const alvo = alvoRef.current;
    if (!alvo || !ativo) return undefined;

    const comecar = (evento) => {
      inicio.current = { x: evento.clientX, y: evento.clientY, id: evento.pointerId };
    };
    const terminar = (evento) => {
      const partida = inicio.current;
      inicio.current = null;
      if (!partida) return;
      const dx = evento.clientX - partida.x;
      const dy = evento.clientY - partida.y;
      const limiar = 22;
      if (Math.abs(dx) < limiar && Math.abs(dy) < limiar) return;
      if (Math.abs(dx) > Math.abs(dy)) callback.current(dx > 0 ? 'direita' : 'esquerda');
      else callback.current(dy > 0 ? 'baixo' : 'cima');
    };

    alvo.addEventListener('pointerdown', comecar);
    alvo.addEventListener('pointerup', terminar);
    alvo.addEventListener('pointercancel', () => {
      inicio.current = null;
    });
    alvo.addEventListener('touchmove', (evento) => evento.preventDefault(), { passive: false });
    return () => {
      alvo.removeEventListener('pointerdown', comecar);
      alvo.removeEventListener('pointerup', terminar);
    };
  }, [alvoRef, ativo]);
}

/** Pausa quando a aba perde o foco, para ninguem morrer no snake do nada. */
export function usePausaFora(aoPausar, ativo = true) {
  const callback = useRef(aoPausar);
  callback.current = aoPausar;

  useEffect(() => {
    if (!ativo) return undefined;
    const esconder = () => {
      if (document.hidden) callback.current?.(true);
    };
    const sair = () => callback.current?.(true);
    document.addEventListener('visibilitychange', esconder);
    window.addEventListener('blur', sair);
    return () => {
      document.removeEventListener('visibilitychange', esconder);
      window.removeEventListener('blur', sair);
    };
  }, [ativo]);
}

const seta = (rotacao) => (
  <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${rotacao}deg)` }}>
    <path d="M12 5l7 8H5l7-8z" fill="currentColor" />
  </svg>
);

const teclaDpad = {
  width: 44,
  height: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  border: `1px solid ${dourado(26)}`,
  background: vidro(58),
  backdropFilter: 'blur(10px)',
  color: 'var(--c1)',
  touchAction: 'none',
  cursor: 'pointer',
  boxShadow: '0 8px 20px color-mix(in srgb, #000 35%, transparent)',
};

/**
 * Direcional de vidro. `aoAcao` desenha um botao redondo ao lado (girar peca,
 * bandeira, pausa) porque cada jogo tem a sua tecla de acao.
 */
export function DpadVidro({ aoDirecao, aoAcao, rotuloAcao, desabilitado = false, style }) {
  const apertar = useCallback(
    (direcao) => (evento) => {
      evento.preventDefault();
      if (!desabilitado) aoDirecao?.(direcao);
    },
    [aoDirecao, desabilitado]
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: '4px 0 2px',
        ...style,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 44px)',
          gridTemplateRows: 'repeat(3, 44px)',
          gap: 4,
          opacity: desabilitado ? 0.45 : 1,
        }}
      >
        <span />
        <button type="button" style={teclaDpad} onPointerDown={apertar(DIRECOES.cima)} aria-label="Cima">
          {seta(0)}
        </button>
        <span />
        <button type="button" style={teclaDpad} onPointerDown={apertar(DIRECOES.esquerda)} aria-label="Esquerda">
          {seta(-90)}
        </button>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            border: `1px solid ${escuro(12)}`,
            background: vidro(30),
            color: escuro(40),
            fontSize: 9,
            fontFamily: 'var(--font-main)',
            fontWeight: 700,
          }}
        >
          {desabilitado ? '·' : 'jogar'}
        </span>
        <button type="button" style={teclaDpad} onPointerDown={apertar(DIRECOES.direita)} aria-label="Direita">
          {seta(90)}
        </button>
        <span />
        <button type="button" style={teclaDpad} onPointerDown={apertar(DIRECOES.baixo)} aria-label="Baixo">
          {seta(180)}
        </button>
        <span />
      </div>

      {aoAcao ? (
        <button
          type="button"
          onPointerDown={(evento) => {
            evento.preventDefault();
            aoAcao();
          }}
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            border: `1px solid ${dourado(40)}`,
            background: dourado(16),
            backdropFilter: 'blur(10px)',
            color: 'var(--c1)',
            fontFamily: 'var(--font-main)',
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            touchAction: 'none',
            cursor: 'pointer',
          }}
        >
          {rotuloAcao || 'acao'}
        </button>
      ) : null}
    </div>
  );
}

/** Aviso curto em vidro, usado para "pausado" e "fim de jogo". */
export function AvisoJogo({ titulo, texto, acoes = [], tom = 'normal' }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 18,
        borderRadius: 12,
        background: 'color-mix(in srgb, #05060a 58%, transparent)',
        backdropFilter: 'blur(6px)',
        textAlign: 'center',
        zIndex: 4,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-main)',
          fontSize: 15,
          fontWeight: 800,
          color: tom === 'vitoria' ? 'var(--c1)' : 'var(--c3)',
        }}
      >
        {titulo}
      </span>
      {texto ? (
        <span style={{ fontFamily: 'var(--font-main)', fontSize: 11, color: escuro(65), maxWidth: 260, lineHeight: 1.6 }}>
          {texto}
        </span>
      ) : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>{acoes}</div>
    </div>
  );
}
