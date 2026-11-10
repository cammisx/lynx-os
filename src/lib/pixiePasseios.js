/**
 * Os passeios guiados da Pixie.
 *
 * Cada passeio tem o elemento que a pessoa clica (`alvo`), o que aparece
 * quando ele abre (`aberto`) e os passos da explicação. Nos passos ela só
 * fala; quem abre e fecha as coisas é a `acao` do passo, para ela nunca pedir
 * que a pessoa procure um botão enquanto está explicando.
 *
 * Regra de ouro: o passeio inteiro só começa pelo menu dela, em "Perguntar",
 * com a pessoa clicando no alvo. Chamada pelo botão direito, ela só dá o
 * `resumo` de uma frase do lugar.
 */
import { alvoDoPonto, falaDoElemento } from '@/lib/pixieTutoriais';

export const clicar = (seletor) => {
  const elemento = document.querySelector(seletor);
  elemento?.click();
  return Boolean(elemento);
};

/**
 * O que um passo pode fazer na tela.
 *
 * Os pedidos do widget de Turno vivem em modais: o passo abre o modal, ela
 * explica com ele aberto e o passo seguinte fecha antes de abrir o outro.
 */
const ACOES = {
  abrirMimo: () => clicar('button[title="Registrar mimo ou venda internacional"]'),
  abrirFolga: () => clicar('button[title="Folga ou redução de horário"]'),
  abrirPonto: () => clicar('button[title="Ajuste de ponto"]'),
  fecharMimo: () =>
    clicar('[aria-label="Registrar mimo ou venda internacional"] [aria-label="Fechar"]'),
  fecharFolga: () => clicar('[aria-label="Solicitar folga ou redução"] [aria-label="Fechar"]'),
  fecharPonto: () => clicar('[aria-label="Ajuste de ponto"] [aria-label="Fechar"]'),
  fecharTurno: () => clicar('[aria-label="Widget de turno"] [aria-label="Fechar"]'),
  fecharPaginas: () => clicar('[aria-label="Widget de Páginas"] [aria-label="Fechar"]'),
  fecharChat: () => clicar('[aria-label="Fechar chat"]'),
  fecharRelogio: () => clicar('[data-relogio] [aria-label="Fechar"]'),
  /* O Iniciar fecha por onde abriu. */
  fecharIniciar: () => clicar('.taskbar-start'),
  /* As janelas fecham no X do cabeçalho. */
  fecharPlaybook: () => clicar('[data-pixie-alvo="janela-playbook"] [title="Fechar"]'),
  fecharEstrategias: () => clicar('[data-pixie-alvo="janela-estrategias"] [title="Fechar"]'),
  fecharConteudo: () => clicar('[data-pixie-alvo="janela-conteudo"] [title="Fechar"]'),
  fecharPaint: () => clicar('[data-pixie-alvo="janela-paint"] [title="Fechar"]'),
  fecharJogos: () => clicar('[data-pixie-alvo="janela-jogos"] [title="Fechar"]'),
};

export const executarAcaoDePasseio = (chave) => {
  if (typeof document === 'undefined' || !chave) return;
  ACOES[chave]?.();
};

const MIMO = '[aria-label="Registrar mimo ou venda internacional"]';
const FOLGA = '[aria-label="Solicitar folga ou redução"]';
const PONTO = '[aria-label="Ajuste de ponto"]';

