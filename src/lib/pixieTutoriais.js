/**
 * O que a Pixie sabe explicar hoje.
 *
 * Os tutoriais são escritos aos pouquinhos, então esta é a lista do que já
 * existe. Para ensinar um pedaço novo da tela:
 *
 * 1. marque o elemento com data-pixie-alvo="alguma-chave";
 * 2. escreva a fala em TUTORIAIS com essa mesma chave.
 *
 * Quando o elemento não tem marcador, vale o lugar genérico em POR_LUGAR
 * (barra de tarefas, relógio, janela, chat). Sem nada disso a resposta é
 * null: ela se apresenta e espera a pessoa apontar o que quer saber.
 *
 * A mesa não tem fala curta de propósito: explicar a área de trabalho é o
 * passeio inteiro (TOUR_MESA), que ela conta quando é chamada ali.
 */

export const SAUDACAO =
  'Oi! Ainda não tenho tutorial dessa parte. Clique no lugar que você quer que eu explique.';

export const SEM_TUTORIAL = 'Ainda não tenho tutorial dessa parte. Quer apontar outro lugar?';

/* O menu dela quando já não há roteiro: perguntar outro lugar ou se despedir. */
export const CHAMADO_PARA_PERGUNTAR = 'Sobre o que você quer saber? Clique no lugar.';
export const AGRADECIMENTO =
  'Eu que agradeço! Qualquer coisa, é só me chamar com o botão direito.';
export const DESPEDIDA = 'Até logo! Se precisar, é só me chamar com o botão direito!';

/* Tutoriais por marcador (data-pixie-alvo). */
const TUTORIAIS = {
  pet: 'Esse é o pet: clique direito nele para trocar o bicho, a cor e até o nome.',
};

/* Os lugares da tela, quando o elemento não tem marcador próprio. */
const POR_LUGAR = {
  barra:
    'Essa é a barra de tarefas: cada ícone abre uma janela. Clique direito num ícone para fixar ou tirar ele da barra.',
  relogio: 'No relógio ficam seus turnos, o ponto do dia e a agenda da semana.',
  janela:
    'Para minimizar é o traço; para fechar, o X. A janela anda se você arrastar pela barra de cima.',
  chat: 'O chat fica aqui do lado: canal geral, os canais das modelos e os privados.',
};

/* Sem tutorial escrito, a resposta é null (e não um texto de "não sei"): é o
   que faz ela pedir para a pessoa apontar outro lugar. */
export const falaDoLugar = (lugar) => POR_LUGAR[lugar] || null;

/* A que lugar da tela um elemento pertence. */
export const lugarDoElemento = (elemento) => {
  if (!elemento?.closest) return 'fora';
  if (elemento.closest('[data-relogio]')) return 'relogio';
  if (elemento.closest('.chat-painel')) return 'chat';
  if (elemento.closest('[data-janela]')) return 'janela';
  if (elemento.closest('.taskbar')) return 'barra';
  if (elemento.closest('[data-desktop]')) return 'mesa';
  return 'fora';
};

/* O tutorial do elemento clicado: marcador próprio primeiro, lugar depois. */
export const falaDoElemento = (elemento) => {
  const marcado = elemento?.closest?.('[data-pixie-alvo]');
  const chave = marcado?.getAttribute('data-pixie-alvo');
  if (chave && TUTORIAIS[chave]) return TUTORIAIS[chave];
  return falaDoLugar(lugarDoElemento(elemento));
};

/* O que está no ponto clicado, ignorando a camada da pixie. */
export const alvoDoPonto = (x, y) => {
  const pilha = document.elementsFromPoint?.(x, y) || [];
  return pilha.find((elemento) => !elemento.closest?.('[data-pixie]')) || null;
};

/* O tutorial do ponto onde a pessoa clicou. */
export const falaDoPonto = (x, y) => falaDoElemento(alvoDoPonto(x, y));
