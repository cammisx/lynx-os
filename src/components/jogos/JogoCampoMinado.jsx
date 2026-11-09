import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BotaoVidro, MolduraJogo, PainelConfig, escuro, formatarTempo } from '@/components/jogos/EstruturaJogo';
import { AvisoJogo, usePausaFora } from '@/components/jogos/ControlesJogo';
import EfeitoGozada from '@/components/jogos/EfeitoGozada';
import { LIMITES } from '@/lib/jogosConfig';

/**
 * EJACULACAO PRECOCE (o campo minado): venda todas as midias antes que o cara
 * goze.
 *
 * O primeiro clique nunca explode: as bombas so sao sorteadas depois dele, e a
 * casa clicada e as vizinhas ficam livres. A marcacao (clique direito, toque
 * longo ou modo marcar) virou a midia vendida: um emoji de foto ou video
 * sorteado na hora, com uma chance absurda de cair telefone, que paga 1 ponto
 * de bonus.
 *
 * A bomba nao tem sprite: ao explodir, a casa fica um quadrado branco. E o fim
 * de partida sempre leva a gozada na tela, ganhando ou perdendo, com o texto de
 * cada resultado.
 *
 * O recorde e o MENOR tempo de conclusao daquela dificuldade. Campo
 * personalizado tem recorde proprio, porque o tamanho muda tudo.
 */

const CORES = ['var(--c2)', 'var(--info)', 'var(--ok)', 'var(--erro)', 'var(--aviso)', 'var(--c1)'];

/** Sprite de cada midia marcada. O telefone e o easter egg. */
const MIDIAS = { foto: '📷', video: '🎥', telefone: '📱' };

/** 0,000000000000042% de cair telefone: praticamente nunca, mas paga 1 ponto. */
const CHANCE_TELEFONE = 0.000000000000042 / 100;

const sortearMidia = () =>
  Math.random() < CHANCE_TELEFONE ? 'telefone' : Math.random() < 0.5 ? 'foto' : 'video';

const casaVazia = () => ({
  mina: false,
  vizinhos: 0,
  aberta: false,
  bandeira: false,
  midia: null,
});

const montar = (largura, altura) =>
  Array.from({ length: largura * altura }, () => casaVazia());

const vizinhosDe = (indice, largura, altura) => {
  const x = indice % largura;
  const y = Math.floor(indice / largura);
  const lista = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= largura || ny >= altura) continue;
      lista.push(ny * largura + nx);
    }
  }
  return lista;
};

/** Sorteia as minas evitando o primeiro clique e as oito casas em volta dele. */
const sortearMinas = (casas, largura, altura, minas, primeiro) => {
  const proibidas = new Set([primeiro, ...vizinhosDe(primeiro, largura, altura)]);
  const candidatas = casas
    .map((_, indice) => indice)
    .filter((indice) => !proibidas.has(indice));

  for (let i = candidatas.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]];
  }

  const comMina = new Set(candidatas.slice(0, Math.min(minas, candidatas.length)));
  const proximas = casas.map((casa, indice) => ({ ...casa, mina: comMina.has(indice) }));
  proximas.forEach((casa, indice) => {
    casa.vizinhos = vizinhosDe(indice, largura, altura).filter((vizinho) => proximas[vizinho].mina).length;
  });
  return proximas;
};

