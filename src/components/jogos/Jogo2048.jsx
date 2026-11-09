import { useCallback, useEffect, useRef, useState } from 'react';
import { BotaoVidro, MolduraJogo, PainelConfig, dourado, escuro } from '@/components/jogos/EstruturaJogo';
import { AvisoJogo, DpadVidro, useSwipe, useTeclado } from '@/components/jogos/ControlesJogo';

/**
 * 2048: some numeros iguais ate chegar na meta.
 *
 * Tabuleiro de 3x3 a 6x6 (o 4x4 classico e o padrao). Cada tamanho tem o seu
 * recorde, porque um 6x6 da muito mais espaco para pontuar que um 3x3.
 */

const vazio = (n) => Array.from({ length: n * n }, () => 0);

const casaLivre = (celulas) => {
  const livres = celulas.reduce((lista, valor, indice) => (valor === 0 ? [...lista, indice] : lista), []);
  if (!livres.length) return null;
  return livres[Math.floor(Math.random() * livres.length)];
};

const plantar = (celulas) => {
  const indice = casaLivre(celulas);
  if (indice == null) return celulas;
  const proximas = [...celulas];
  proximas[indice] = Math.random() < 0.9 ? 2 : 4;
  return proximas;
};

const comecar = (n) => plantar(plantar(vazio(n)));

/** Junta uma linha na direcao da esquerda (as outras direcoes reusam isso). */
const juntar = (valores) => {
  const numeros = valores.filter(Boolean);
  const saida = [];
  let ganho = 0;
  for (let i = 0; i < numeros.length; i += 1) {
    if (numeros[i] === numeros[i + 1]) {
      const dobrado = numeros[i] * 2;
      saida.push(dobrado);
      ganho += dobrado;
      i += 1;
    } else {
      saida.push(numeros[i]);
    }
  }
  while (saida.length < valores.length) saida.push(0);
  return { linha: saida, ganho };
};

const indicesDaLinha = (i, n, direcao) => {
  const linha = Array.from({ length: n }, (_, k) => i * n + k);
  const coluna = Array.from({ length: n }, (_, k) => k * n + i);
  if (direcao === 'esquerda') return linha;
  if (direcao === 'direita') return [...linha].reverse();
  if (direcao === 'cima') return coluna;
  return [...coluna].reverse();
};

const mover = (celulas, n, direcao) => {
  const saida = [...celulas];
  let ganho = 0;
  let mudou = false;
  for (let i = 0; i < n; i += 1) {
    const indices = indicesDaLinha(i, n, direcao);
    const { linha, ganho: soma } = juntar(indices.map((indice) => celulas[indice]));
    ganho += soma;
    indices.forEach((indice, k) => {
      if (saida[indice] !== linha[k]) mudou = true;
      saida[indice] = linha[k];
    });
  }
  return { celulas: saida, ganho, mudou };
};

const temJogada = (celulas, n) =>
  celulas.some((valor) => valor === 0) ||
  ['esquerda', 'direita', 'cima', 'baixo'].some((direcao) => mover(celulas, n, direcao).mudou);

const brilho = (valor) => {
  const nivel = Math.log2(valor || 1);
  return Math.min(64, 9 + nivel * 7);
};

const estiloCasa = (valor, n) => {
  if (!valor) {
    return {
      background: `color-mix(in srgb, var(--c2) 7%, transparent)`,
      color: 'transparent',
      border: `1px solid ${escuro(8)}`,
    };
  }
  const forte = Math.log2(valor) >= 7;
  return {
    background: `color-mix(in srgb, var(--c1) ${brilho(valor)}%, transparent)`,
    border: `1px solid ${dourado(valor >= 128 ? 62 : 22)}`,
    color: forte ? 'var(--c8)' : 'var(--c3)',
    fontWeight: 800,
  };
};

