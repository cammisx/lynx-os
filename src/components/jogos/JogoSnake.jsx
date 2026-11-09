import { useCallback, useEffect, useRef, useState } from 'react';
import { BotaoVidro, MolduraJogo, PainelConfig, dourado, escuro } from '@/components/jogos/EstruturaJogo';
import { AvisoJogo, DpadVidro, usePausaFora, useSwipe, useTeclado } from '@/components/jogos/ControlesJogo';

/**
 * Cobrinha. Come, cresce, nao se enrosca.
 *
 * Regras ajustaveis: tamanho da grade, velocidade inicial e o que acontece na
 * borda (morrer ou atravessar para o outro lado). O recorde e de macas comidas
 * naquela combinacao exata de regras.
 */

const GRADE = { pequena: 15, media: 20, grande: 26 };
const VELOCIDADE = { lenta: 200, normal: 135, rapida: 95 };
const PASSO = 20;
const DIRECOES = {
  cima: { x: 0, y: -1 },
  baixo: { x: 0, y: 1 },
  esquerda: { x: -1, y: 0 },
  direita: { x: 1, y: 0 },
};

const oposta = (a, b) => a.x + b.x === 0 && a.y + b.y === 0;

const macaSolta = (grade, corpo) => {
  const ocupadas = new Set(corpo.map((parte) => `${parte.x}:${parte.y}`));
  const livres = [];
  for (let y = 0; y < grade; y += 1) {
    for (let x = 0; x < grade; x += 1) {
      if (!ocupadas.has(`${x}:${y}`)) livres.push({ x, y });
    }
  }
  return livres[Math.floor(Math.random() * livres.length)] || { x: 0, y: 0 };
};

const partida = (grade) => {
  const meio = Math.floor(grade / 2);
  const corpo = [
    { x: meio, y: meio },
    { x: meio - 1, y: meio },
    { x: meio - 2, y: meio },
  ];
  return { corpo, direcao: DIRECOES.direita, fila: [], maca: macaSolta(grade, corpo), pontos: 0 };
};

