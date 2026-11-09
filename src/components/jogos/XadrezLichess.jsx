import { useState } from 'react';

const dourado = (valor) => `color-mix(in srgb, var(--c1) ${valor}%, transparent)`;
const escuro = (valor) => `color-mix(in srgb, var(--c2) ${valor}%, transparent)`;

/* As três telas que o Lichess libera pra embed (lichess.org/developers).
   `bg=system` faz o tabuleiro seguir o modo claro/escuro do LynxOS. */
const MODOS = [
  {
    id: 'puzzle',
    label: 'Puzzle do dia',
    src: 'https://lichess.org/training/frame?theme=brown&bg=system',
    proporcao: '10 / 11',
    dica: 'Um problema novo por dia, resolvido direto no tabuleiro.',
    link: 'https://lichess.org/training',
  },
  {
    id: 'tv',
    label: 'TV ao vivo',
    src: 'https://lichess.org/tv/frame?theme=brown&bg=system',
    proporcao: '10 / 11',
    dica: 'As partidas mais fortes acontecendo agora no Lichess.',
    link: 'https://lichess.org/tv',
  },
  {
    id: 'analise',
    label: 'Tabuleiro de análise',
    src: 'https://lichess.org/embed/analysis?theme=brown&bg=system',
    proporcao: '4 / 3',
    dica: 'Tabuleiro livre com motor, pra estudar ou montar posição.',
    link: 'https://lichess.org/analysis',
  },
];

const botaoDiscreto = {
  height: 28,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid ${escuro(18)}`,
  background: 'transparent',
  color: 'var(--c2)',
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
};

/**
 * Xadrez com o Lichess embutido, sem chave de API.
 *
 * O embed é oficial (o Lichess publica os iframes em /developers), então não
 * depende de nada nosso pra funcionar: se um dia mudarem a URL, troca aqui.
 */
export default function XadrezLichess() {
  const [modo, setModo] = useState('puzzle');
  const [recarga, setRecarga] = useState(0);
  const atual = MODOS.find((item) => item.id === modo) || MODOS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--c1)',
            marginRight: 'auto',
          }}
        >
          Xadrez (Lichess)
        </span>
        <button
          type="button"
          onClick={() => setRecarga((valor) => valor + 1)}
          style={botaoDiscreto}
          title="Recarregar o tabuleiro"
        >
          Recarregar
        </button>
        <a
          href={atual.link}
          target="_blank"
          rel="noreferrer"
          style={{ ...botaoDiscreto, borderColor: dourado(40), color: 'var(--c1)' }}
        >
          Abrir no Lichess ↗
        </a>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MODOS.map((item) => {
          const ativo = item.id === modo;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setModo(item.id)}
              style={{
                height: 26,
                padding: '0 12px',
                borderRadius: 7,
                whiteSpace: 'nowrap',
                border: `1px solid ${ativo ? dourado(55) : 'transparent'}`,
                background: ativo ? dourado(18) : 'transparent',
                color: ativo ? 'var(--c1)' : 'var(--c2)',
                fontFamily: 'var(--font-main)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <span style={{ fontSize: 10.5, color: escuro(70), lineHeight: 1.5 }}>{atual.dica}</span>

      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${escuro(14)}`,
          background: `color-mix(in srgb, var(--c8) 62%, transparent)`,
          padding: 8,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <iframe
          key={`${atual.id}-${recarga}`}
          src={atual.src}
          title={`Lichess — ${atual.label}`}
          frameBorder="0"
          style={{
            width: '100%',
            maxWidth: atual.id === 'analise' ? 520 : 420,
            aspectRatio: atual.proporcao,
            border: 'none',
            borderRadius: 10,
            display: 'block',
          }}
        />
      </div>

      <span style={{ fontSize: 10, color: escuro(55), lineHeight: 1.5 }}>
        Embed oficial do lichess.org, sem chave de API e sem cadastro pra jogar o puzzle.
        Pra jogar contra alguém, abra o Lichess e crie um desafio de amigo.
      </span>
    </div>
  );
}