export default function JogoCampoMinado({
  valores,
  geral = { pausarFora: true },
  recorde,
  aoRecorde,
  aoMudar,
  aoVoltar,
  aoRestaurar,
  aoApagarRecordes,
}) {
  const largura = valores.largura;
  const altura = valores.altura;
  const minas = valores.minas;

  const [casas, setCasas] = useState(() => montar(largura, altura));
  const [estado, setEstado] = useState('pronto');
  const [segundos, setSegundos] = useState(0);
  const [bandeira, setBandeira] = useState(false);
  const [bonus, setBonus] = useState(0);
  const [painel, setPainel] = useState(false);

  const pressao = useRef(null);
  const recordeRef = useRef(recorde);
  recordeRef.current = recorde;

  const reiniciar = useCallback(() => {
    setCasas(montar(largura, altura));
    setEstado('pronto');
    setSegundos(0);
    setBandeira(false);
    setBonus(0);
  }, [largura, altura]);

  useEffect(() => {
    reiniciar();
  }, [reiniciar]);

  /* Relogio: comeca no primeiro clique e para quando a partida acaba. */
  useEffect(() => {
    if (estado !== 'jogando') return undefined;
    const relogio = window.setInterval(() => setSegundos((valor) => valor + 1), 1000);
    return () => window.clearInterval(relogio);
  }, [estado]);

  usePausaFora(() => {
    if (estado === 'jogando') setEstado('pausado');
  }, geral.pausarFora);

  const bandeiras = useMemo(() => casas.filter((casa) => casa.bandeira).length, [casas]);

  const ganhou = useCallback(
    (tabuleiro) => tabuleiro.every((casa) => casa.aberta || casa.mina),
    []
  );

  const abrir = useCallback(
    (indice) => {
      if (estado === 'ganhou' || estado === 'perdeu') return;
      setCasas((anteriores) => {
        let tabuleiro = anteriores;
        let jogando = estado === 'jogando';

        if (!jogando) {
          tabuleiro = sortearMinas(anteriores, largura, altura, minas, indice);
          jogando = true;
        }
        if (tabuleiro[indice].bandeira || tabuleiro[indice].aberta) return tabuleiro;

        const proximas = tabuleiro.map((casa) => ({ ...casa }));

        if (proximas[indice].mina) {
          proximas[indice] = { ...proximas[indice], aberta: true };
          proximas.forEach((casa) => {
            if (casa.mina) casa.aberta = true;
          });
          setEstado('perdeu');
          return proximas;
        }

        /* Abre em ondas: casa sem vizinho minado puxa as vizinhas. */
        const fila = [indice];
        while (fila.length) {
          const atual = fila.pop();
          if (proximas[atual].aberta || proximas[atual].bandeira) continue;
          proximas[atual].aberta = true;
          if (proximas[atual].vizinhos === 0) {
            vizinhosDe(atual, largura, altura).forEach((vizinho) => {
              if (!proximas[vizinho].aberta && !proximas[vizinho].bandeira) fila.push(vizinho);
            });
          }
        }

        if (ganhou(proximas)) {
          setEstado('ganhou');
          setSegundos((valor) => {
            aoRecorde?.(Math.max(1, valor));
            return valor;
          });
        } else {
          setEstado('jogando');
        }
        return proximas;
      });
    },
    [altura, aoRecorde, estado, ganhou, largura, minas]
  );

  const marcar = useCallback(
    (indice) => {
      if (estado === 'ganhou' || estado === 'perdeu') return;
      const atual = casas[indice];
      if (!atual || atual.aberta) return;
      /* Cada marcacao sorteia de novo o sprite: quase sempre foto ou video.
         O sorteio acontece AQUI, fora do setCasas, para o bonus do telefone
         nao depender de quando o React resolve o estado. */
      const vendendo = !atual.bandeira;
      const midia = vendendo ? sortearMidia() : atual.midia;

      setCasas((anteriores) =>
        anteriores.map((casa, posicao) => {
          if (posicao !== indice || casa.aberta) return casa;
          return { ...casa, bandeira: !casa.bandeira, midia };
        })
      );
      if (vendendo && midia === 'telefone') setBonus((valor) => valor + 1);
    },
    [casas, estado]
  );

  const tocar = useCallback(
    (indice) => {
      if (bandeira) marcar(indice);
      else abrir(indice);
    },
    [abrir, bandeira, marcar]
  );

  const soltar = useCallback(
    (indice) => {
      const partida = pressao.current;
      pressao.current = null;
      if (!partida) return;
      /* Toque longo marca bandeira sem precisar trocar de modo. */
      if (partida.indice === indice && Date.now() - partida.em > 420) {
        marcar(indice);
        return;
      }
      tocar(indice);
    },
    [marcar, tocar]
  );

  const campos = [
    {
      chave: 'dificuldade',
      rotulo: 'Dificuldade',
      tipo: 'segmentos',
      opcoes: [
        { valor: 'facil', rotulo: 'Facil 9x9' },
        { valor: 'medio', rotulo: 'Medio 16x16' },
        { valor: 'dificil', rotulo: 'Dificil 30x16' },
        { valor: 'personalizado', rotulo: 'Personalizado' },
      ],
    },
    ...(valores.dificuldade === 'personalizado'
      ? [
          { chave: 'largura', rotulo: 'Largura', tipo: 'stepper', min: LIMITES.campoLargura[0], max: LIMITES.campoLargura[1] },
          { chave: 'altura', rotulo: 'Altura', tipo: 'stepper', min: LIMITES.campoAltura[0], max: LIMITES.campoAltura[1] },
          {
            chave: 'minas',
            rotulo: 'Minas',
            tipo: 'stepper',
            min: 1,
            max: Math.max(1, largura * altura - 9),
            passo: 5,
          },
        ]
      : []),
  ];

  /* A casa encolhe para caber, mas nunca abaixo de 22px: abaixo disso o dedo
     erra e o tabuleiro vira sorte. Se nao couber, a area rola. */
  const [larguraArea, setLarguraArea] = useState(320);
  const area = useRef(null);
  useEffect(() => {
    const elemento = area.current;
    if (!elemento || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver((entradas) => {
      const medida = entradas[0]?.contentRect?.width;
      if (medida) setLarguraArea(medida);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const ladoCasa = Math.max(22, Math.min(38, Math.floor((larguraArea - 2) / largura)));

  const corDoNumero = (numero) => CORES[Math.min(numero, CORES.length - 1)];

  return (
    <MolduraJogo
      titulo="EJACULAÇÃO PRECOCE"
      aoVoltar={aoVoltar}
      recorde={recorde}
      rotuloRecorde="tempo"
      aoAbrirConfig={() => setPainel((aberto) => !aberto)}
      configAberto={painel}
      painel={
        painel ? (
          <PainelConfig
            titulo="Ejaculação Precoce"
            campos={campos}
            valores={valores}
            aoMudar={aoMudar}
            aoFechar={() => setPainel(false)}
            aoRestaurar={aoRestaurar}
            aoApagarRecordes={aoApagarRecordes}
            nota={`${largura}x${altura} com ${minas} mídias para vender. O primeiro clique nunca explode.`}
          />
        ) : null
      }
    >
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 17, fontWeight: 800, color: 'var(--c1)', fontVariantNumeric: 'tabular-nums' }}>
            {formatarTempo(segundos)}
          </span>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: escuro(50) }}>
            mídias {Math.max(0, minas - bandeiras)}
          </span>
          {bonus > 0 ? (
            <span
              title="Bônus dos telefones vendidos"
              style={{ fontFamily: 'var(--font-main)', fontSize: 10, fontWeight: 800, color: '#ffe08a' }}
            >
              ★ +{bonus} {bonus === 1 ? 'ponto' : 'pontos'}
            </span>
          ) : null}
          <div style={{ flex: 1 }} />
          <BotaoVidro
            tom={bandeira ? 'principal' : 'normal'}
            onClick={() => setBandeira((modo) => !modo)}
            title="Modo marcar"
          >
            📷 marcar
          </BotaoVidro>
          <BotaoVidro onClick={reiniciar}>Nova</BotaoVidro>
        </div>

        <div ref={area} className="glass-scroll" style={{ position: 'relative', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: `repeat(${largura}, ${ladoCasa}px)`,
              gap: 2,
              padding: 4,
              borderRadius: 12,
              border: `1px solid ${escuro(12)}`,
              background: 'color-mix(in srgb, var(--c8) 42%, transparent)',
              width: 'fit-content',
              /* No celular o toque longo servia para marcar a midia, mas o
                 navegador selecionava o emoji da casa e abria o menu de copiar.
                 Sem selecao, sem callout e sem arrastar: o dedo so marca. */
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {casas.map((casa, indice) => {
              const fechada = !casa.aberta;
              return (
                <button
                  key={indice}
                  type="button"
                  disabled={estado === 'ganhou' || estado === 'perdeu'}
                  onPointerDown={(evento) => {
                    if (evento.pointerType === 'mouse' && evento.button === 2) return;
                    pressao.current = { indice, em: Date.now() };
                  }}
                  onPointerUp={() => soltar(indice)}
                  onPointerLeave={() => {
                    pressao.current = null;
                  }}
                  onContextMenu={(evento) => {
                    evento.preventDefault();
                    marcar(indice);
                  }}
                  style={{
                    width: ladoCasa,
                    height: ladoCasa,
                    borderRadius: 5,
                    border: `1px solid ${fechada ? escuro(16) : escuro(6)}`,
                    /* Bomba nao tem sprite: a casa inteira vira um quadrado branco. */
                    background:
                      casa.aberta && casa.mina
                        ? '#ffffff'
                        : casa.aberta
                          ? 'color-mix(in srgb, var(--c8) 60%, transparent)'
                          : `color-mix(in srgb, var(--c1) ${casa.bandeira ? 22 : 9}%, transparent)`,
                    color: casa.mina ? 'var(--erro)' : corDoNumero(casa.vizinhos),
                    fontFamily: 'var(--font-main)',
                    fontSize: Math.max(10, ladoCasa * 0.5),
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    touchAction: 'manipulation',
                    lineHeight: 1,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  draggable={false}
                >
                  {casa.bandeira && fechada
                    ? MIDIAS[casa.midia || 'foto']
                    : casa.aberta && casa.mina
                      ? ''
                      : casa.aberta && casa.vizinhos
                        ? casa.vizinhos
                        : ''}
                </button>
              );
            })}

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
          </div>
        </div>

        <p style={{ margin: 0, fontFamily: 'var(--font-main)', fontSize: 9.5, color: escuro(45), textAlign: 'center' }}>
          Toque longo ou clique direito vende a mídia
        </p>

        {estado === 'ganhou' ? (
          <EfeitoGozada
            titulo="Arrasou, vendeu tudo!"
            texto={`${formatarTempo(segundos)} nesta dificuldade.`}
            acao={
              <BotaoVidro tom="principal" onClick={reiniciar}>
                Outra
              </BotaoVidro>
            }
          />
        ) : null}

        {estado === 'perdeu' ? (
          <EfeitoGozada
            titulo="Desculpa, é que vc é muito gostosa"
            acao={
              <BotaoVidro tom="principal" onClick={reiniciar}>
                De novo
              </BotaoVidro>
            }
          />
        ) : null}
      </div>
    </MolduraJogo>
  );
}
