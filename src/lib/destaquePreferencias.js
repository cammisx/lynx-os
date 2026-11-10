/**
 * O destaque das áreas das Preferências durante o passeio da Pixie.
 *
 * Cada bloco da aba Preferências tem o rótulo marcado com `data-pref-area`
 * (`fontes`, `modo`, `tema`, `fundo`, `linhas`, `pet`). O bloco é o rótulo mais
 * tudo o que vem depois dele até o próximo rótulo: a moldura é medida nesses
 * elementos, então fica justa no que ela está explicando.
 *
 * A rolagem da janela é seca (sem animação), porque medir no meio de uma
 * rolagem suave é o que fazia a moldura pegar o bloco de baixo.
 */
import { escalaAtual } from './fonte';

export const EVENTO_DESTAQUE = 'lynx:area-preferencias';

const ROTULO = (area) => `[data-pref-area="${area}"]`;
const MARCAS = '[data-pref-area]';

/* Um passo novo mata as tentativas do anterior. */
let pedidoAtual = 0;

const rolagemDoRotulo = (rotulo) => rotulo.closest('.glass-scroll') || null;

/* O bloco inteiro: o rótulo e todos os irmãos até o próximo rótulo. */
const blocoDoRotulo = (rotulo) => {
  if (!rotulo) return null;
  const partes = [rotulo];
  let irmao = rotulo.nextElementSibling;
  while (irmao && !irmao.matches(MARCAS)) {
    partes.push(irmao);
    irmao = irmao.nextElementSibling;
  }

  let esquerda = Infinity;
  let topo = Infinity;
  let direita = -Infinity;
  let base = -Infinity;
  partes.forEach((parte) => {
    const caixa = parte.getBoundingClientRect();
    if (!caixa.width && !caixa.height) return;
    esquerda = Math.min(esquerda, caixa.left);
    topo = Math.min(topo, caixa.top);
    direita = Math.max(direita, caixa.right);
    base = Math.max(base, caixa.bottom);
  });
  if (!Number.isFinite(topo)) return null;
  return { esquerda, topo, direita, base, altura: base - topo };
};

/* A moldura: o bloco com uma folga, presa na parte visível da janela. */
export const medirArea = (area) => {
  if (typeof document === 'undefined') return null;
  const rotulo = document.querySelector(ROTULO(area));
  const bloco = blocoDoRotulo(rotulo);
  if (!bloco) return null;

  const rolagem = rolagemDoRotulo(rotulo);
  const janela = rolagem ? rolagem.getBoundingClientRect() : null;
  const tetoJanela = janela ? janela.top : 0;
  const pisoJanela = janela ? janela.bottom : window.innerHeight;
  const esquerdaJanela = janela ? janela.left : 0;
  const direitaJanela = janela ? janela.right : window.innerWidth;

  const topo = Math.max(bloco.topo - 9, tetoJanela + 3);
  const base = Math.min(bloco.base + 9, pisoJanela - 6);
  const esquerda = Math.max(bloco.esquerda - 6, esquerdaJanela + 2);
  const direita = Math.min(bloco.direita + 6, direitaJanela - 2);

  return {
    left: esquerda,
    top: topo,
    width: Math.max(60, direita - esquerda),
    height: Math.max(40, base - topo),
  };
};

/**
 * A mesma moldura, agora em qualquer elemento da tela.
 *
 * As Preferências são medidas por bloco (o rótulo e os irmãos dele), mas o sino,
 * o painel de avisos e uma linha de notificação são elementos soltos: aqui a
 * medida é a caixa deles com uma folga curta, presa na tela.
 */
export const medirSeletor = (seletor) => {
  if (typeof document === 'undefined' || !seletor) return null;
  const elemento = document.querySelector(seletor);
  if (!elemento) return null;
  const caixa = elemento.getBoundingClientRect();
  if (!caixa.width && !caixa.height) return null;

  const folga = 6;
  const esquerda = Math.max(caixa.left - folga, 2);
  const topo = Math.max(caixa.top - folga, 2);
  const direita = Math.min(caixa.right + folga, window.innerWidth - 3);
  const base = Math.min(caixa.bottom + folga, window.innerHeight - 3);

  return {
    left: esquerda,
    top: topo,
    width: Math.max(28, direita - esquerda),
    height: Math.max(22, base - topo),
  };
};

/**
 * Segue um alvo de perto e avisa sempre que ele muda de lugar.
 *
 * Medir em instantes marcados (ao abrir, 240 ms depois) é o que deixava a
 * moldura no lugar errado: a janela de Configurações abre animando, a imagem
 * do fundo carrega depois, a pessoa rola, arrasta a janela ou o conteúdo
 * reflui. Aqui a medida é conferida a cada quadro enquanto houver alvo, e o
 * aviso só sai quando a caixa muda de verdade.
 */
