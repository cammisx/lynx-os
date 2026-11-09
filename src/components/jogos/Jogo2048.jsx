import { useCallback, useEffect, useRef, useState } from 'react';
import { BotaoVidro, MolduraJogo, PainelConfig, dourado, escuro } from '@/components/jogos/EstruturaJogo';
import { AvisoJogo, DpadVidro, useSwipe, useTeclado } from '@/components/jogos/ControlesJogo';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  nomeDoPasso,
  rotuloDoBloco,
  sortearFrase,
  temFrase,
} from '@/lib/sextingTextos';

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
  const criados = [];
  let ganho = 0;
  for (let i = 0; i < numeros.length; i += 1) {
    if (numeros[i] === numeros[i + 1]) {
      const dobrado = numeros[i] * 2;
      saida.push(dobrado);
      criados.push(dobrado);
      ganho += dobrado;
      i += 1;
    } else {
      saida.push(numeros[i]);
    }
  }
  while (saida.length < valores.length) saida.push(0);
  return { linha: saida, ganho, criados };
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
  const criados = [];
  let ganho = 0;
  let mudou = false;
  for (let i = 0; i < n; i += 1) {
    const indices = indicesDaLinha(i, n, direcao);
    const { linha, ganho: soma, criados: novos } = juntar(indices.map((indice) => celulas[indice]));
    ganho += soma;
    criados.push(...novos);
    indices.forEach((indice, k) => {
      if (saida[indice] !== linha[k]) mudou = true;
      saida[indice] = linha[k];
    });
  }
  return { celulas: saida, ganho, mudou, criados };
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
  recorde,
  partida,
  vistos,
  aoRecorde,
  aoPartida,
  aoMudar,
  aoVoltar,
  aoRestaurar,
  aoApagarRecordes,
}) {
  const n = valores.tamanho;
  const pequeno = useIsMobile();
  /* 'setas' desenha o direcional na tela (mouse ou dedo). 'deslizar' esconde
     as setas: no celular o jogo vira deslize, no computador so teclado. As
     teclas funcionam nos dois modos. */
  const controle = valores.controle === 'deslizar' ? 'deslizar' : 'setas';

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
  const [larguraTabuleiro, setLarguraTabuleiro] = useState(380);
  const tabuleiro = useRef(null);

  /* O tabuleiro que vale fica na ref: salvar e desenhar nao esperam o setState. */
  const celulasRef = useRef(celulas);
  const pontosRef = useRef(pontos);
  const recordeRef = useRef(recorde);
  recordeRef.current = recorde;

  const relogioSalvar = useRef(null);
  const partidaPendente = useRef(null);
  const jaMontou = useRef(false);

  /* Cada fala aparece UMA vez na vida da conta: a lista do que ja foi visto
     fica no perfil (jogos_config), nao no aparelho. */
  const vistosRef = useRef(vistos || []);
  vistosRef.current = vistos || [];
  const ultimaFrase = useRef(null);
  const relogioBalao = useRef(null);

  const mostrarBalao = useCallback(
    (valor) => {
      const frase = sortearFrase(valor, ultimaFrase.current);
      if (!frase) return;
      ultimaFrase.current = frase;
      /* Marca antes de mandar para o banco: dois merges seguidos nao repetem. */
      const novosVistos = [...new Set([...vistosRef.current, valor])];
      vistosRef.current = novosVistos;
      aoMudar?.({ vistos: novosVistos });
      setBalao({ valor, frase });
      if (relogioBalao.current) clearTimeout(relogioBalao.current);
      relogioBalao.current = setTimeout(() => setBalao(null), 9000);
    },
    [aoMudar]
  );

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
      return;
    }
    const nova = comecar(n);
    celulasRef.current = nova;
    pontosRef.current = 0;
    setCelulas(nova);
    setPontos(0);
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
      const { celulas: proximas, ganho, mudou, criados } = mover(anteriores, n, direcao);
      if (!mudou) return;

      const comNova = plantar(proximas);
      const total = pontosRef.current + ganho;
      celulasRef.current = comNova;
      pontosRef.current = total;
      setCelulas(comNova);
      setPontos(total);

      /* Recado da modelo so na primeira vez que o passo e feito na conta. */
      const novos = criados.filter((valor) => temFrase(valor) && !vistosRef.current.includes(valor));
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

  /* O tamanho do bloco muda com a tela (janela no PC, tela cheia no celular):
     medir evita texto grande demais no 6x6 e miudo demais no 3x3. */
  useEffect(() => {
    const elemento = tabuleiro.current;
    if (!elemento) return undefined;
    const medir = () => setLarguraTabuleiro(elemento.getBoundingClientRect().width || 380);
    medir();
    const observador =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    observador?.observe(elemento);
    window.addEventListener('resize', medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  const campos = [
    {
      chave: 'tamanho',
      rotulo: 'Tabuleiro',
      tipo: 'segmentos',
      opcoes: [3, 4, 5, 6].map((valor) => ({ valor, rotulo: `${valor}x${valor}` })),
    },
    {
      chave: 'controle',
      rotulo: 'Controle',
      tipo: 'select',
      opcoes: pequeno
        ? [
            { valor: 'setas', rotulo: 'Setas' },
            { valor: 'deslizar', rotulo: 'Deslizar o dedo' },
          ]
        : [
            { valor: 'setas', rotulo: 'Mouse' },
            { valor: 'deslizar', rotulo: 'Teclado' },
          ],
    },
  ];

  /* Fonte presa ao bloco: o bloco nunca muda de tamanho, so o texto se ajusta
     ao espaco que existe de verdade. */
  const fonteCasa = (valor) => {
    if (!valor) return 12;
    const texto = rotuloDoBloco(valor);
    const celula = Math.max(26, (larguraTabuleiro - 12 - (n - 1) * 6) / n);

    if (/^\d+$/.test(texto)) {
      const base = n >= 6 ? 14 : n === 5 ? 16 : n === 4 ? 20 : 23;
      const digitos = texto.length;
      const fator = digitos >= 5 ? 0.6 : digitos === 4 ? 0.74 : 1;
      return Math.min(Math.round(base * fator), Math.round(celula * 0.5));
    }

    /* O limite e a MAIOR palavra: o texto quebra em linhas, mas nenhuma
       palavra pode passar da largura do bloco. */
    const maiorPalavra = texto.split(/\s+/).reduce((maior, parte) => Math.max(maior, parte.length), 1);
    const cabe = (celula * 0.92) / (maiorPalavra * 0.58);
    const base = n >= 6 ? 10 : n === 5 ? 11 : n === 4 ? 12.5 : 15;
    return Math.max(6, Math.min(base, cabe));
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
              width: `min(100%, ${controle === 'setas' ? 380 : 480}px)`,
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
                  padding: 1,
                  lineHeight: 1.08,
                  textAlign: 'center',
                  whiteSpace: 'normal',
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                  letterSpacing: '0.01em',
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

        {controle === 'setas' ? (
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