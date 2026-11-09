/**
 * O destaque das áreas das Preferências durante o passeio da Pixie.
 *
 * Cada bloco da aba Preferências tem um rótulo marcado com `data-pref-area`.
 * A área de um bloco vai do rótulo dele até o rótulo do próximo, então não é
 * preciso mexer no desenho da janela: a moldura é medida na hora e desenhada
 * por cima, em `DestaquePreferencias`.
 *
 * Quem manda no destaque é o roteiro do passeio (`useTourMesa`): ele chama
 * `destacarArea` e `limparDestaque`, e o componente só desenha o que ouviu.
 */
export const EVENTO_DESTAQUE = 'lynx:area-preferencias';

const ROTULO = (area) => `[data-pref-area="${area}"]`;
const FOLGA_DO_BLOCO = 12;

/* A janela de Configurações rola por dentro: a área precisa caber na vista
   antes de ser medida. */
const rolagemDoRotulo = (rotulo) => rotulo.closest('.glass-scroll') || null;

/* Do rótulo desta área até o começo da próxima, como está na tela agora. */
const blocoDoRotulo = (rotulo) => {
  if (!rotulo) return null;
  const todos = [...document.querySelectorAll('[data-pref-area]')];
  const proximo = todos[todos.indexOf(rotulo) + 1] || null;
  const caixa = rotulo.getBoundingClientRect();
  const topo = caixa.top - 10;
  const base = proximo ? proximo.getBoundingClientRect().top - FOLGA_DO_BLOCO : topo + 120;
  return { topo, base, altura: base - topo, esquerda: caixa.left };
};

/* A área desenhada, presa na parte visível da janela: bloco grande (os temas)
   seguiria para fora do painel. */
export const medirArea = (area) => {
  if (typeof document === 'undefined') return null;
  const rotulo = document.querySelector(ROTULO(area));
  const bloco = blocoDoRotulo(rotulo);
  if (!bloco) return null;

  const rolagem = rolagemDoRotulo(rotulo);
  const janela = rolagem ? rolagem.getBoundingClientRect() : null;
  const teto = (janela ? janela.top : 0) + 4;
  const piso = (janela ? janela.bottom : window.innerHeight) - 8;
  const topo = Math.min(Math.max(bloco.topo, teto), Math.max(teto, piso - 44));
  const base = Math.min(Math.max(bloco.base, topo + 44), piso);
  const esquerda = janela ? janela.left : 0;
  const direita = janela ? janela.right : window.innerWidth;

  return {
    left: esquerda + 6,
    top: topo,
    width: Math.max(80, direita - esquerda - 12),
    height: Math.max(44, base - topo),
  };
};

/* Rola a janela até a área e avisa quem estiver desenhando o destaque. */
export const destacarArea = (area) => {
  if (typeof window === 'undefined') return null;
  const rotulo = document.querySelector(ROTULO(area));

  /* A janela de Configurações pode estar nascendo: tenta de novo por um
     instante antes de desistir. */
  if (!rotulo) {
    if ((destacarArea.esperas || 0) < 8) {
      destacarArea.esperas = (destacarArea.esperas || 0) + 1;
      setTimeout(() => destacarArea(area), 160);
      return null;
    }
    destacarArea.esperas = 0;
    return null;
  }
  destacarArea.esperas = 0;

  const rolagem = rolagemDoRotulo(rotulo);
  const bloco = blocoDoRotulo(rotulo);
  if (rolagem && bloco) {
    const janela = rolagem.getBoundingClientRect();
    const topoDoBloco = bloco.topo - janela.top;
    const cabeInteiro = bloco.altura <= janela.height - 32;
    const desejado = cabeInteiro
      ? rolagem.scrollTop + topoDoBloco + bloco.altura / 2 - janela.height / 2
      : rolagem.scrollTop + topoDoBloco - 14;
    rolagem.scrollTo({ top: Math.max(0, desejado), behavior: 'smooth' });
  }

  window.dispatchEvent(new CustomEvent(EVENTO_DESTAQUE, { detail: { area } }));
  return area;
};

export const limparDestaque = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO_DESTAQUE, { detail: { area: null } }));
};

/* Onde ela fica em relação à área: ao lado da janela, na altura do bloco. */
const FOLGA = 38;
const MARGEM = 84;

export const posicaoAoRedorDaArea = (caixa) => {
  if (!caixa || typeof window === 'undefined') return null;
  const y = Math.min(Math.max(caixa.top + 26, 96), window.innerHeight - 96);
  const aEsquerda = caixa.left - FOLGA;
  if (aEsquerda > MARGEM) return { x: aEsquerda, y };
  const aDireita = caixa.left + caixa.width + FOLGA;
  if (aDireita < window.innerWidth - MARGEM) return { x: aDireita, y };
  return { x: Math.max(MARGEM, caixa.left + 40), y };
};