const IGUAL = 0.5;

const mesmaCaixa = (a, b) => {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.left - b.left) < IGUAL &&
    Math.abs(a.top - b.top) < IGUAL &&
    Math.abs(a.width - b.width) < IGUAL &&
    Math.abs(a.height - b.height) < IGUAL
  );
};

export const seguirAlvo = (alvo, aoMudar) => {
  if (typeof window === 'undefined' || typeof aoMudar !== 'function') return () => {};
  const doAlvo = typeof alvo === 'function' ? alvo : () => alvo;
  let vivo = true;
  let ultima;
  let primeira = true;

  const quadro = () => {
    if (!vivo) return;
    const { area, seletor } = doAlvo() || {};
    const caixa = area ? medirArea(area) : seletor ? medirSeletor(seletor) : null;
    if (primeira || !mesmaCaixa(caixa, ultima)) {
      primeira = false;
      ultima = caixa;
      aoMudar(caixa || null);
    }
    requestAnimationFrame(quadro);
  };

  requestAnimationFrame(quadro);
  return () => {
    vivo = false;
  };
};

/* Acende a moldura num elemento solto (sino, painel, linha de aviso). */
export const destacarSeletor = (seletor) => {
  if (typeof window === 'undefined') return null;
  pedidoAtual += 1;
  window.dispatchEvent(new CustomEvent(EVENTO_DESTAQUE, { detail: { seletor } }));
  return medirSeletor(seletor);
};

/* Onde a janela precisa parar para o bloco caber na vista. */
const rolagemIdeal = (rolagem, bloco) => {
  /* A medida vem em pixels de tela e o scrollTop em pixels de layout: com o
     tamanho de leitura fora do Normal (zoom na raiz) as duas escalas diferem,
     e sem converter a rolagem parava fora do bloco. */
  const escala = escalaAtual();
  const janela = rolagem.getBoundingClientRect();
  const topoDoBloco = (bloco.topo - janela.top) / escala;
  const alturaDoBloco = bloco.altura / escala;
  const alturaDaJanela = janela.height / escala;
  const cabe = alturaDoBloco <= alturaDaJanela - 24;
  const alvo = cabe
    ? rolagem.scrollTop + topoDoBloco - (alturaDaJanela - alturaDoBloco) / 2
    : rolagem.scrollTop + topoDoBloco - 12;
  const limite = rolagem.scrollHeight - rolagem.clientHeight;
  return Math.min(Math.max(0, alvo), Math.max(0, limite));
};

/* Rola a janela até a área, mede e avisa quem desenha o destaque. */
export const destacarArea = (area) => {
  if (typeof window === 'undefined') return null;
  const meuPedido = ++pedidoAtual;

  const tentar = (restantes) => {
    /* Chegou outro passo: esta tentativa não vale mais. */
    if (meuPedido !== pedidoAtual) return;
    const rotulo = document.querySelector(ROTULO(area));

    /* A janela de Configurações pode estar nascendo. */
    if (!rotulo) {
      if (restantes > 0) setTimeout(() => tentar(restantes - 1), 140);
      return;
    }

    const rolagem = rolagemDoRotulo(rotulo);
    const bloco = blocoDoRotulo(rotulo);
    if (rolagem && bloco) rolagem.scrollTop = rolagemIdeal(rolagem, bloco);

    const caixa = medirArea(area);
    window.dispatchEvent(new CustomEvent(EVENTO_DESTAQUE, { detail: { area } }));
    return caixa;
  };

  return tentar(12);
};

export const limparDestaque = () => {
  if (typeof window === 'undefined') return;
  pedidoAtual += 1;
  window.dispatchEvent(new CustomEvent(EVENTO_DESTAQUE, { detail: { area: null } }));
};

/* Onde ela fica em relação à área: ao lado da janela, na altura do bloco. */
const FOLGA = 40;
const MARGEM = 84;

export const posicaoAoRedorDaArea = (caixa) => {
  if (!caixa || typeof window === 'undefined') return null;
  const y = Math.min(Math.max(caixa.top + 28, 96), window.innerHeight - 96);
  const aEsquerda = caixa.left - FOLGA;
  if (aEsquerda > MARGEM) return { x: aEsquerda, y };
  const aDireita = caixa.left + caixa.width + FOLGA;
  if (aDireita < window.innerWidth - MARGEM) return { x: aDireita, y };
  return { x: Math.max(MARGEM, caixa.left + 40), y };
};
