/**
 * Conteúdo do tutorial de primeiro acesso.
 *
 * Um roteiro para admin e outro para chatter: quem não é admin não precisa
 * saber de financeiro, e quem é admin precisa de tudo. Cada passo é uma ideia
 * só, com o ícone do próprio sistema.
 */
import {
  StarIcon,
  UsersIcon,
  CalendarIcon,
  MoneyIcon,
  BookIcon,
  ImageIcon,
  GearIcon,
  PlayIcon,
  SlidersIcon,
} from '@/components/icons';
import ChatIcon from '@/components/icons/ChatIcon';

const BOAS_VINDAS = {
  id: 'boas-vindas',
  Icone: StarIcon,
  titulo: 'Bem-vinda ao LYNX',
  resumo:
    'Este é o seu sistema de trabalho: turnos, ponto, chat, playbook e conteúdo das modelos, tudo no mesmo lugar.',
  dicas: [
    'Computador e celular mostram a mesma coisa, cada um com o seu jeito: janelas soltas no computador e uma tela por vez no celular.',
    'Nada fica só no seu aparelho. O que você salva vale para todo mundo que tem acesso.',
    'Se quiser rever este tutorial depois, ele fica em Preferências.',
  ],
};

const JANELAS_ADMIN = {
  id: 'janelas',
  Icone: SlidersIcon,
  titulo: 'Barra de tarefas, janelas e clique direito',
  resumo:
    'Tudo abre por ícones na barra e cada janela pode ser minimizada, maximizada ou fechada sem perder o que você estava fazendo.',
  dicas: [
    'Clique com o botão direito em qualquer lugar vazio da área de trabalho: Preferências, trocar entre claro e escuro, abrir janelas e fechar todas.',
    'Os ícones da barra podem ser arrastados e a ordem fica salva no seu perfil.',
    'Clique com o botão direito num ícone da barra para fixar, abrir ou fechar a janela.',
  ],
};

const ADMIN = [
  BOAS_VINDAS,
  JANELAS_ADMIN,
  {
    id: 'chatters',
    Icone: UsersIcon,
    titulo: 'Chatters',
    resumo:
      'Cadastre quem atende, defina o cargo e vincule cada chatter às modelos que ele pode ver.',
    dicas: [
      'O convite é por e-mail: a pessoa cria a senha e já entra vinculada.',
      'Cargo admin vê tudo. Cargo chatter vê só as modelos dele.',
      'Vínculo com a modelo é o que libera os canais de chat, o playbook e o conteúdo.',
    ],
  },
  {
    id: 'modelos',
    Icone: StarIcon,
    titulo: 'Modelos',
    resumo:
      'Cada modelo tem cadastro, foto, janela de operação e um link de onboarding para preencher o perfil dela.',
    dicas: [
      'A janela de operação é o horário em que a modelo atende. É ela que vale na agenda.',
      'O link de onboarding vale 7 dias e morre depois de respondido. A modelo preenche sem precisar de conta.',
      'Arquivar uma modelo arquiva o playbook e o conteúdo dela junto, nada fica solto.',
    ],
  },
  {
    id: 'turnos',
    Icone: CalendarIcon,
    titulo: 'Turnos e agenda',
    resumo:
      'A semana inteira num calendário, com turnos avulsos e séries que se repetem.',
    dicas: [
      'Horário vago aparece tracejado e o chatter pode se escalar sozinho, com no mínimo 1 hora.',
      'Uma modelo não recebe dois chatters no mesmo horário. O sistema bloqueia antes de gravar.',
      'Precisa sobrepor mesmo? O admin autoriza registrando quem autorizou e quando.',
    ],
  },
  {
    id: 'ponto',
    Icone: PlayIcon,
    titulo: 'Relógio, ponto e presença',
    resumo:
      'Entrada e saída no painel do relógio, com ajuste registrado e saída automática quando a pessoa esquece.',
    dicas: [
      'A presença é do app aberto: uma batida a cada 90 segundos enquanto a janela do LYNX estiver visível.',
      'Passou 15 minutos do fim previsto com a pessoa offline e o turno fecha sozinho.',
      'Ajuste de ponto guarda o estado de antes e depois, quem ajustou e o motivo.',
    ],
  },
  {
    id: 'financeiro',
    Icone: MoneyIcon,
    titulo: 'Financeiro',
    resumo:
      'Vendas importadas, conciliação e relatório semanal por chatter.',
    dicas: [
      'O dono da venda é definido pelo centavo do valor bruto, e só venda do tipo Chat tem dono.',
      'Assinaturas e postagens entram sem dono, porque não dá para amarrar a um chatter.',
      'Mimo pendente abre a conferência na hora da importação: aprovado ganha dono, recusado fica sem.',
    ],
  },
  {
    id: 'playbook',
    Icone: BookIcon,
    titulo: 'Playbook',
    resumo:
      'O perfil de cada modelo em perguntas e respostas, do jeito que o chatter precisa consultar.',
    dicas: [
      'Pergunta sem resposta não aparece na leitura: o que está ali foi respondido de verdade.',
      'Campos sensíveis, como e-mail e senha, têm botão de copiar.',
      'A busca varre perguntas e respostas dentro do playbook.',
    ],
  },
  {
    id: 'conteudo',
    Icone: ImageIcon,
    titulo: 'Conteúdo',
    resumo:
      'O acervo de cada modelo: pastas, itens com imagem, tags e preços.',
    dicas: [
      'Um item pode estar em várias pastas ao mesmo tempo.',
      'Tags são sempre em maiúsculo, para não existir a mesma tag escrita de dois jeitos.',
      'Preço mínimo, normal e máximo ficam no item e o chatter vê em modo leitura.',
    ],
  },
  {
    id: 'preferencias',
    Icone: GearIcon,
    titulo: 'Preferências',
    resumo:
      'Tema, fundo, pet, som e notificações. Tudo do seu jeito, sem mudar o dos outros.',
    dicas: [
      'Tema tem modo diurno, noturno e automático pelo sistema.',
      'Fundo pode ser animado, parado ou sem as linhas.',
      'Computador e celular guardam escolhas separadas: mudar no celular não mexe no computador.',
    ],
  },
];