export const PASSEIOS = {
  turno: {
    alvo: '[data-widget="turno"]',
    aberto: '[aria-label="Widget de turno"]',
    convite: 'Clique duas vezes no ícone de Turno para abrir o widget.',
    resumo:
      'O Turno é o seu ponto do dia aqui na mesa: bater ponto, pausa e os pedidos de mimo, folga e ajuste.',
    passos: [
      {
        fala: 'Esse é o widget de Turno: o seu ponto do dia aqui na mesa, sem abrir janela.',
      },
      {
        fala: 'Aqui em cima ele conta o seu momento: em shift há quanto tempo, em pausa, ou quanto falta para a próxima entrada.',
      },
      {
        fala: 'No meio ficam as ações do momento: bater o ponto, sair para a pausa e voltar dela.',
      },
      {
        fala: 'Embaixo ficam os pedidos. Vou abrir cada um para você ver como é.',
      },
      {
        fala: 'O Mimo é para a venda internacional: escolha a modelo e cole a linha que veio do site, com data, nick, valor e plataforma. Ele lê a linha sozinho e você confere antes de salvar.',
        acao: 'abrirMimo',
        foco: MIMO,
        fecha: 'fecharMimo',
      },
      {
        fala: 'A Folga é para o dia sem trabalhar: escolha o turno, diga se é o dia inteiro ou só um pedaço (com entrada e saída) e escreva o motivo. O admin recebe e responde.',
        acao: 'abrirFolga',
        foco: FOLGA,
        fecha: 'fecharFolga',
      },
      {
        fala: 'O Ponto corrige um registro: escolha o turno do dia, acerte a entrada e a saída e conte o que aconteceu com esse ponto.',
        acao: 'abrirPonto',
        foco: PONTO,
        fecha: 'fecharPonto',
      },
      {
        fala: 'Para fechar, o X no canto. O widget continua na mesa, é só abrir de novo quando precisar.',
      },
    ],
    fechar: 'fecharTurno',
  },

  paginas: {
    alvo: '[data-widget="paginas"]',
    aberto: '[aria-label="Widget de Páginas"]',
    convite: 'Clique duas vezes no ícone de Páginas para abrir o widget.',
    resumo: 'Páginas mostra quantas estão livres agora e por onde entrar em cada uma.',
    passos: [
      {
        fala: 'Esse é o widget de Páginas: as páginas que são suas e como está cada uma agora.',
      },
      {
        fala: 'Aqui em cima ele conta quantas estão livres neste instante: é o que diz se tem para onde ir.',
      },
      {
        fala: 'Cada linha é uma página: o nome da modelo, o estado (Livre, Ocupada ou Em pausa) e, quando está livre, até quando ela fica.',
      },
      {
        fala: 'Com a página livre aparece o botão Entrar na página: é por ele que você assume a página e começa o shift nela.',
      },
      {
        fala: 'O Atualizar, aqui no topo, relê na hora; fora isso ele se atualiza sozinho a cada 15 segundos.',
      },
      {
        fala: 'Para fechar, o X no canto. O ícone continua na mesa, é só abrir de novo quando precisar.',
      },
    ],
    fechar: 'fecharPaginas',
  },

  calendario: {
    alvo: '[data-pixie-alvo="icone-relogio"]',
    aberto: '[data-relogio]',
    convite: 'Clique no relógio da barra para abrir o seu dia.',
    resumo:
      'O relógio abre o seu dia: o ponto, a sua agenda da semana e a agenda de cada modelo.',
    passos: [
      {
        fala: 'Esse é o seu dia: o ponto aqui em cima e a agenda da semana embaixo.',
      },
      {
        fala: 'O Registrar entrada libera 5 minutos antes do turno começar e sai da tela depois que você bate o ponto. É ali que o seu shift começa a contar.',
        foco: '[data-relogio]',
      },
      {
        fala: 'A aba Minha Agenda é a sua: os turnos dia por dia. Clique num dia para ver o horário e, se tiver horário vago, cobrir ele.',
        foco: '[data-relogio]',
      },
      {
        fala: 'As abas com o nome das modelos são a agenda de cada uma: quem está escalado e em que horário. Quem é vinculado à modelo vê a dela.',
        foco: '[data-relogio]',
      },
      {
        fala: 'Para fechar, o X no canto. O relógio continua na barra.',
      },
    ],
    fechar: 'fecharRelogio',
  },

  chat: {
    alvo: '[data-pixie-alvo="icone-chat"]',
    aberto: '.chat-painel',
    convite: 'Clique no balãozinho do chat para abrir.',
    resumo:
      'O balãozinho abre o chat interno: o canal geral, os canais das modelos, os privados e os grupos.',
    passos: [
      {
        fala: 'Esse é o chat interno: tudo o que a equipe fala passa por aqui.',
      },
      {
        fala: 'A lista de cima é dividida em canais: o geral, um por modelo e os grupos. Clicar num canal abre a conversa dele.',
      },
      {
        fala: 'O lápis em cima começa uma conversa nova, e a engrenagem abre as configurações do chat.',
      },
      {
        fala: 'No campo de escrever tem anexo, GIF, emoji e a menção com @, que chama a atenção de alguém na conversa.',
      },
      {
        fala: 'O microfone grava áudio de até 3 minutos, e o botão de transcrever escreve em texto o que foi falado.',
      },
      {
        fala: 'Para fechar, o X no canto do chat. As mensagens continuam lá quando você voltar.',
      },
    ],
    fechar: 'fecharChat',
  },

  /* --- as páginas do Iniciar que o chatter usa ---
     O alvo é o item do menu; o clique nele já abre a janela, então o passeio
     começa com ela aberta e só explica. */
  playbook: {
    alvo: '[data-menu-iniciar] [data-passeio="playbook"]',
    aberto: '[data-pixie-alvo="janela-playbook"]',
    convite: 'Abra o Iniciar e clique em Playbook.',
    resumo: 'O Playbook guarda o combinado escrito de cada modelo: perguntas e respostas prontas.',
    passos: [
      {
        fala: 'Esse é o Playbook: o combinado de cada modelo escrito e organizado, para não depender da memória de ninguém.',
      },
      {
        fala: 'Na lista da esquerda ficam o playbook da agência e o de cada modelo. Clicar num nome abre ele aqui do lado.',
      },
      {
        fala: 'O conteúdo vai em seções, e cada seção traz as perguntas com a resposta pronta. O que tem o botão Copiar vai direto para a conversa.',
      },
      {
        fala: 'É de leitura: quem escreve é o admin. Você consulta e copia.',
      },
      {
        fala: 'Para fechar, o X no canto.',
      },
    ],
    fechar: 'fecharPlaybook',
  },

  estrategias: {
    alvo: '[data-menu-iniciar] [data-passeio="estrategias"]',
    aberto: '[data-pixie-alvo="janela-estrategias"]',
    convite: 'Abra o Iniciar e clique em Estratégias.',
    resumo: 'As Estratégias guardam as jogadas de venda com as mensagens prontas para copiar.',
    passos: [
      {
        fala: 'Essa é a área de Estratégias: as jogadas de venda que a agência já testou.',
      },
      {
        fala: 'A lista da esquerda tem tudo o que está publicado, com quantas mensagens cada estratégia tem.',
      },
      {
        fala: 'Abrindo uma, vem o nome, a descrição e os blocos de mensagem, cada um com o seu Copiar.',
      },
      {
        fala: 'As instruções embaixo de cada mensagem dizem quando usar e o que ajustar. Elas não são copiadas junto, é só para você ler.',
      },
      {
        fala: 'Quem cria e edita é o admin. Para você, é consulta e cópia.',
      },
      {
        fala: 'Para fechar, o X no canto.',
      },
    ],
    fechar: 'fecharEstrategias',
  },

  conteudo: {
    alvo: '[data-menu-iniciar] [data-passeio="conteudo"]',
    aberto: '[data-pixie-alvo="janela-conteudo"]',
    convite: 'Abra o Iniciar e clique em Conteúdo.',
    resumo: 'O Conteúdo organiza as mídias em pastas por modelo, com busca e filtro por tag.',
    passos: [
      {
        fala: 'Essa é a área de Conteúdo: as mídias organizadas em pastas, por modelo.',
      },
      {
        fala: 'Aqui em cima ficam as abas das modelos: cada uma tem as pastas dela.',
      },
      {
        fala: 'Cada pasta é um assunto e mostra quantos itens tem dentro. Clique para abrir e ver as mídias.',
      },
      {
        fala: 'A busca procura na descrição e nas tags; as tags filtram por assunto e valem para todas as modelos.',
      },
      {
        fala: 'Nova pasta e o gerenciador de Tags são do admin. Para você, é abrir, ver e usar.',
      },
      {
        fala: 'Para fechar, o X no canto.',
      },
    ],
    fechar: 'fecharConteudo',
  },

  paint: {
    alvo: '[data-menu-iniciar] [data-passeio="paint"]',
    aberto: '[data-pixie-alvo="janela-paint"]',
    convite: 'Abra o Iniciar e clique em Paint.',
    resumo: 'O Paint é o editor de desenho: camadas, ferramentas, cores e o botão direito com salvar e fixar.',
    passos: [
      {
        fala: 'Esse é o Paint: um editor de desenho para rascunhar, marcar e inventar.',
      },
      {
        fala: 'Na lateral ficam as ferramentas: selecionar, pincel, borracha, balde, conta-gotas, linha, retângulo e elipse.',
      },
      {
        fala: 'O desenho é feito de camadas: o Fundo é branco e você desenha na camada de cima, então a borracha apaga sem furar o fundo.',
      },
      {
        fala: 'O círculo cromático escolhe a cor e o brilho, e dá para guardar até dez cores suas. Nas formas, a cor do traço e a do preenchimento são separadas.',
      },
      {
        fala: 'Ctrl+Z e Ctrl+Y desfazem e refazem; Ctrl+C, Ctrl+X e Ctrl+V valem para o que estiver na seleção.',
      },
      {
        fala: 'O botão direito no desenho abre o resto: Salvar, Limpar tudo, Enviar para um chat e Fixar na área de trabalho. Fixado, ele vira um quadro na mesa, e cabem dez.',
      },
      {
        fala: 'Para fechar, o X no canto. O que não foi salvo nem fixado fica no rascunho da janela.',
      },
    ],
    fechar: 'fecharPaint',
  },

  jogos: {
    alvo: '[data-menu-iniciar] [data-passeio="jogos"]',
    aberto: '[data-pixie-alvo="janela-jogos"]',
    convite: 'Abra o Iniciar e clique em Jogos.',
    resumo: 'Os Jogos são a pausa entre atendimentos: quatro joguinhos e o seu recorde em cada um.',
    passos: [
      {
        fala: 'Essa é a área de Jogos: a pausa entre um atendimento e outro.',
      },
      {
        fala: 'São quatro: Sexting, Solicitação de Mídia, Ejaculação Precoce e Quem é esse Pokémon?',
      },
      {
        fala: 'Cada card mostra a sua dica e o seu recorde. Clique num para abrir e jogar; o recorde é guardado na sua conta.',
      },
      {
        fala: 'Para fechar, o X no canto.',
      },
    ],
    fechar: 'fecharJogos',
  },

  iniciar: {
    alvo: '.taskbar-start',
    aberto: '[data-menu-iniciar]',
    convite: 'Clique no Iniciar, no cantinho esquerdo da barra.',
    resumo: 'O Iniciar lista todas as janelas do sistema, uma por uma.',
    passos: [
      {
        fala: 'Esse é o Iniciar: todas as janelas do sistema numa lista, com o seu nome e o perfil aqui em cima.',
      },
      {
        fala: 'Clicar num item abre a janela. As que você usa mais podem ficar na barra, do lado do Iniciar.',
      },
      {
        fala: 'É por aqui que você explora o resto: Chatters, Modelos, Turnos, Financeiro, Playbook, Estratégias, Conteúdo, Paint e Configurações. Vá à vontade, eu fico por aqui.',
      },
    ],
    fechar: 'fecharIniciar',
  },
};

