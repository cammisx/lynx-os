import { useCallback, useEffect, useRef, useState } from 'react';
import { BotaoVidro, MolduraJogo, PainelConfig, dourado, escuro } from '@/components/jogos/EstruturaJogo';
import { AvisoJogo, DpadVidro, useSwipe, useTeclado } from '@/components/jogos/ControlesJogo';
import {
  INSTRUCAO_SEXTING,
  nomeDoPasso,
  rotuloDoBloco,
  sortearFrase,
  temFrase,
} from '@/components/jogos/sextingTextos';

/**
 * SEXTING (o 2048 da casa): junte dois passos iguais e suba a sequencia.
 *
 * Tabuleiro de 3x3 a 6x6 (o 4x4 classico e o padrao). Cada tamanho tem o seu
 * recorde, porque um 6x6 da muito mais espaco para pontuar que um 3x3. Nao
 * existe meta: depois da Chamada (8192) a partida segue somando pontos.
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

  /* A partida salva so vale se for do mesmo tamanho de tabuleiro: um 4x4 nao
     pode aparecer num 6x6. */
  const partidaSalva = partida && partida.celulas?.length === n * n ? partida : null;

  const [celulas, setCelulas] = useState(() =>
    partidaSalva ? partidaSalva.celulas : comecar(n)
  );
  const [pontos, setPontos] = useState(() => (partidaSalva ? partidaSalva.pontos : 0));
  const [fim, setFim] = useState(null);
  const [painel, setPainel] = useState(false);
  const [balao, setBalao] = useState(null);
  const tabuleiro = useRef(null);

  /* O tabuleiro que vale fica na ref: salvar e desenhar nao esperam o setState. */
  const celulasRef = useRef(celulas);
  const pontosRef = useRef(pontos);
  const recordeRef = useRef(recorde);
  recordeRef.current = recorde;

  const relogioSalvar = useRef(null);
  const partidaPendente = useRef(null);
  const jaMontou = useRef(false);

  /* Passos que ja mandaram recado nesta partida: cada fala aparece so na
     primeira vez. Partida retomada ja nasce com o que esta no tabuleiro. */
  const anunciados = useRef(new Set());
  const ultimaFrase = useRef(null);
  const relogioBalao = useRef(null);

  const marcarAnunciados = useCallback((tab) => {
    anunciados.current = new Set(tab.filter((valor) => temFrase(valor)));
  }, []);

  useEffect(() => {
    if (partidaSalva) marcarAnunciados(partidaSalva.celulas);
  }, [marcarAnunciados, partidaSalva]);

  const mostrarBalao = useCallback((valor) => {
    const frase = sortearFrase(valor, ultimaFrase.current);
    if (!frase) return;
    ultimaFrase.current = frase;
    anunciados.current.add(valor);
    setBalao({ valor, frase });
    if (relogioBalao.current) clearTimeout(relogioBalao.current);
    relogioBalao.current = setTimeout(() => setBalao(null), 9000);
  }, []);

  useEffect(
    () => () => {
      if (relogioBalao.current) clearTimeout(relogioBalao.current);
    },
    []
  );

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
    setBalao(null);
    anunciados.current = new Set();
    esquecerPartida();
  }, [esquecerPartida, n]);

  /* Trocar o tamanho no painel abre a partida salva daquele tamanho (ou uma
     nova, se nao houver). */
  useEffect(() => {
    if (!jaMontou.current) {
      jaMontou.current = true;
      return;
    }
    setFim(null);
    setBalao(null);
    if (partidaSalva) {
      celulasRef.current = partidaSalva.celulas;
      pontosRef.current = partidaSalva.pontos;
      setCelulas(partidaSalva.celulas);
      setPontos(partidaSalva.pontos);
      marcarAnunciados(partidaSalva.celulas);
      return;
    }
    const nova = comecar(n);
    celulasRef.current = nova;
    pontosRef.current = 0;
    setCelulas(nova);
    setPontos(0);
    anunciados.current = new Set();
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

      /* Recado da modelo na primeira vez que o passo aparece nesta partida. */
      const novos = comNova.filter((valor) => temFrase(valor) && !anunciados.current.has(valor));
      if (novos.length) mostrarBalao(Math.max(...novos));

      if (!temJogada(comNova, n)) {
        setFim('derrota');
        aoRecorde?.(total);
        esquecerPartida();
        return;
      }

      agendarPartida(comNova, total);
    },
    [agendarPartida, aoRecorde, esquecerPartida, fim, mostrarBalao, n, painel]
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
  ];

  /* Fonte presa ao bloco: o bloco nunca muda de tamanho, so o texto encolhe
     quando a palavra e longa ou o tabuleiro e grande. */
  const fonteCasa = (valor) => {
    if (!valor) return 12;
    const texto = rotuloDoBloco(valor);
    const numerico = /^\d+$/.test(texto);
    if (!numerico) {
      return n >= 6 ? 9 : n === 5 ? 10 : n === 4 ? 11.5 : 13;
    }
    const base = n >= 6 ? 14 : n === 5 ? 16 : n === 4 ? 20 : 23;
    const digitos = texto.length;
    const fator = digitos >= 5 ? 0.6 : digitos === 4 ? 0.74 : 1;
    return Math.round(base * fator);
  };

  return (
    <MolduraJogo
      titulo="SEXTING"
      aoVoltar={aoVoltar}
      recorde={recorde}
      aoAbrirConfig={() => setPainel((aberto) => !aberto)}
      configAberto={painel}
      painel={
        painel ? (
          <PainelConfig
            titulo="SEXTING"
            campos={campos}
            valores={valores}
            aoMudar={aoMudar}
            aoFechar={() => setPainel(false)}
            aoRestaurar={aoRestaurar}
            aoApagarRecordes={aoApagarRecordes}
            nota={`${INSTRUCAO_SEXTING} Cada tamanho de tabuleiro tem o seu próprio recorde, e a partida em andamento volta quando você reabrir, em qualquer aparelho.`}
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
            sem meta: vai até o infinito
          </span>
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          {balao ? (
            <div
              role="status"
              onClick={() => setBalao(null)}
              style={{
                position: 'absolute',
                top: -4,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 3,
                maxWidth: 300,
                padding: '9px 12px',
                borderRadius: 12,
                border: `1px solid ${dourado(46)}`,
                background: 'color-mix(in srgb, var(--c8) 88%, transparent)',
                boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
                fontFamily: 'var(--font-main)',
                cursor: 'pointer',
                animation: 'balaoSobe 220ms ease-out',
              }}
            >
              <div style={{ fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: dourado(72), marginBottom: 3 }}>
                {nomeDoPasso(balao.valor)}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.35, color: 'var(--c3)' }}>
                {balao.frase}
              </div>
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: -6,
                  width: 10,
                  height: 10,
                  transform: 'translateX(-50%) rotate(45deg)',
                  borderRight: `1px solid ${dourado(46)}`,
                  borderBottom: `1px solid ${dourado(46)}`,
                  background: 'color-mix(in srgb, var(--c8) 88%, transparent)',
                }}
              />
            </div>
          ) : null}

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
                  lineHeight: 1.05,
                  textAlign: 'center',
                  letterSpacing: '0.02em',
                  borderRadius: 8,
                  fontFamily: 'var(--font-main)',
                  fontSize: fonteCasa(valor),
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'background 120ms ease, color 120ms ease',
                }}
              >
                {valor ? rotuloDoBloco(valor) : ''}
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

        {geral.direcional ? (
          <div style={{ marginTop: 'auto' }}>
            <DpadVidro aoDirecao={jogar} desabilitado={Boolean(fim)} />
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes balaoSobe {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </MolduraJogo>
  );
}