export default function JogoSnake({ valores, geral, recorde, aoRecorde, aoMudar, aoVoltar, aoRestaurar, aoApagarRecordes }) {
  const grade = GRADE[valores.grade];
  const velocidade = VELOCIDADE[valores.velocidade];
  const atravessa = valores.paredes === 'atravessa';

  const [pontos, setPontos] = useState(0);
  const [estado, setEstado] = useState('pronto');
  const [painel, setPainel] = useState(false);
  const canvas = useRef(null);
  const area = useRef(null);
  const jogo = useRef(partida(grade));
  const recordeRef = useRef(recorde);
  recordeRef.current = recorde;

  const desenhar = useCallback(() => {
    const tela = canvas.current;
    if (!tela) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const lado = grade * PASSO;
    if (tela.width !== Math.round(lado * dpr)) {
      tela.width = Math.round(lado * dpr);
      tela.height = Math.round(lado * dpr);
    }
    const ctx = tela.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, lado, lado);

    /* Fundo e grade discreta, na cor do tema. */
    ctx.fillStyle = 'color-mix(in srgb, var(--c8) 40%, transparent)';
    ctx.fillRect(0, 0, lado, lado);
    ctx.strokeStyle = 'color-mix(in srgb, var(--c2) 6%, transparent)';
    ctx.lineWidth = 1;
    for (let i = 1; i < grade; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * PASSO, 0);
      ctx.lineTo(i * PASSO, lado);
      ctx.moveTo(0, i * PASSO);
      ctx.lineTo(lado, i * PASSO);
      ctx.stroke();
    }

    const { corpo, maca } = jogo.current;

    /* Maca: bolinha dourada com brilho. */
    const centro = PASSO / 2;
    ctx.beginPath();
    ctx.fillStyle = 'var(--c1)';
    ctx.arc(maca.x * PASSO + centro, maca.y * PASSO + centro, PASSO * 0.3, 0, Math.PI * 2);
    ctx.fill();

    /* Corpo: vidro dourado, cabeca mais forte. */
    corpo.forEach((parte, indice) => {
      const forca = indice === 0 ? 62 : Math.max(18, 44 - indice * 1.6);
      ctx.fillStyle = `color-mix(in srgb, var(--c1) ${forca}%, transparent)`;
      const raio = 5;
      const x = parte.x * PASSO + 1.5;
      const y = parte.y * PASSO + 1.5;
      const w = PASSO - 3;
      ctx.beginPath();
      ctx.roundRect?.(x, y, w, w, raio);
      if (ctx.roundRect) ctx.fill();
      else ctx.fillRect(x, y, w, w);
    });
  }, [grade]);

  const reiniciar = useCallback(() => {
    jogo.current = partida(grade);
    setPontos(0);
    setEstado('pronto');
    desenhar();
  }, [grade, desenhar]);

  useEffect(() => {
    reiniciar();
  }, [grade, velocidade, atravessa, reiniciar]);

  const avancar = useCallback(() => {
    const estadoJogo = jogo.current;
    const fila = estadoJogo.fila;
    if (fila.length) {
      const proxima = fila.shift();
      if (!oposta(proxima, estadoJogo.direcao)) estadoJogo.direcao = proxima;
    }

    const cabeca = estadoJogo.corpo[0];
    let x = cabeca.x + estadoJogo.direcao.x;
    let y = cabeca.y + estadoJogo.direcao.y;

    if (x < 0 || y < 0 || x >= grade || y >= grade) {
      if (!atravessa) {
        setEstado('fim');
        aoRecorde?.(estadoJogo.pontos);
        return;
      }
      x = (x + grade) % grade;
      y = (y + grade) % grade;
    }

    const comeu = x === estadoJogo.maca.x && y === estadoJogo.maca.y;
    const corpoSemRabo = comeu ? estadoJogo.corpo : estadoJogo.corpo.slice(0, -1);
    if (corpoSemRabo.some((parte) => parte.x === x && parte.y === y)) {
      setEstado('fim');
      aoRecorde?.(estadoJogo.pontos);
      return;
    }

    estadoJogo.corpo = [{ x, y }, ...corpoSemRabo];
    if (comeu) {
      estadoJogo.pontos += 1;
      estadoJogo.maca = macaSolta(grade, estadoJogo.corpo);
      setPontos(estadoJogo.pontos);
      aoRecorde?.(estadoJogo.pontos);
    }
    desenhar();
  }, [aoRecorde, atravessa, desenhar, grade]);

  /* Relogio do jogo: mais rapido a cada maca, ate um piso. */
  useEffect(() => {
    if (estado !== 'jogando') return undefined;
    const intervalo = Math.max(55, velocidade - pontos * 2);
    const relogio = window.setInterval(avancar, intervalo);
    return () => window.clearInterval(relogio);
  }, [avancar, estado, pontos, velocidade]);

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
      if (anterior === 'pausado') return 'jogando';
      if (anterior === 'pronto') return 'jogando';
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
  ];

  return (
    <MolduraJogo
      titulo="Cobrinha"
      aoVoltar={aoVoltar}
      recorde={recorde}
      aoAbrirConfig={() => setPainel((aberto) => !aberto)}
      configAberto={painel}
      painel={
        painel ? (
          <PainelConfig
            titulo="Cobrinha"
            campos={campos}
            valores={valores}
            aoMudar={aoMudar}
            aoFechar={() => setPainel(false)}
            aoRestaurar={aoRestaurar}
            aoApagarRecordes={aoApagarRecordes}
            nota="O recorde vale para a combinacao de grade, velocidade e borda escolhida."
          />
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: escuro(50) }}>
            macas
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
              width: 'min(100%, 400px)',
              aspectRatio: '1 / 1',
              borderRadius: 12,
              border: `1px solid ${dourado(20)}`,
              background: 'color-mix(in srgb, var(--c8) 38%, transparent)',
            }}
          />
          {estado === 'pronto' ? (
            <AvisoJogo
              titulo="Pronto?"
              texto="Setas, deslize no tabuleiro ou o direcional. Espaco pausa."
              acoes={[
                <BotaoVidro key="ir" tom="principal" onClick={() => setEstado('jogando')}>
                  Jogar
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
          {estado === 'fim' ? (
            <AvisoJogo
              titulo="Fim de jogo"
              texto={`${pontos} ${pontos === 1 ? 'maca' : 'macas'}.`}
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
            <DpadVidro
              aoDirecao={virar}
              aoAcao={alternarPausa}
              rotuloAcao={estado === 'jogando' ? 'pausar' : 'jogar'}
              desabilitado={estado === 'fim'}
            />
          </div>
        ) : null}
      </div>
    </MolduraJogo>
  );
}
