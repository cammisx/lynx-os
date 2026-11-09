import { useCallback, useEffect, useRef, useState } from 'react';
import { BotaoVidro, MolduraJogo, PainelConfig, escuro } from '@/components/jogos/EstruturaJogo';
import { AvisoJogo, DpadVidro, usePausaFora, useSwipe, useTeclado } from '@/components/jogos/ControlesJogo';
import {
  BORDA,
  FUNDO,
  LINHA_GRADE,
  desenharCobra,
  desenharItem,
} from '@/components/jogos/desenhoSolicitacao';
import {
  INSTRUCAO_SOLICITACAO,
  ITENS,
  LEGENDA_ITENS,
  PELES,
  TONS_PELE,
  fraseDoFim,
  peleEscolhida,
  sortearTipo,
  valorDoItem,
} from '@/lib/solicitacaoMidia';

/**
 * SOLICITACAO DE MIDIA (a cobrinha da casa).
 *
 * A cobra e um penis: o corpo e o tronco, a cabeca e a glande e as bolas ficam
 * atras do rabo, so de enfeite (nao entram na hitbox). Comer os itens enche a
 * conta: berinjela, foto, video, estrela, telefone e moedas de valor sorteado.
 * Bater na borda ou em si mesma e "gozar": a tela leva um splash branco.
 *
 * O desenho e todo em canvas com cores fixas (canvas nao entende var(--cor)
 * nem color-mix, era por isso que a versao antiga aparecia preta).
 */

const GRADE = { pequena: 15, media: 20, grande: 26 };
const VELOCIDADE = { lenta: 200, normal: 135, rapida: 95 };
const DIRECOES = {
  cima: { x: 0, y: -1 },
  baixo: { x: 0, y: 1 },
  esquerda: { x: -1, y: 0 },
  direita: { x: 1, y: 0 },
};
const MAX_ITENS = 2;

const oposta = (a, b) => a.x + b.x === 0 && a.y + b.y === 0;

const celulasLivres = (grade, ocupadas) => {
  const tomadas = new Set(ocupadas.map(({ x, y }) => `${x}:${y}`));
  const livres = [];
  for (let y = 0; y < grade; y += 1) {
    for (let x = 0; x < grade; x += 1) {
      if (!tomadas.has(`${x}:${y}`)) livres.push({ x, y });
    }
  }
  return livres;
};

const criarPartida = (grade) => {
  const meio = Math.floor(grade / 2);
  const corpo = [
    { x: meio + 1, y: meio },
    { x: meio, y: meio },
    { x: meio - 1, y: meio },
  ];
  return {
    corpo,
    direcao: DIRECOES.direita,
    fila: [],
    itens: [],
    pontos: 0,
    comidos: 0,
    proximoNascimento: 0,
    parado: false,
  };
};

const criarItem = (estado, grade, agora) => {
  const tipo = sortearTipo();
  const livre = celulasLivres(grade, [...estado.corpo, ...estado.itens]);
  if (!livre.length) return null;
  const casa = livre[Math.floor(Math.random() * livre.length)];
  const definicao = ITENS[tipo];
  return {
    tipo,
    x: casa.x,
    y: casa.y,
    valor: valorDoItem(tipo),
    duracao: definicao.duracao,
    expira: agora + definicao.duracao,
  };
};

/* -------------------------------- componente -------------------------------- */

