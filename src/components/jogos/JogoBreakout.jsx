import { useCallback, useEffect, useRef, useState } from 'react';
import { BotaoVidro, MolduraJogo, PainelConfig, dourado, escuro } from '@/components/jogos/EstruturaJogo';
import { AvisoJogo, DpadVidro, usePausaFora, useTeclado } from '@/components/jogos/ControlesJogo';

/**
 * Rebate-bola (breakout): a raquete devolve a bola e cada tijolo quebrado soma.
 *
 * Regras: vidas (1 a 9), velocidade da bola e quantas fileiras de tijolos. O
 * recorde e de pontos naquela combinacao, entao 6 fileiras em velocidade rapida
 * nao se compara com 3 fileiras na lenta.
 *
 * A raquete segue o dedo/mouse, as setas tambem movem e o direcional de vidro
 * atende quem esta no celular. A bola sai com um toque, para dar tempo de se
 * posicionar.
 */

const LARGURA = 480;
const ALTURA = 340;
const RAQUETE = { largura: 78, altura: 10, y: ALTURA - 26 };
const BOLA = 10;
const COLUNAS = 8;
const VELOCIDADE = { lenta: 285, normal: 355, rapida: 440 };

const montarTijolos = (fileiras) => {
  const margem = 18;
  const vao = 5;
  const larguraTijolo = (LARGURA - margem * 2 - vao * (COLUNAS - 1)) / COLUNAS;
  const alturaTijolo = 14;
  const tijolos = [];
  for (let linha = 0; linha < fileiras; linha += 1) {
    for (let coluna = 0; coluna < COLUNAS; coluna += 1) {
      tijolos.push({
        x: margem + coluna * (larguraTijolo + vao),
        y: 18 + linha * (alturaTijolo + vao),
        w: larguraTijolo,
        h: alturaTijolo,
        linha,
        vivo: true,
      });
    }
  }
  return tijolos;
};