/* O passeio, se ele já tiver um escrito. */
export const passeioDe = (chave) => (chave ? PASSEIOS[chave] || null : null);

/**
 * A chave do passeio de um elemento: o marcador `data-passeio` primeiro (barra
 * de tarefas e painéis), depois o `data-widget` dos ícones da mesa.
 */
export const chaveDoPasseio = (elemento) => {
  if (!elemento?.closest) return null;
  const marcado = elemento.closest('[data-passeio]')?.getAttribute('data-passeio');
  if (marcado && PASSEIOS[marcado]) return marcado;
  const widget = elemento.closest('[data-widget]')?.getAttribute('data-widget');
  return widget && PASSEIOS[widget] ? widget : null;
};

/**
 * O resumo de uma frase do elemento, para quando ela é chamada pelo botão
 * direito: o passeio inteiro só começa em "Perguntar".
 */
export const resumoDoElemento = (elemento) => {
  const chave = chaveDoPasseio(elemento);
  if (chave) return PASSEIOS[chave]?.resumo || null;
  return falaDoElemento(elemento);
};

export const resumoDoPonto = (x, y) => resumoDoElemento(alvoDoPonto(x, y));

/* O resumo de uma frase de um passeio, pelo nome dele. */
export const resumoDoPasseio = (chave) => (chave ? PASSEIOS[chave]?.resumo || null : null);