export default function JogoSolicitacaoMidia({
  valores,
  geral,
  recorde,
  aoRecorde,
  aoMudar,
  aoVoltar,
  aoRestaurar,
  aoApagarRecordes,
}) {
  const grade = GRADE[valores.grade] || GRADE.media;
  const velocidade = VELOCIDADE[valores.velocidade] || VELOCIDADE.normal;
  const atravessa = valores.paredes === 'atravessa';
  const pele = peleEscolhida(valores.pele);
  const pelos = Boolean(valores.pelos);

  const [pontos, setPontos] = useState(0);
  const [estado, setEstado] = useState('pronto');
  const [painel, setPainel] = useState(false);
  const [flutuantes, setFlutuantes] = useState([]);
  const [largura, setLargura] = useState(400);
  /* O splash branco vem primeiro; o placar entra logo depois, por cima. */
  const [placarVisivel, setPlacarVisivel] = useState(false);
  const relogioPlacar = useRef(null);

  const canvas = useRef(null);
  const area = useRef(null);
  const jogo = useRef(criarPartida(grade));
  const recordeRef = useRef(recorde);
  recordeRef.current = recorde;
  const pontosRef = useRef(0);

  const passo = Math.max(8, Math.floor(Math.min(largura, 460) / grade));
  const lado = passo * grade;

  const desenhar = useCallback(
    (agora = performance.now()) => {
      const tela = canvas.current;
      if (!tela) return;
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      if (tela.width !== Math.round(lado * dpr) || tela.height !== Math.round(lado * dpr)) {
        tela.width = Math.round(lado * dpr);
        tela.height = Math.round(lado * dpr);
      }
      const ctx = tela.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, lado, lado);

      ctx.fillStyle = FUNDO;
      ctx.fillRect(0, 0, lado, lado);

      ctx.strokeStyle = LINHA_GRADE;
      ctx.lineWidth = 1;
      for (let i = 1; i < grade; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * passo, 0);
        ctx.lineTo(i * passo, lado);
        ctx.moveTo(0, i * passo);
        ctx.lineTo(lado, i * passo);
        ctx.stroke();
      }

      const estadoJogo = jogo.current;
      estadoJogo.itens.forEach((item) => desenharItem(ctx, item, passo, agora));
      desenharCobra(ctx, estadoJogo.corpo, passo, pele, pelos);
    },
    [grade, lado, passo, pele, pelos]
  );

  const reiniciar = useCallback(() => {
    jogo.current = criarPartida(grade);
    jogo.current.proximoNascimento = performance.now();
    pontosRef.current = 0;
    setPontos(0);
    setFlutuantes([]);
    setPlacarVisivel(false);
    if (relogioPlacar.current) clearTimeout(relogioPlacar.current);
    setEstado('pronto');
    desenhar();
  }, [desenhar, grade]);

  useEffect(() => {
    reiniciar();
  }, [grade, velocidade, atravessa, pele, pelos, reiniciar]);

  useEffect(() => {
    desenhar();
  }, [desenhar, estado, largura]);

  /* O tabuleiro acompanha a largura que existe de verdade (janela ou celular). */
  useEffect(() => {
    const elemento = area.current;
    if (!elemento) return undefined;
    const medir = () => setLargura(elemento.clientWidth || 400);
    medir();
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    observador?.observe(elemento);
    window.addEventListener('resize', medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  const mostrarFlutuante = useCallback((item) => {
    const id = `${performance.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setFlutuantes((anteriores) => [
      ...anteriores.slice(-6),
      { id, texto: `+${item.valor} PTS`, x: item.x, y: item.y },
    ]);
    window.setTimeout(() => {
      setFlutuantes((anteriores) => anteriores.filter((f) => f.id !== id));
    }, 1000);
  }, []);

  const parar = useCallback(() => {
    const estadoJogo = jogo.current;
    if (estadoJogo.parado) return;
    estadoJogo.parado = true;
    setEstado('fim');
    setPlacarVisivel(false);
    if (relogioPlacar.current) clearTimeout(relogioPlacar.current);
    relogioPlacar.current = window.setTimeout(() => setPlacarVisivel(true), 750);
    aoRecorde?.(estadoJogo.pontos);
  }, [aoRecorde]);

  const avancar = useCallback(() => {
    const estadoJogo = jogo.current;
    if (estadoJogo.parado) return;

    if (estadoJogo.fila.length) {
      const proxima = estadoJogo.fila.shift();
      if (!oposta(proxima, estadoJogo.direcao)) estadoJogo.direcao = proxima;
    }

    const cabeca = estadoJogo.corpo[0];
    let x = cabeca.x + estadoJogo.direcao.x;
    let y = cabeca.y + estadoJogo.direcao.y;

    if (x < 0 || y < 0 || x >= grade || y >= grade) {
      if (!atravessa) {
        parar();
        return;
      }
      x = (x + grade) % grade;
      y = (y + grade) % grade;
    }

    const indice = estadoJogo.itens.findIndex((item) => item.x === x && item.y === y);
    const comeu = indice >= 0;
    const corpoSemRabo = comeu ? estadoJogo.corpo : estadoJogo.corpo.slice(0, -1);
    if (corpoSemRabo.some((parte) => parte.x === x && parte.y === y)) {
      parar();
      return;
    }

    estadoJogo.corpo = [{ x, y }, ...corpoSemRabo];

    if (comeu) {
      const item = estadoJogo.itens.splice(indice, 1)[0];
      estadoJogo.pontos += item.valor;
      estadoJogo.comidos += 1;
      setPontos(estadoJogo.pontos);
      pontosRef.current = estadoJogo.pontos;
      mostrarFlutuante({ ...item, x, y });
    }
  }, [aoRecorde, atravessa, grade, mostrarFlutuante, parar]);

  const atualizarItens = useCallback(
    (agora) => {
      const estadoJogo = jogo.current;
      estadoJogo.itens = estadoJogo.itens.filter((item) => item.expira > agora);
      if (estadoJogo.itens.length >= MAX_ITENS) return;
      if (agora < estadoJogo.proximoNascimento) return;
      const novo = criarItem(estadoJogo, grade, agora);
      if (novo) estadoJogo.itens.push(novo);
      estadoJogo.proximoNascimento = agora + 650 + Math.random() * 900;
    },
    [grade]
  );

  /* Relogio do jogo: um passo por vez, acelerando de leve conforme come. */
  useEffect(() => {
    if (estado !== 'jogando') return undefined;
    let vivo = true;
    let ultimo = performance.now();
    let sobra = 0;
    let quadro = 0;

    const laco = (agora) => {
      if (!vivo) return;
      atualizarItens(agora);
      sobra += Math.min(150, agora - ultimo);
      ultimo = agora;
      const intervalo = Math.max(70, velocidade - Math.min(60, jogo.current.comidos * 4));
      while (sobra >= intervalo) {
        sobra -= intervalo;
        avancar();
        if (jogo.current.parado) return;
      }
      desenhar(agora);
      quadro = window.requestAnimationFrame(laco);
    };

    quadro = window.requestAnimationFrame(laco);
    return () => {
      vivo = false;
      window.cancelAnimationFrame(quadro);
    };
  }, [atualizarItens, avancar, desenhar, estado, velocidade]);

  /* Fechar a janela no meio da partida ainda conta o que foi vendido. */
  const registroRef = useRef(aoRecorde);
  registroRef.current = aoRecorde;

  useEffect(
    () => () => {
      const valor = pontosRef.current;
      const atual = recordeRef.current;
      if (valor > 0 && (atual == null || valor > atual)) registroRef.current?.(valor);
    },
    []
  );

  const virar = useCallback(
    (direcao) => {
      if (estado === 'fim' || painel) return;
      if (estado === 'pronto') setEstado('jogando');
      if (estado === 'pausado') return;
      const alvo = DIRECOES[direcao];
      const fila = jogo.current.fila;
      const ultima = fila.length ? fila[fila.length - 1] : jogo.current.direcao;
      if (oposta(alvo, ultima) || (alvo.x === ultima.x && alvo.y === ultima.y)) return;
      if (fila.length < 2) fila.push(alvo);
    },
    [estado, painel]
  );

  const alternarPausa = useCallback(() => {
    setEstado((anterior) => {
      if (anterior === 'jogando') return 'pausado';
      if (anterior === 'pausado' || anterior === 'pronto') return 'jogando';
      return anterior;
    });
  }, []);

  useTeclado(
    {
      ArrowUp: () => virar('cima'),
      ArrowDown: () => virar('baixo'),
      ArrowLeft: () => virar('esquerda'),
      ArrowRight: () => virar('direita'),
      w: () => virar('cima'),
      s: () => virar('baixo'),
      a: () => virar('esquerda'),
      d: () => virar('direita'),
      ' ': alternarPausa,
      Enter: alternarPausa,
    },
    !painel
  );
  useSwipe(area, virar, !painel);
  usePausaFora(
    () => setEstado((anterior) => (anterior === 'jogando' ? 'pausado' : anterior)),
    geral.pausarFora
  );

  const campos = [
    {
      chave: 'grade',
      rotulo: 'Tamanho da grade',
      tipo: 'segmentos',
      opcoes: [
        { valor: 'pequena', rotulo: 'Pequena' },
        { valor: 'media', rotulo: 'Media' },
        { valor: 'grande', rotulo: 'Grande' },
      ],
    },
    {
      chave: 'velocidade',
      rotulo: 'Velocidade inicial',
      tipo: 'segmentos',
      opcoes: [
        { valor: 'lenta', rotulo: 'Lenta' },
        { valor: 'normal', rotulo: 'Normal' },
        { valor: 'rapida', rotulo: 'Rapida' },
      ],
    },
    {
      chave: 'paredes',
      rotulo: 'Na borda',
      tipo: 'segmentos',
      opcoes: [
        { valor: 'morte', rotulo: 'Morre' },
        { valor: 'atravessa', rotulo: 'Atravessa' },
      ],
    },
    {
      chave: 'pele',
      rotulo: 'Tom de pele',
      tipo: 'segmentos',
      opcoes: TONS_PELE.map((tom) => ({ valor: tom, rotulo: PELES[tom].nome })),
    },
    { chave: 'pelos', rotulo: 'Pelos nas bolas', tipo: 'toggle' },
  ];

  return (
    <MolduraJogo
      titulo="SOLICITAÇÃO DE MÍDIA"
      aoVoltar={aoVoltar}
      recorde={recorde}
      aoAbrirConfig={() => setPainel((aberto) => !aberto)}
      configAberto={painel}
      painel={
        painel ? (
          <PainelConfig
            titulo="SOLICITAÇÃO DE MÍDIA"
            campos={campos}
            valores={valores}
            aoMudar={aoMudar}
            aoFechar={() => setPainel(false)}
            aoRestaurar={aoRestaurar}
            aoApagarRecordes={aoApagarRecordes}
            nota={`${INSTRUCAO_SOLICITACAO} O recorde vale para a combinação de grade, velocidade e borda escolhida.`}
          />
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: escuro(50) }}>
            vendido
          </span>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 18, fontWeight: 800, color: 'var(--c1)', fontVariantNumeric: 'tabular-nums' }}>
            {pontos}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 10, color: escuro(50) }}>
            {atravessa ? 'borda aberta' : 'borda mata'}
          </span>
        </div>

        <div
          ref={area}
          style={{ position: 'relative', display: 'flex', justifyContent: 'center', touchAction: 'none' }}
        >
          <canvas
            ref={canvas}
            style={{
              width: lado,
              height: lado,
              maxWidth: '100%',
              borderRadius: 12,
              border: `1px solid ${BORDA}`,
              background: FUNDO,
              display: 'block',
            }}
          />

          {flutuantes.map((flutuante) => (
            <span
              key={flutuante.id}
              style={{
                position: 'absolute',
                left: `${((flutuante.x + 0.5) / grade) * 100}%`,
                top: `${((flutuante.y + 0.2) / grade) * 100}%`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                fontFamily: 'var(--font-main)',
                fontSize: 10,
                fontWeight: 800,
                color: '#ffe08a',
                textShadow: '0 1px 4px rgba(0,0,0,0.75)',
                animation: 'sobePonto 1s ease-out forwards',
                whiteSpace: 'nowrap',
              }}
            >
              {flutuante.texto}
            </span>
          ))}

          {estado === 'fim' ? (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 12,
                pointerEvents: 'none',
                zIndex: 3,
                opacity: 0.96,
                filter: 'blur(1px)',
                background:
                  'radial-gradient(ellipse 42% 38% at 50% 46%, rgba(255,255,255,1) 0 55%, rgba(255,255,255,0.75) 72%, rgba(255,255,255,0) 100%),' +
                  'radial-gradient(circle at 24% 24%, rgba(255,255,255,0.95) 0 12%, rgba(255,255,255,0) 30%),' +
                  'radial-gradient(circle at 78% 30%, rgba(255,255,255,0.92) 0 10%, rgba(255,255,255,0) 27%),' +
                  'radial-gradient(circle at 36% 78%, rgba(255,255,255,0.94) 0 14%, rgba(255,255,255,0) 33%),' +
                  'radial-gradient(circle at 72% 76%, rgba(255,255,255,0.86) 0 10%, rgba(255,255,255,0) 26%),' +
                  'radial-gradient(ellipse 6% 26% at 16% 52%, rgba(255,255,255,0.8) 0 70%, rgba(255,255,255,0) 100%),' +
                  'radial-gradient(ellipse 26% 5% at 62% 90%, rgba(255,255,255,0.7) 0 70%, rgba(255,255,255,0) 100%),' +
                  'radial-gradient(ellipse 5% 22% at 88% 60%, rgba(255,255,255,0.65) 0 70%, rgba(255,255,255,0) 100%)',
                animation: 'splashGozo 520ms ease-out both',
              }}
            />
          ) : null}

          {estado === 'pronto' ? (
            <AvisoJogo
              titulo="SOLICITAÇÃO DE MÍDIA"
              texto={`${LEGENDA_ITENS}. Setas, deslize, direcional ou espaço para pausar.`}
              acoes={[
                <BotaoVidro key="ir" tom="principal" onClick={() => setEstado('jogando')}>
                  Começar
                </BotaoVidro>,
              ]}
            />
          ) : null}

          {estado === 'pausado' ? (
            <AvisoJogo
              titulo="Pausado"
              acoes={[
                <BotaoVidro key="seguir" tom="principal" onClick={() => setEstado('jogando')}>
                  Continuar
                </BotaoVidro>,
              ]}
            />
          ) : null}

          {estado === 'fim' && placarVisivel ? (
            /* O splash branco fica embaixo (zIndex 3); o cartao do placar vem
               por cima com fundo escuro, senao o branco engole o texto. */
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5,
                pointerEvents: 'none',
                padding: 12,
              }}
            >
              <div
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  maxWidth: 280,
                  padding: '16px 18px',
                  borderRadius: 14,
                  border: `1px solid ${BORDA}`,
                  background: 'rgba(16,10,23,0.86)',
                  boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
                  textAlign: 'center',
                  animation: 'entraPlacar 260ms ease-out both',
                }}
              >
                <span style={{ fontFamily: 'var(--font-main)', fontSize: 15, fontWeight: 800, color: '#ffe08a' }}>
                  Gozou!
                </span>
                <span style={{ fontFamily: 'var(--font-main)', fontSize: 20, fontWeight: 800, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>
                  {pontos}
                </span>
                <span style={{ fontFamily: 'var(--font-main)', fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,0.82)' }}>
                  {fraseDoFim(pontos)}
                </span>
                <BotaoVidro tom="principal" onClick={reiniciar}>
                  De novo
                </BotaoVidro>
              </div>
            </div>
          ) : null}
        </div>

        {geral.direcional ? (
          <div style={{ marginTop: 'auto' }}>
            <DpadVidro
              aoDirecao={virar}
              aoAcao={alternarPausa}
              rotuloAcao={estado === 'jogando' ? 'pausar' : 'jogar'}
              desabilitado={estado === 'fim'}
            />
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes sobePonto {
          0%   { opacity: 0; transform: translate(-50%, -30%) scale(0.9); }
          18%  { opacity: 1; transform: translate(-50%, -60%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -190%) scale(1); }
        }
        @keyframes entraPlacar {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splashGozo {
          0%   { opacity: 0; transform: scale(0.55); }
          45%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0.88; transform: scale(1.04); }
        }
      `}</style>
    </MolduraJogo>
  );
}
