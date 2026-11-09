/**
 * Passeios guiados dos widgets do desktop.
 *
 * Cada widget tem três partes: o seletor do ícone (que ela brilha e manda
 * clicar duas vezes), o seletor do painel que abre e as falas de dentro dele.
 * A regra de ouro: ela só fala do que está vendo, então quem manda no passo é
 * a pessoa (abrir o widget e depois clicar para avançar).
 *
 * Para um widget novo, basta mais uma entrada aqui: a PixieAjuda lê o mapa,
 * acha o ícone pelo `data-widget` e conduz o mesmo roteiro.
 */
export const PASSEIOS_DE_WIDGET = {
  turno: {
    /* Marcador do ícone no desktop (WidgetIcon). */
    icone: '[data-widget="turno"]',
    /* O painel do widget, que abre com dois cliques no ícone. */
    painel: '[aria-label="Widget de turno"]',
    abertura: 'Clique duas vezes no ícone de Turno para abrir o widget.',
    passos: [
      'Esse é o widget de Turno: o seu ponto do dia aqui na mesa, sem abrir janela.',
      'Aqui em cima ela conta o seu momento: em shift há quanto tempo, em pausa, ou quanto falta para a próxima entrada.',
      'No meio ficam as ações do momento: bater o ponto, sair para a pausa e voltar dela.',
      'Embaixo ficam os pedidos: Mimo para registrar uma venda internacional, Folga para pedir folga ou redução de horário, e Ponto para um ajuste no seu registro.',
      'Para fechar, o X no canto. O widget continua na mesa, é só abrir de novo quando precisar.',
    ],
  },
  paginas: {
    icone: '[data-widget="paginas"]',
    painel: '[aria-label="Widget de Páginas"]',
    abertura: 'Clique duas vezes no ícone de Páginas para abrir o widget.',
    passos: [
      'Esse é o widget de Páginas: as páginas que são suas e como está cada uma agora.',
      'Aqui em cima ele conta quantas estão livres neste instante: é o que diz se tem para onde ir.',
      'Cada linha é uma página: o nome da modelo, o estado (Livre, Ocupada ou Em pausa) e, quando está livre, até quando ela fica.',
      'Com a página livre aparece o botão Entrar na página: é por ele que você assume a página e começa o shift nela.',
      'O Atualizar, aqui no topo, relê na hora; fora isso ele se atualiza sozinho a cada 15 segundos.',
      'Para fechar, o X no canto. O ícone continua na mesa, é só abrir de novo quando precisar.',
    ],
  },
};

/* O passeio do widget, se ele já tiver um escrito. */
export const passeioDoWidget = (chave) => (chave ? PASSEIOS_DE_WIDGET[chave] || null : null);

/* A chave do widget onde o elemento mora (o ícone do desktop). */
export const widgetDoElemento = (elemento) =>
  elemento?.closest?.('[data-widget]')?.getAttribute('data-widget') || null;

/* Brilha (ou apaga) a moldura de um elemento por seletor. */
export const brilharElemento = (seletor, ligado = true) => {
  const elemento = document.querySelector(seletor);
  if (!elemento) return;
  elemento.classList.toggle('pixie-brilho', ligado);
};

const FOLGA = 54;
const MARGEM_X = 70;
const MARGEM_TOPO = 90;

/**
 * Onde ela fica em relação a um elemento da tela.
 *
 * `lado: 'esquerda'` põe ela à esquerda do elemento (para o widget ficar livre
 * à direita); sem lado, ela procura o lado com mais espaço.
 */
export const posicaoPertoDe = (seletor, { lado = null, folga = FOLGA } = {}) => {
  if (typeof window === 'undefined') return null;
  const elemento = document.querySelector(seletor);
  if (!elemento) return null;
  const caixa = elemento.getBoundingClientRect();
  if (!caixa.width && !caixa.height) return null;

  const cabeAEsquerda = caixa.left > MARGEM_X + 40;
  const escolhido = lado || (cabeAEsquerda ? 'esquerda' : 'direita');
  const x = escolhido === 'esquerda' ? caixa.left - folga : caixa.right + folga;
  const y = caixa.top + Math.min(caixa.height / 2, 140);

  return {
    x: Math.min(Math.max(x, MARGEM_X), window.innerWidth - MARGEM_X),
    y: Math.min(Math.max(y, MARGEM_TOPO), window.innerHeight - MARGEM_TOPO),
  };
};