/* Abre o Iniciar (quando ainda está fechado). Devolve se abriu agora. */
export const abrirMenuIniciar = () => {
  if (typeof document === 'undefined') return false;
  if (document.querySelector('[data-menu-iniciar]')) return false;
  return clicar('.taskbar-start');
};

/* Brilha (ou apaga) a moldura de um elemento por seletor. */
export const brilharElemento = (seletor, ligado = true) => {
  const elemento = document.querySelector(seletor);
  if (!elemento) return;
  elemento.classList.toggle('pixie-brilho', ligado);
};

const FOLGA_DA_PIXIE = 54;
const MARGEM_X = 70;
const MARGEM_TOPO = 90;

/**
 * Onde ela fica em relação a um elemento da tela.
 *
 * `lado: 'esquerda'` põe ela à esquerda do elemento (para o painel ficar livre
 * à direita); sem lado, ela procura o lado com mais espaço.
 */
export const posicaoPertoDe = (seletor, { lado = null, folga = FOLGA_DA_PIXIE } = {}) => {
  if (typeof window === 'undefined' || !seletor) return null;
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

/**
 * Segue um elemento e avisa quando ele muda de lugar.
 *
 * O painel abre animando, cresce quando a lista carrega e anda se a pessoa
 * arrastar a janela: medir uma vez só deixava ela no lugar errado. Aqui a
 * medida é conferida a cada quadro e o aviso só sai quando muda de verdade.
 */
export const seguirElemento = (seletor, aoMudar, opcoes = {}) => {
  if (typeof window === 'undefined' || typeof aoMudar !== 'function') return () => {};
  let vivo = true;
  let ultima = null;

  const quadro = () => {
    if (!vivo) return;
    const ponto = posicaoPertoDe(seletor, opcoes);
    const mudou =
      !ponto !== !ultima ||
      (ponto &&
        ultima &&
        (Math.abs(ponto.x - ultima.x) > 0.5 || Math.abs(ponto.y - ultima.y) > 0.5));
    if (mudou) {
      ultima = ponto;
      aoMudar(ponto || null);
    }
    requestAnimationFrame(quadro);
  };

  requestAnimationFrame(quadro);
  return () => {
    vivo = false;
  };
};