export default function Jogo2048({ valores, geral, recorde, aoRecorde, aoMudar, aoVoltar, aoRestaurar, aoApagarRecordes }) {
  const n = valores.tamanho;
  const meta = valores.meta;

  const [celulas, setCelulas] = useState(() => comecar(n));
  const [pontos, setPontos] = useState(0);
  const [fim, setFim] = useState(null);
  const [metaBatida, setMetaBatida] = useState(false);
  const [painel, setPainel] = useState(false);
  const tabuleiro = useRef(null);

  /* Recorde da partida que esta rolando: se a pessoa fechar a janela no meio,
     o que ela fez ainda conta. */
  const pontosRef = useRef(0);
  pontosRef.current = pontos;
  const recordeRef = useRef(recorde);
  recordeRef.current = recorde;

  const reiniciar = useCallback(() => {
    setCelulas(comecar(n));
    setPontos(0);
    setFim(null);
    setMetaBatida(false);
  }, [n]);

  /* Trocar o tamanho no painel comeca uma partida nova. */
  useEffect(() => {
    reiniciar();
  }, [n, meta, reiniciar]);

  useEffect(
    () => () => {
      const valor = pontosRef.current;
      const atual = recordeRef.current;
      if (valor > 0 && (atual == null || valor > atual)) aoRecorde?.(valor);
    },
    [aoRecorde]
  );

  const jogar = useCallback(
    (direcao) => {
      if (fim || painel) return;
      setCelulas((anteriores) => {
        const { celulas: proximas, ganho, mudou } = mover(anteriores, n, direcao);
        if (!mudou) return anteriores;

        const comNova = plantar(proximas);
        const total = pontos + ganho;
        setPontos(total);

        const maior = Math.max(...comNova);
        if (maior >= meta && !metaBatida) {
          setMetaBatida(true);
          setFim('vitoria');
          aoRecorde?.(total);
        } else if (!temJogada(comNova, n)) {
          setFim('derrota');
          aoRecorde?.(total);
        }
        return comNova;
      });
    },
    [aoRecorde, fim, meta, metaBatida, n, painel, pontos]
  );

  useTeclado(
    {
      ArrowLeft: () => jogar('esquerda'),
      ArrowRight: () => jogar('direita'),
      ArrowUp: () => jogar('cima'),
      ArrowDown: () => jogar('baixo'),
      a: () => jogar('esquerda'),
      d: () => jogar('direita'),
      w: () => jogar('cima'),
      s: () => jogar('baixo'),
    },
    !painel
  );
  useSwipe(tabuleiro, jogar, !painel);

  const campos = [
    {
      chave: 'tamanho',
      rotulo: 'Tabuleiro',
      tipo: 'segmentos',
      opcoes: [3, 4, 5, 6].map((valor) => ({ valor, rotulo: `${valor}x${valor}` })),
    },
    {
      chave: 'meta',
      rotulo: 'Meta',
      tipo: 'segmentos',
      opcoes: [1024, 2048, 4096, 8192].map((valor) => ({ valor, rotulo: String(valor) })),
    },
  ];

  const fonteCasa = n >= 6 ? 11 : n === 5 ? 13 : n === 4 ? 16 : 18;

  return (
    <MolduraJogo
      titulo="2048"
      aoVoltar={aoVoltar}
      recorde={recorde}
      aoAbrirConfig={() => setPainel((aberto) => !aberto)}
      configAberto={painel}
      painel={
        painel ? (
          <PainelConfig
            titulo="2048"
            campos={campos}
            valores={valores}
            aoMudar={aoMudar}
            aoFechar={() => setPainel(false)}
            aoRestaurar={aoRestaurar}
            aoApagarRecordes={aoApagarRecordes}
            nota="Cada tamanho de tabuleiro tem o seu proprio recorde."
          />
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: escuro(50) }}>
            pontos
          </span>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 18, fontWeight: 800, color: 'var(--c1)', fontVariantNumeric: 'tabular-nums' }}>
            {pontos}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 10, color: escuro(50) }}>
            meta {meta}
          </span>
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <div
            ref={tabuleiro}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${n}, 1fr)`,
              gap: 6,
              width: 'min(100%, 380px)',
              aspectRatio: '1 / 1',
              padding: 6,
              borderRadius: 12,
              border: `1px solid ${escuro(12)}`,
              background: 'color-mix(in srgb, var(--c8) 46%, transparent)',
              touchAction: 'none',
            }}
          >
            {celulas.map((valor, indice) => (
              <div
                key={indice}
                style={{
                  ...estiloCasa(valor, n),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  fontFamily: 'var(--font-main)',
                  fontSize: fonteCasa,
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'background 120ms ease, color 120ms ease',
                }}
              >
                {valor || ''}
              </div>
            ))}
          </div>

          {fim ? (
            <AvisoJogo
              tom={fim === 'vitoria' ? 'vitoria' : 'normal'}
              titulo={fim === 'vitoria' ? `Chegou em ${meta}!` : 'Sem jogadas'}
              texto={
                fim === 'vitoria'
                  ? `${pontos} pontos. Pode continuar somando ou comecar de novo.`
                  : `${pontos} pontos nesta partida.`
              }
              acoes={[
                fim === 'vitoria' ? (
                  <BotaoVidro key="seguir" onClick={() => setFim(null)}>
                    Continuar
                  </BotaoVidro>
                ) : null,
                <BotaoVidro key="novo" tom="principal" onClick={reiniciar}>
                  De novo
                </BotaoVidro>,
              ].filter(Boolean)}
            />
          ) : null}
        </div>

        {geral.direcional ? (
          <div style={{ marginTop: 'auto' }}>
            <DpadVidro aoDirecao={jogar} desabilitado={Boolean(fim)} />
          </div>
        ) : null}
      </div>
    </MolduraJogo>
  );
}
