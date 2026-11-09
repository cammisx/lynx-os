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

/* Tutoriais por marcador (data-pixie-alvo): o que ela conta quando é chamada
   em cima daquele pedaço da tela. Ícone ensina o atalho; janela ensina a
   página. */
const TUTORIAIS = {
  /* --- ícones da barra de tarefas --- */
  'icone-chatters':
    'Aqui abre os Chatters: as pessoas, as fichas e os convites. O pontinho embaixo do ícone diz que a janela está aberta.',
  'icone-modelos':
    'Esse ícone abre as modelos. Cada uma tem os chatters vinculados e o ID dos centavos, que separa as vendas dela.',
  'icone-turnos':
    'Esse é o atalho da escala de turnos. Clique direito no ícone para fixar ele na barra ou tirar de lá.',
  'icone-financeiro':
    'Aqui abre o Financeiro, com as vendas e as comissões do período.',
  'icone-playbook':
    'O Playbook abre por esse ícone: os combinados por modelo e o da agência.',
  'icone-estrategias':
    'Aqui ficam as estratégias de venda, com as mensagens prontas de cada uma.',
  'icone-conteudo': 'Esse ícone abre o Conteúdo: as pastas com as mídias e as tags.',
  'icone-paint': 'Esse é o Paint, o editor de desenho. Clicar de novo minimiza a janela.',
  'icone-jogos': 'Aqui abrem os jogos, para quando der uma pausa.',
  'icone-config':
    'As Configurações abrem por aqui: fonte, modo de cor, tema, fundo, pet e perfil.',
  'icone-chat':
    'O balãozinho abre o chat interno. O número em cima dele é quantas mensagens ainda não foram lidas.',
  'icone-notificacoes':
    'O sino abre os seus avisos, e a bolinha acende quando chega coisa nova.',
  'icone-relogio':
    'O relógio abre o seu dia: o ponto, a sua agenda e a semana de turnos.',

  /* --- páginas das janelas --- */
  'janela-chatters':
    'Aqui estão os chatters: clique numa pessoa para abrir a ficha, os turnos e o acesso dela. "Convidar" cria o acesso por e-mail.',
  'janela-modelos':
    'Essa é a lista de modelos, com os chatters de cada uma e o ID dos centavos que separa as vendas.',
  'janela-turnos':
    'Essa é a escala: quem trabalha em cada horário da semana. Dá para cobrir horário vago e ver as turnos arquivadas.',
  'janela-financeiro':
    'O Financeiro junta as vendas, as comissões e o relatório do período. Também dá para importar o extrato.',
  'janela-playbook':
    'O Playbook tem duas abas: Modelo, com o combinado de cada uma, e Agência, com o da casa.',
  'janela-estrategias':
    'Aqui ficam as estratégias: nome, descrição, instruções e as mensagens de cada uma.',
  'janela-conteudo':
    'Aqui é o Conteúdo: as pastas com as mídias e as tags, que valem para todas as modelos.',
  'janela-paint':
    'O Paint é o editor de desenho: camadas, pincel, formas e borracha. Botão direito no desenho salva, limpa ou fixa na mesa.',
  'janela-jogos': 'Nessa janela ficam os jogos, e alguns guardam recorde.',
  'janela-config':
    'As Configurações: Preferências (fonte, modo de cor, tema, fundo, linhas e pet), Perfil, Notificações e Chat.',

  /* --- o resto da tela --- */
  chat:
    'Aqui é o chat interno: o canal geral, um canal por modelo, os privados e os grupos. O "+" começa uma conversa nova.',
  calendario:
    'Essa é a semana da agenda: os turnos dia por dia. Clique num dia para ver ou marcar horário.',
  notificacoes:
    'Esse é o painel de avisos: o que chegou e o que ainda não foi lido. Clicar num aviso abre ele.',
  'desenho-fixo':
    'Esse é um desenho fixado na mesa: arraste para mover e use o canto para redimensionar. Botão direito dá as outras opções.',
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