export default function JogoBreakout({ valores, geral, recorde, aoRecorde, aoMudar, aoVoltar, aoRestaurar, aoApagarRecordes }) {
  const velocidadeBase = VELOCIDADE[valores.velocidade];

  const [estado, setEstado] = useState('pronto');
  const [pontos, setPontos] = useState(0);
  const [vidas, setVidas] = useState(valores.vidas);
  const [painel, setPainel] = useState(false);

  const canvas = useRef(null);
  const area = useRef(null);
  const teclas = useRef(new Set());
  const jogo = useRef({
    raqueteX: LARGURA / 2,
    bola: { x: LARGURA / 2, y: RAQUETE.y - 24, vx: 0, vy: 0, solta: false },
    tijolos: montarTijolos(valores.fileiras),
    pontos: 0,
    vidas: valores.vidas,
  });

  const recordeRef = useRef(recorde);
  recordeRef.current = recorde;
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const pontosRef = useRef(0);

  const prepararBola = useCallback(() => {
    const atual = jogo.current;
    atual.bola = { x: atual.raqueteX, y: RAQUETE.y - BOLA - 12, vx: 0, vy: 0, solta: false };
  }, []);

  const reiniciar = useCallback(() => {
    jogo.current = {
      raqueteX: LARGURA / 2,
      bola: { x: LARGURA / 2, y: RAQUETE.y - BOLA - 12, vx: 0, vy: 0, solta: false },
      tijolos: montarTijolos(valores.fileiras),
      pontos: 0,
      vidas: valores.vidas,
    };
    pontosRef.current = 0;
    setPontos(0);
    setVidas(valores.vidas);
    setEstado('pronto');
  }, [valores.fileiras, valores.vidas]);

  useEffect(() => {
    reiniciar();
  }, [reiniciar]);

  const soltar = useCallback(() => {
    const atual = jogo.current;
    if (atual.bola.solta) {
      setEstado('jogando');
      return;
    }
    const angulo = (Math.random() * 0.5 - 0.25) + (-Math.PI / 2);
    atual.bola.vx = Math.cos(angulo) * velocidadeBase;
    atual.bola.vy = Math.sin(angulo) * velocidadeBase;
    atual.bola.solta = true;
    setEstado('jogando');
  }, [velocidadeBase]);

  /* Desenho: tijolos em dourado por fileira, raquete e bola em vidro claro. */
  const desenhar = useCallback(() => {
    const tela = canvas.current;
    if (!tela) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    if (tela.width !== Math.round(LARGURA * dpr)) {
      tela.width = Math.round(LARGURA * dpr);
      tela.height = Math.round(ALTURA * dpr);
    }
    const ctx = tela.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    ctx.fillStyle = 'color-mix(in srgb, var(--c8) 40%, transparent)';
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    const atual = jogo.current;

    atual.tijolos.forEach((tijolo) => {
      if (!tijolo.vivo) return;
      const forca = 58 - tijolo.linha * 7;
      ctx.fillStyle = `color-mix(in srgb, var(--c1) ${Math.max(16, forca)}%, transparent)`;
      ctx.beginPath();
      ctx.roundRect?.(tijolo.x, tijolo.y, tijolo.w, tijolo.h, 4);
      if (ctx.roundRect) ctx.fill();
      else ctx.fillRect(tijolo.x, tijolo.y, tijolo.w, tijolo.h);
    });

    ctx.fillStyle = 'var(--c1)';
    ctx.beginPath();
    ctx.roundRect?.(atual.raqueteX - RAQUETE.largura / 2, RAQUETE.y, RAQUETE.largura, RAQUETE.altura, 5);
    if (ctx.roundRect) ctx.fill();
    else ctx.fillRect(atual.raqueteX - RAQUETE.largura / 2, RAQUETE.y, RAQUETE.largura, RAQUETE.altura);

    ctx.fillStyle = 'var(--c3)';
    ctx.beginPath();
    ctx.arc(atual.bola.x, atual.bola.y, BOLA / 2, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  /* Laco principal: um passo de fisica por quadro, com tempo real. */
  useEffect(() => {
    let quadro = 0;
    let anterior = performance.now();

    const passo = (agora) => {
      const delta = Math.min(0.032, (agora - anterior) / 1000);
      anterior = agora;
      const atual = jogo.current;

      if (estadoRef.current === 'jogando') {
        /* Teclado move a raquete; mexer nela tambem para a bola de espera. */
        const esquerda = teclas.current.has('ArrowLeft') || teclas.current.has('a');
        const direita = teclas.current.has('ArrowRight') || teclas.current.has('d');
        if (esquerda) atual.raqueteX -= 460 * delta;
        if (direita) atual.raqueteX += 460 * delta;
        atual.raqueteX = Math.max(RAQUETE.largura / 2, Math.min(LARGURA - RAQUETE.largura / 2, atual.raqueteX));

        const bola = atual.bola;
        if (bola.solta) {
          bola.x += bola.vx * delta;
          bola.y += bola.vy * delta;

          if (bola.x < BOLA / 2) {
            bola.x = BOLA / 2;
            bola.vx = Math.abs(bola.vx);
          }
          if (bola.x > LARGURA - BOLA / 2) {
            bola.x = LARGURA - BOLA / 2;
            bola.vx = -Math.abs(bola.vx);
          }
          if (bola.y < BOLA / 2) {
            bola.y = BOLA / 2;
            bola.vy = Math.abs(bola.vy);
          }

          /* Raquete: o angulo de volta depende do ponto do impacto. */
          if (
            bola.vy > 0 &&
            bola.y + BOLA / 2 >= RAQUETE.y &&
            bola.y - BOLA / 2 <= RAQUETE.y + RAQUETE.altura &&
            bola.x >= atual.raqueteX - RAQUETE.largura / 2 - BOLA / 2 &&
            bola.x <= atual.raqueteX + RAQUETE.largura / 2 + BOLA / 2
          ) {
            const desvio = (bola.x - atual.raqueteX) / (RAQUETE.largura / 2);
            const angulo = Math.max(-1.05, Math.min(1.05, desvio)) * (Math.PI / 3);
            const rapidez = Math.min(velocidadeBase * 1.45, Math.hypot(bola.vx, bola.vy) * 1.02);
            bola.vx = Math.sin(angulo) * rapidez;
            bola.vy = -Math.abs(Math.cos(angulo) * rapidez);
            bola.y = RAQUETE.y - BOLA / 2 - 0.5;
          }

          /* Tijolos: colisao simples por caixa. */
          atual.tijolos.forEach((tijolo) => {
            if (!tijolo.vivo) return;
            if (bola.x + BOLA / 2 < tijolo.x || bola.x - BOLA / 2 > tijolo.x + tijolo.w) return;
            if (bola.y + BOLA / 2 < tijolo.y || bola.y - BOLA / 2 > tijolo.y + tijolo.h) return;
            tijolo.vivo = false;
            bola.vy = -bola.vy;
            atual.pontos += 10;
            pontosRef.current = atual.pontos;
            setPontos(atual.pontos);
            aoRecorde?.(atual.pontos);
          });

          if (!atual.tijolos.some((tijolo) => tijolo.vivo)) {
            setEstado('ganhou');
            aoRecorde?.(atual.pontos);
          }

          /* Bola perdida: desconta vida e espera o saque. */
          if (bola.y - BOLA / 2 > ALTURA) {
            atual.vidas -= 1;
            setVidas(atual.vidas);
            if (atual.vidas <= 0) {
              setEstado('perdeu');
              aoRecorde?.(atual.pontos);
            } else {
              prepararBola();
              setEstado('pausado');
            }
          }
        } else {
          bola.x = atual.raqueteX;
          bola.y = RAQUETE.y - BOLA - 12;
        }
      }

      if (!jogo.current.bola.solta && estadoRef.current === 'jogando') {
        jogo.current.bola.x = jogo.current.raqueteX;
      }

      desenhar();
      quadro = requestAnimationFrame(passo);
    };

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [aoRecorde, desenhar, prepararBola, velocidadeBase]);

  useEffect(() => {
    const apertar = (evento) => teclas.current.add(evento.key);
    const soltarTecla = (evento) => teclas.current.delete(evento.key);
    window.addEventListener('keydown', apertar);
    window.addEventListener('keyup', soltarTecla);
    return () => {
      window.removeEventListener('keydown', apertar);
      window.removeEventListener('keyup', soltarTecla);
    };
  }, []);

  const mexer = useCallback((clientX) => {
    const tela = canvas.current;
    if (!tela) return;
    const caixa = tela.getBoundingClientRect();
    const proporcao = (clientX - caixa.left) / caixa.width;
    const x = proporcao * LARGURA;
    jogo.current.raqueteX = Math.max(RAQUETE.largura / 2, Math.min(LARGURA - RAQUETE.largura / 2, x));
  }, []);

  useTeclado(
    {
      ArrowLeft: () => {
        jogo.current.raqueteX -= 24;
      },
      ArrowRight: () => {
        jogo.current.raqueteX += 24;
      },
      ' ': () => {
        if (estado === 'pronto' || estado === 'pausado') soltar();
      },
      Enter: () => {
        if (estado === 'pronto' || estado === 'pausado') soltar();
      },
    },
    !painel
  );
  usePausaFora(
    () => setEstado((anterior) => (anterior === 'jogando' ? 'pausado' : anterior)),
    geral.pausarFora
  );

  const moverDirecional = useCallback((direcao) => {
    const passo = 26;
    if (direcao === 'esquerda') jogo.current.raqueteX -= passo;
    if (direcao === 'direita') jogo.current.raqueteX += passo;
    jogo.current.raqueteX = Math.max(
      RAQUETE.largura / 2,
      Math.min(LARGURA - RAQUETE.largura / 2, jogo.current.raqueteX)
    );
  }, []);

  const campos = [
    {
      chave: 'vidas',
      rotulo: 'Vidas',
      tipo: 'stepper',
      min: 1,
      max: 9,
    },
    {
      chave: 'velocidade',
      rotulo: 'Velocidade',
      tipo: 'segmentos',
      opcoes: [
        { valor: 'lenta', rotulo: 'Lenta' },
        { valor: 'normal', rotulo: 'Normal' },
        { valor: 'rapida', rotulo: 'Rapida' },
      ],
    },
    {
      chave: 'fileiras',
      rotulo: 'Fileiras de tijolos',
      tipo: 'segmentos',
      opcoes: [3, 4, 5, 6].map((valor) => ({ valor, rotulo: String(valor) })),
    },
  ];

  return (
    <MolduraJogo
      titulo="Rebate-bola"
      aoVoltar={aoVoltar}
      recorde={recorde}
      aoAbrirConfig={() => setPainel((aberto) => !aberto)}
      configAberto={painel}
      painel={
        painel ? (
          <PainelConfig
            titulo="Rebate-bola"
            campos={campos}
            valores={valores}
            aoMudar={aoMudar}
            aoFechar={() => setPainel(false)}
            aoRestaurar={aoRestaurar}
            aoApagarRecordes={aoApagarRecordes}
            nota="Vidas, velocidade e fileiras mudam a partida: cada combinacao tem o seu recorde."
          />
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: escuro(50) }}>
            pontos
          </span>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 17, fontWeight: 800, color: 'var(--c1)', fontVariantNumeric: 'tabular-nums' }}>
            {pontos}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 12, fontWeight: 700, color: escuro(70) }}>
            {Array.from({ length: Math.max(0, vidas) }, () => '●').join(' ') || '—'}
          </span>
        </div>

        <div
          ref={area}
          style={{ position: 'relative', display: 'flex', justifyContent: 'center', touchAction: 'none' }}
          onPointerMove={(evento) => {
            if (evento.pointerType === 'mouse') mexer(evento.clientX);
          }}
          onPointerDown={(evento) => {
            mexer(evento.clientX);
            if (estado === 'pronto' || estado === 'pausado') soltar();
          }}
          onTouchMove={(evento) => {
            if (evento.touches[0]) mexer(evento.touches[0].clientX);
          }}
        >
          <canvas
            ref={canvas}
            style={{
              width: 'min(100%, 460px)',
              aspectRatio: `${LARGURA} / ${ALTURA}`,
              borderRadius: 12,
              border: `1px solid ${dourado(20)}`,
              background: 'color-mix(in srgb, var(--c8) 38%, transparent)',
              touchAction: 'none',
            }}
          />

          {estado === 'pronto' ? (
            <AvisoJogo
              titulo="Toque para sacar"
              texto="Arraste o dedo ou o mouse para mover a raquete. Setas tambem valem."
              acoes={[
                <BotaoVidro key="ir" tom="principal" onClick={soltar}>
                  Sacar
                </BotaoVidro>,
              ]}
            />
          ) : null}
          {estado === 'pausado' ? (
            <AvisoJogo
              titulo="Pausado"
              acoes={[
                <BotaoVidro key="ir" tom="principal" onClick={soltar}>
                  Continuar
                </BotaoVidro>,
              ]}
            />
          ) : null}
          {estado === 'perdeu' ? (
            <AvisoJogo
              titulo="Acabaram as vidas"
              texto={`${pontos} pontos.`}
              acoes={[
                <BotaoVidro key="nova" tom="principal" onClick={reiniciar}>
                  De novo
                </BotaoVidro>,
              ]}
            />
          ) : null}
          {estado === 'ganhou' ? (
            <AvisoJogo
              tom="vitoria"
              titulo="Quebrou tudo!"
              texto={`${pontos} pontos, com ${vidas} ${vidas === 1 ? 'vida' : 'vidas'} sobrando.`}
              acoes={[
                <BotaoVidro key="nova" tom="principal" onClick={reiniciar}>
                  De novo
                </BotaoVidro>,
              ]}
            />
          ) : null}
        </div>

        {geral.direcional ? (
          <div style={{ marginTop: 'auto' }}>
            <DpadVidro aoDirecao={moverDirecional} aoAcao={estado === 'jogando' ? undefined : soltar} rotuloAcao="sacar" />
          </div>
        ) : null}
      </div>
    </MolduraJogo>
  );
}
