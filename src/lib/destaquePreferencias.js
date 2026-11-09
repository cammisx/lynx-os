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

/* Onde a janela precisa parar para o bloco caber na vista. */
const rolagemIdeal = (rolagem, bloco) => {
  const janela = rolagem.getBoundingClientRect();
  const topoDoBloco = bloco.topo - janela.top;
  const cabe = bloco.altura <= janela.height - 24;
  const alvo = cabe
    ? rolagem.scrollTop + topoDoBloco - (janela.height - bloco.altura) / 2
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
