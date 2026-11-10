/**
 * O passeio que a Pixie faz pela área de trabalho e pelas Preferências.
 *
 * Roda no tutorial: ela explica a mesa, abre o menu do botão direito com
 * Preferências em destaque, abre a janela de Configurações na aba
 * Preferências e conta o que dá para personalizar por ali.
 *
 * Cada passo é { fala, acao, area }: a ação acontece quando o passo começa e
 * `area` é o bloco das Preferências que ela destaca e para do lado enquanto
 * explica (o roteiro rola a janela até ele e mede a moldura).
 */
import { abrirConfigNaAba } from '@/lib/configAba';
import {
  abrirMenuContextoEm,
  fecharMenuContexto,
  pedirDestaqueMenu,
} from '@/lib/menuContexto';

/* Onde o menu abre: fora do caminho dela, no meio-esquerda da tela. */
const pontoDoMenu = () => ({
  x: Math.round(window.innerWidth * 0.34),
  y: Math.round(window.innerHeight * 0.4),
});

const ACOES = {
  /* Abre o menu da mesa com Preferências brilhando. */
  menu: () => {
    const { x, y } = pontoDoMenu();
    pedirDestaqueMenu('preferencias');
    abrirMenuContextoEm(x, y);
  },
  /* Troca o menu pela janela de Configurações já na aba Preferências. */
  preferencias: () => {
    fecharMenuContexto();
    abrirConfigNaAba('preferencias');
  },
};

export const TOUR_MESA = [
  { fala: 'Essa é sua área de trabalho.' },
  {
    fala: 'Se você clicar nela com o botão direito irá abrir um menu com diversos atalhos.',
  },
  {
    fala: 'Clicar em Preferências abre a janela para você alterar seu espaço como preferir.',
    acao: 'menu',
  },
  {
    fala: 'Começando por aqui: o tamanho da fonte e a fonte do sistema mudam o texto do sistema inteiro.',
    acao: 'preferencias',
    area: 'fontes',
  },
  {
    fala: 'Aqui é o modo de cor: Diurno, Noturno ou Automático, que segue o que o computador já está usando.',
    area: 'modo',
  },
  {
    fala: 'Este é o tema do sistema, que troca as cores da casa: Seda Cósmica, Maré de Vidro, Vampira Corporativa e mais uma porção.',
    area: 'tema',
  },
  {
    fala: 'Aqui entra o fundo: uma imagem sua, que é reduzida antes de subir, no lugar do fundo liso.',
    area: 'fundo',
  },
  {
    fala: 'As linhas do fundo controlam a seda em movimento: animada, parada ou sem linhas. Sem linhas é a mais leve.',
    area: 'linhas',
  },
  {
    fala: 'E aqui embaixo o pet do desktop: você escolhe o bicho e a cor, e o nome você dá clicando nele com o botão direito.',
    area: 'pet',
  },
  {
    fala: 'As outras abas guardam Perfil, Notificações, Chat e Desempenho: eu passo por elas com você. Quando terminar, é só fechar a janela.',
  },
];

export const executarAcaoDoTour = (acao) => {
  const fazer = ACOES[acao];
  if (fazer) fazer();
};
