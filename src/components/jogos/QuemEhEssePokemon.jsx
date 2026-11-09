import { useCallback, useEffect, useState } from 'react';
import { carregarPokemons, sortearRodada, spriteDoPokemon } from '@/lib/pokemon';

/* Recorde fica no aparelho: é brincadeira de pausa, não precisa de entidade. */
const CHAVE_RECORDE = 'lynx:pokemon-recorde';

const dourado = (valor) => `color-mix(in srgb, var(--c1) ${valor}%, transparent)`;
const escuro = (valor) => `color-mix(in srgb, var(--c2) ${valor}%, transparent)`;

const lerRecorde = () => {
  try {
    const salvo = Number(window.localStorage.getItem(CHAVE_RECORDE));
    return Number.isFinite(salvo) ? salvo : 0;
  } catch {
    return 0;
  }
};

const gravarRecorde = (valor) => {
  try {
    window.localStorage.setItem(CHAVE_RECORDE, String(valor));
  } catch {
    /* sem armazenamento o recorde só não persiste */
  }
};

const contadorStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  padding: '6px 12px',
  borderRadius: 10,
  border: `1px solid ${escuro(14)}`,
  background: `color-mix(in srgb, var(--c8) 52%, transparent)`,
  minWidth: 62,
};

const numeroStyle = { fontSize: 15, fontWeight: 700, color: 'var(--c3)', lineHeight: 1 };
const rotuloStyle = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: escuro(70),
};

/**
 * Quem é esse Pokémon? — rodada com silhueta e quatro nomes.
 *
 * As imagens e os nomes vêm da PokeAPI (lib/pokemon.js). A silhueta é a
 * própria arte oficial com brightness(0); ao responder a cor volta e o nome
 * aparece. Teclado: 1-4 responde, Enter/Space vai pra próxima.
 */
