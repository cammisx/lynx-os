/**
 * O passeio que a Pixie faz pela área de trabalho e pelas Preferências.
 *
 * Roda no tutorial: ela explica a mesa, abre o menu do botão direito com
 * Preferências em destaque, abre a janela de Configurações na aba
 * Preferências e conta o que dá para personalizar por ali.
 *
 * Cada passo é { fala, acao }: a ação acontece quando o passo começa.
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
    fala: 'Aqui em cima ficam o tamanho da fonte e a fonte do sistema: o texto do sistema todo muda junto.',
    acao: 'preferencias',
  },
  {
    fala: 'Modo de cor é Diurno, Noturno ou Sistema, que segue o que o computador já está usando.',
  },
  {
    fala: 'Tema do sistema troca as cores da casa: Seda Cósmica, Maré de Vidro, Vampira Corporativa e mais uma porção.',
  },
  { fala: 'Fundo do desktop aceita uma imagem sua ou um dos fundos prontos.' },
  {
    fala: 'Linhas do fundo controla a seda em movimento: animada, parada ou sem linhas. Sem linhas é a mais leve.',
  },
  {
    fala: 'E o pet do desktop fica aqui: você escolhe o bicho e a cor. O nome você dá clicando nele com o botão direito.',
  },
  {
    fala: 'As outras abas guardam Perfil, Notificações e Chat. Quando terminar, é só fechar a janela.',
  },
];

export const executarAcaoDoTour = (acao) => {
  const fazer = ACOES[acao];
  if (fazer) fazer();
};
