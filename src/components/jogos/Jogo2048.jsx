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

export default function Jogo2048({
  valores,
  geral,
  recorde,
  partida,
  aoRecorde,
  aoPartida,
  aoMudar,
  aoVoltar,
  aoRestaurar,
  aoApagarRecordes,
}) {
  const n = valores.tamanho;
  const meta = valores.meta;

  /* A partida salva so vale se for do mesmo tamanho de tabuleiro: um 4x4 nao
     pode aparecer num 6x6. */
  const partidaSalva = partida && partida.celulas?.length === n * n ? partida : null;

  const [celulas, setCelulas] = useState(() =>
    partidaSalva ? partidaSalva.celulas : comecar(n)
  );
  const [pontos, setPontos] = useState(() => (partidaSalva ? partidaSalva.pontos : 0));
  const [fim, setFim] = useState(null);
  const [metaBatida, setMetaBatida] = useState(() =>
    Boolean(partidaSalva && partidaSalva.celulas.some((valor) => valor >= meta))
  );
  const [painel, setPainel] = useState(false);
  const tabuleiro = useRef(null);

  /* O tabuleiro que vale fica na ref: salvar e desenhar nao esperam o setState. */
  const celulasRef = useRef(celulas);
  const pontosRef = useRef(pontos);
  const recordeRef = useRef(recorde);
  recordeRef.current = recorde;

  const relogioSalvar = useRef(null);
  const partidaPendente = useRef(null);
  const jaMontou = useRef(false);

  const gravarAgora = useCallback(() => {
    if (relogioSalvar.current) {
      clearTimeout(relogioSalvar.current);
      relogioSalvar.current = null;
    }
    const pendente = partidaPendente.current;
    partidaPendente.current = null;
    if (pendente) aoPartida?.(pendente);
  }, [aoPartida]);

  /* Cada jogada agenda a gravacao; a conta recebe uma escrita a cada 2,5s em
     vez de uma por tecla. */
  const agendarPartida = useCallback(
    (novoTabuleiro, novosPontos) => {
      partidaPendente.current = {
        celulas: novoTabuleiro,
        pontos: novosPontos,
        atualizado: Date.now(),
      };
      if (relogioSalvar.current) return;
      relogioSalvar.current = setTimeout(() => {
        relogioSalvar.current = null;
        gravarAgora();
      }, 2500);
    },
    [gravarAgora]
  );

  const esquecerPartida = useCallback(() => {
    if (relogioSalvar.current) {
      clearTimeout(relogioSalvar.current);
      relogioSalvar.current = null;
    }
    partidaPendente.current = null;
    aoPartida?.(null);
  }, [aoPartida]);

  const reiniciar = useCallback(() => {
    const nova = comecar(n);
    celulasRef.current = nova;
    pontosRef.current = 0;
    setCelulas(nova);
    setPontos(0);
    setFim(null);
    setMetaBatida(false);
    esquecerPartida();
  }, [esquecerPartida, n]);

  /* Trocar o tamanho no painel abre a partida salva daquele tamanho (ou uma
     nova, se nao houver). Mudar a meta nao reinicia nada. */
  useEffect(() => {
    if (!jaMontou.current) {
      jaMontou.current = true;
      return;
    }
    setFim(null);
    if (partidaSalva) {
      celulasRef.current = partidaSalva.celulas;
      pontosRef.current = partidaSalva.pontos;
      setCelulas(partidaSalva.celulas);
      setPontos(partidaSalva.pontos);
      setMetaBatida(partidaSalva.celulas.some((valor) => valor >= meta));
      return;
    }
    const nova = comecar(n);
    celulasRef.current = nova;
    pontosRef.current = 0;
    setCelulas(nova);
    setPontos(0);
    setMetaBatida(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  /* As funcoes que vem de fora trocam de identidade a cada render da janela:
     a ref guarda sempre a mais nova para o fechamento usar a certa. */
  const gravacaoRef = useRef(gravarAgora);
  gravacaoRef.current = gravarAgora;
  const registroRef = useRef(aoRecorde);
  registroRef.current = aoRecorde;

  /* Fechar a janela (ou trocar de aba no celular) grava o que estava rolando:
     a partida volta quando a pessoa voltar, em qualquer aparelho. */
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') gravacaoRef.current?.();
    };
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder);
      const valor = pontosRef.current;
      const atual = recordeRef.current;
      if (valor > 0 && (atual == null || valor > atual)) registroRef.current?.(valor);
      gravacaoRef.current?.();
    };
  }, []);

  const jogar = useCallback(
    (direcao) => {
      if (fim || painel) return;
      const anteriores = celulasRef.current;
      const { celulas: proximas, ganho, mudou } = mover(anteriores, n, direcao);
      if (!mudou) return;

      const comNova = plantar(proximas);
      const total = pontosRef.current + ganho;
      celulasRef.current = comNova;
      pontosRef.current = total;
      setCelulas(comNova);
      setPontos(total);

      /* Chegar na meta nao para o jogo: so avisa uma vez e segue somando. */
      if (Math.max(...comNova) >= meta && !metaBatida) {
        setMetaBatida(true);
        aoRecorde?.(total);
      }

      if (!temJogada(comNova, n)) {
        setFim('derrota');
        aoRecorde?.(total);
        esquecerPartida();
        return;
      }

      agendarPartida(comNova, total);
    },
    [agendarPartida, aoRecorde, esquecerPartida, fim, meta, metaBatida, n, painel]
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

  /* Fonte presa a grade: o bloco nunca muda de tamanho, so o numero encolhe
     quando ganha mais digitos. */
  const fonteCasa = (valor) => {
    const base = n >= 6 ? 14 : n === 5 ? 16 : n === 4 ? 20 : 23;
    const digitos = String(valor || 0).length;
    const fator = digitos >= 5 ? 0.6 : digitos === 4 ? 0.74 : digitos === 3 ? 0.9 : 1;
    return Math.round(base * fator);
  };

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
            nota="Cada tamanho de tabuleiro tem o seu proprio recorde. A partida em andamento volta quando voce reabrir, em qualquer aparelho."
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
            {metaBatida ? `meta ${meta} batida` : `meta ${meta}`}
          </span>
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <div
            ref={tabuleiro}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`,
              gap: 6,
              width: 'min(100%, 380px)',
              aspectRatio: '1 / 1',
              padding: 6,
              minHeight: 0,
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
                  minWidth: 0,
                  minHeight: 0,
                  overflow: 'hidden',
                  padding: 0,
                  lineHeight: 1,
                  borderRadius: 8,
                  fontFamily: 'var(--font-main)',
                  fontSize: fonteCasa(valor),
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
              tom="normal"
              titulo="Sem jogadas"
              texto={`${pontos} pontos nesta partida.`}
              acoes={[
                <BotaoVidro key="novo" tom="principal" onClick={reiniciar}>
                  De novo
                </BotaoVidro>,
              ]}
            />
          ) : null}
        </div>

        {metaBatida && !fim ? (
          <div
            style={{
              fontFamily: 'var(--font-main)',
              fontSize: 11,
              color: dourado(72),
              textAlign: 'center',
            }}
          >
            Chegou em {meta}! O jogo continua, some o quanto quiser.
          </div>
        ) : null}

        {geral.direcional ? (
          <div style={{ marginTop: 'auto' }}>
            <DpadVidro aoDirecao={jogar} desabilitado={Boolean(fim)} />
          </div>
        ) : null}
      </div>
    </MolduraJogo>
  );
}