export default function QuemEhEssePokemon() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [rodada, setRodada] = useState(null);
  const [escolha, setEscolha] = useState(null);
  const [arteFalhou, setArteFalhou] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);
  const [sequencia, setSequencia] = useState(0);
  const [recorde, setRecorde] = useState(lerRecorde);

  useEffect(() => {
    let vivo = true;
    setErro('');
    carregarPokemons()
      .then((pokemons) => {
        if (vivo) setLista(pokemons);
      })
      .catch(() => {
        if (vivo) setErro('Não consegui falar com a PokeAPI agora. Tenta de novo em instantes.');
      });
    return () => {
      vivo = false;
    };
  }, [tentativa]);

  const novaRodada = useCallback(() => {
    if (!lista?.length) return;
    setRodada((atual) => sortearRodada(lista, atual?.alvo || null));
    setEscolha(null);
    setArteFalhou(false);
  }, [lista]);

  useEffect(() => {
    if (lista?.length) novaRodada();
  }, [lista, novaRodada]);

  const responder = useCallback(
    (nome) => {
      if (!rodada || escolha) return;
      setEscolha(nome);
      if (nome === rodada.alvo.nome) {
        setAcertos((valor) => valor + 1);
        const nova = sequencia + 1;
        setSequencia(nova);
        if (nova > recorde) {
          setRecorde(nova);
          gravarRecorde(nova);
        }
      } else {
        setErros((valor) => valor + 1);
        setSequencia(0);
      }
    },
    [rodada, escolha, sequencia, recorde]
  );

  /* Atalhos só quando o foco não está num campo: chat e formulários seguem
     funcionando com o jogo aberto. */
  useEffect(() => {
    const aoTeclar = (evento) => {
      const alvo = evento.target;
      const digitando =
        alvo instanceof HTMLElement &&
        (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName));
      if (digitando || !rodada) return;
      const numero = Number(evento.key);
      if (Number.isInteger(numero) && numero >= 1 && numero <= rodada.opcoes.length) {
        evento.preventDefault();
        responder(rodada.opcoes[numero - 1].nome);
        return;
      }
      if (escolha && (evento.key === 'Enter' || evento.key === ' ')) {
        evento.preventDefault();
        novaRodada();
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [rodada, escolha, responder, novaRodada]);

  if (erro) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: 'var(--erro)' }}>{erro}</span>
        <button
          type="button"
          onClick={() => setTentativa((valor) => valor + 1)}
          style={{
            height: 30,
            padding: '0 14px',
            borderRadius: 8,
            border: `1px solid ${dourado(55)}`,
            background: dourado(18),
            color: 'var(--c1)',
            fontFamily: 'var(--font-main)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!rodada) {
    return (
      <span style={{ fontSize: 11.5, color: escuro(75) }}>Carregando os Pokémon...</span>
    );
  }

  const acertou = escolha === rodada.alvo.nome;
  const revelado = Boolean(escolha);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          Quem é esse Pokémon?
        </span>
        <div style={contadorStyle}>
          <span style={numeroStyle}>{acertos}</span>
          <span style={rotuloStyle}>Acertos</span>
        </div>
        <div style={contadorStyle}>
          <span style={numeroStyle}>{erros}</span>
          <span style={rotuloStyle}>Erros</span>
        </div>
        <div style={contadorStyle}>
          <span style={{ ...numeroStyle, color: sequencia ? 'var(--c1)' : 'var(--c3)' }}>
            {sequencia}
          </span>
          <span style={rotuloStyle}>Sequência</span>
        </div>
        <div style={contadorStyle}>
          <span style={numeroStyle}>{recorde}</span>
          <span style={rotuloStyle}>Recorde</span>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          border: `1px solid ${revelado ? dourado(38) : escuro(12)}`,
          background:
            'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--c8) 40%, transparent) 0%, color-mix(in srgb, var(--c8) 78%, transparent) 72%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '18px 16px',
          minHeight: 240,
          transition: 'border-color 280ms ease',
        }}
      >
        <img
          key={`${rodada.alvo.id}-${arteFalhou ? 'p' : 'a'}`}
          src={spriteDoPokemon(rodada.alvo.id, !arteFalhou)}
          alt={revelado ? rodada.alvo.nome : 'Silhueta de um Pokémon'}
          onError={() => setArteFalhou(true)}
          draggable={false}
          style={{
            width: 190,
            height: 190,
            objectFit: 'contain',
            filter: revelado
              ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.45))'
              : 'brightness(0) drop-shadow(0 6px 16px rgba(0,0,0,0.5))',
            transform: revelado ? 'scale(1)' : 'scale(0.96)',
            transition: 'filter 320ms ease, transform 320ms ease',
            userSelect: 'none',
          }}
        />
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: escuro(55),
            minHeight: 14,
          }}
        >
          {revelado ? `Nº ${String(rodada.alvo.id).padStart(3, '0')}` : 'Geração 1'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 8,
        }}
      >
        {rodada.opcoes.map((opcao, indice) => {
          const escolhida = escolha === opcao.nome;
          const eACorreta = opcao.nome === rodada.alvo.nome;
          const mostrarCerta = revelado && eACorreta;
          const mostrarErrada = escolhida && !eACorreta;
          return (
            <button
              key={opcao.id}
              type="button"
              onClick={() => responder(opcao.nome)}
              disabled={revelado}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 10,
                textAlign: 'left',
                fontFamily: 'var(--font-main)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: revelado ? 'default' : 'pointer',
                border: `1px solid ${
                  mostrarCerta
                    ? 'color-mix(in srgb, var(--ok) 60%, transparent)'
                    : mostrarErrada
                      ? 'color-mix(in srgb, var(--erro) 60%, transparent)'
                      : escuro(16)
                }`,
                background: mostrarCerta
                  ? 'color-mix(in srgb, var(--ok) 16%, transparent)'
                  : mostrarErrada
                    ? 'color-mix(in srgb, var(--erro) 14%, transparent)'
                    : `color-mix(in srgb, var(--c8) 52%, transparent)`,
                color: mostrarCerta
                  ? 'var(--ok)'
                  : mostrarErrada
                    ? 'var(--erro)'
                    : 'var(--c3)',
                opacity: revelado && !mostrarCerta && !mostrarErrada ? 0.5 : 1,
                transition: 'border-color 200ms ease, background-color 200ms ease, opacity 200ms ease',
              }}
            >
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: escuro(55),
                  border: `1px solid ${escuro(18)}`,
                  borderRadius: 5,
                  padding: '1px 5px',
                  flexShrink: 0,
                }}
              >
                {indice + 1}
              </span>
              {opcao.nome}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: revelado ? (acertou ? 'var(--ok)' : 'var(--erro)') : escuro(70),
          }}
        >
          {revelado
            ? acertou
              ? `Acertou! É o ${rodada.alvo.nome}.`
              : `Era o ${rodada.alvo.nome}.`
            : 'Escolha o nome certo (teclas 1 a 4).'}
        </span>
        {revelado ? (
          <button
            type="button"
            onClick={novaRodada}
            autoFocus
            style={{
              marginLeft: 'auto',
              height: 30,
              padding: '0 16px',
              borderRadius: 8,
              border: `1px solid ${dourado(55)}`,
              background: dourado(18),
              color: 'var(--c1)',
              fontFamily: 'var(--font-main)',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Próximo (Enter)
          </button>
        ) : null}
      </div>
    </div>
  );
}