const CHATTER = [
  BOAS_VINDAS,
  {
    id: 'janelas',
    Icone: SlidersIcon,
    titulo: 'Janelas e clique direito',
    resumo:
      'Você trabalha pelas janelas da barra: Playbook, Conteúdo, Turnos e Chat.',
    dicas: [
      'Clique com o botão direito na área de trabalho para abrir Playbook ou Conteúdo e trocar entre claro e escuro.',
      'No celular é uma tela por vez, e o botão de voltar sempre leva de volta.',
    ],
  },
  {
    id: 'turnos',
    Icone: CalendarIcon,
    titulo: 'Meus turnos',
    resumo:
      'A sua semana aparece no painel do relógio e no calendário. Só entra o que é seu.',
    dicas: [
      'Horário vago aparece tracejado: clique e cobre um período de no mínimo 1 hora.',
      'Dois chatters não ficam na mesma modelo no mesmo horário. Se o horário já está ocupado, o sistema não deixa.',
      'O relógio da barra de status no celular abre a agenda com um toque.',
    ],
  },
  {
    id: 'ponto',
    Icone: PlayIcon,
    titulo: 'Ponto',
    resumo:
      'Bata a entrada quando começar e a saída quando terminar. O sistema sabe se você está por perto pelo app aberto.',
    dicas: [
      'Enquanto a janela do LYNX estiver visível, o app avisa que você está presente a cada 90 segundos.',
      'Se passar 15 minutos do fim do turno com você offline, o turno fecha sozinho.',
      'Esqueceu de bater? O ajuste vai para o admin com o motivo e fica registrado.',
    ],
  },
  {
    id: 'chat',
    Icone: ChatIcon,
    titulo: 'Chat',
    resumo:
      'Um canal por modelo, mais o canal geral. Tudo o que precisa de resposta aparece no sino.',
    dicas: [
      'Menção e cutucada chegam no sino e no som do aparelho que você estiver usando.',
      'O aviso por e-mail é o do seu cadastro.',
      'Chat privado entre chatters não aparece para o admin.',
    ],
  },
  {
    id: 'playbook',
    Icone: BookIcon,
    titulo: 'Playbook da modelo',
    resumo:
      'O jeito de escrever, os gostos, os limites e as contas da modelo, num lugar só.',
    dicas: [
      'Use a busca no topo para achar uma resposta no meio de dezenas de perguntas.',
      'E-mail e senha têm botão de copiar, para você não errar na hora de entrar.',
      'Pergunta sem resposta não aparece: se está ali, foi respondida.',
    ],
  },
  {
    id: 'conteudo',
    Icone: ImageIcon,
    titulo: 'Conteúdo',
    resumo:
      'As pastas e os itens das suas modelos, com preço e tags para achar rápido.',
    dicas: [
      'Preço mínimo, normal e máximo aparecem no item.',
      'Filtre por tag quando a modelo tiver muita coisa.',
      'Você só enxerga o conteúdo das modelos vinculadas a você.',
    ],
  },
  {
    id: 'preferencias',
    Icone: GearIcon,
    titulo: 'Preferências',
    resumo:
      'Tema, fundo, pet, som e notificações. Escolha uma vez e o sistema lembra.',
    dicas: [
      'Tema tem modo diurno, noturno e automático.',
      'Computador e celular guardam escolhas separadas.',
      'Dá para trocar ou desligar o pet quando quiser.',
    ],
  },
];

export const passosDoTutorial = (admin) => (admin ? ADMIN : CHATTER);
