/**
 * Playbook: as diretrizes da agência e de cada modelo.
 *
 * Regras (as mesmas do canal do chat):
 *  - existe um playbook da empresa (tipo 'empresa') e um por modelo;
 *  - ele nasce junto com a modelo;
 *  - quando a modelo é arquivada ou excluída, o playbook também é arquivado,
 *    nunca excluído, e sai da visão geral;
 *  - se a modelo volta, o playbook volta com o texto que estava lá.
 *
 * Cada pergunta tem um tipo, que é o que o formulário público usa para
 * desenhar o campo: texto curto, texto longo, data, escolha única (radio) ou
 * várias escolhas (checkbox). Pergunta de escolha pode ter "Outro" e pode ser
 * obrigatória, como no formulário original da agência.
 *
 * A resposta é sempre texto, porque é isso que o chatter lê. Escolha múltipla
 * vira uma lista separada por vírgula.
 */
import { chattersDaModelo, ehAdmin } from '@/lib/chat';

export const TIPO_EMPRESA = 'empresa';
export const TIPO_MODELO = 'modelo';

/* Tipos de pergunta do formulário. */
export const TIPOS = {
  CURTO: 'curto',
  LONGO: 'longo',
  DATA: 'data',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
};

export const ROTULO_DO_TIPO = {
  [TIPOS.CURTO]: 'Texto curto',
  [TIPOS.LONGO]: 'Texto longo',
  [TIPOS.DATA]: 'Data',
  [TIPOS.RADIO]: 'Escolha única',
  [TIPOS.CHECKBOX]: 'Várias escolhas',
};

export const ehEscolha = (tipo) => tipo === TIPOS.RADIO || tipo === TIPOS.CHECKBOX;

/**
 * Versão do questionário padrão que mora no código.
 *
 * Quando este número sobe, o template salvo é reescrito com o questionário
 * novo no próximo carregamento. É o jeito de atualizar o padrão para todo
 * mundo sem pedir que ninguém reedite pergunta por pergunta.
 */
export const VERSAO_TEMPLATE = 2;

/** O cabeçalho que a modelo vê no topo do formulário. */
export const CABECALHO_MODELO = {
  titulo: 'LYNX - Perfil da Modelo',
  descricao:
    'Preencha o formulário abaixo para enviar o perfil da modelo à Agência Lynx.\n\n' +
    'Atenção: as informações inseridas não precisam corresponder integralmente à realidade pessoal ' +
    'da modelo, mas devem refletir fielmente a persona que será apresentada aos assinantes.',
};

/**
 * O questionário da modelo, transcrito do formulário "LYNX - Perfil da Modelo"
 * (é este o formato que a agência já usa com as modelos).
 */
const QUESTIONARIO_MODELO = [
  {
    titulo: 'Identificação',
    itens: [
      { pergunta: 'E-mail', tipo: TIPOS.CURTO, obrigatoria: true },
      { pergunta: 'Seu nome pode ser informado?', tipo: TIPOS.CURTO, obrigatoria: true },
      {
        pergunta: 'Como prefere ser chamada? Quais apelidos autoriza?',
        tipo: TIPOS.CURTO,
        obrigatoria: true,
      },
      { pergunta: 'Qual idade da sua persona', tipo: TIPOS.CURTO, obrigatoria: true },
      {
        pergunta: 'Qual dia e mês de aniversário autoriza divulgar?',
        tipo: TIPOS.DATA,
        obrigatoria: true,
      },
      {
        pergunta: 'Qual é seu signo? Você gosta ou costuma falar sobre astrologia?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Qual profissão, curso ou área de estudo autoriza mencionar?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Quais informações pessoais nunca devem ser compartilhadas?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
    ],
  },
  {
    titulo: 'Personalidade e comportamento',
    itens: [
      {
        pergunta: 'Como você se descreveria para alguém que acabou de conhecer?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Você se considera mais tímida, extrovertida ou depende da situação?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Se fosse para definir sua personagem, qual seria a escolha?',
        tipo: TIPOS.CHECKBOX,
        opcoes: [
          'Carinhosa',
          'Brincalhona',
          'Reservada',
          'Direta',
          'Romântica',
          'Irônica',
          'Dominadora',
          'Permite adequação de acordo com o assinante',
        ],
        outro: true,
        obrigatoria: true,
      },
      {
        pergunta: 'Que tipo de humor você tem? Quais brincadeiras gosta de fazer?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Que tipo de piada ou brincadeira você não autoriza utilizar?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      { pergunta: 'O que costuma deixar você feliz ou empolgada?', tipo: TIPOS.LONGO },
      { pergunta: 'O que costuma irritar você?', tipo: TIPOS.LONGO },
      {
        pergunta: 'Se houver: Quais manias, trejeitos, expressões ou bordões são muito usados por você?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
    ],
  },
  {
    titulo: 'Seu jeito de escrever',
    itens: [
      {
        pergunta: 'Você usa "você", "vc", "cê", "tu" ou outra forma? Escreva exemplos.',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Quais abreviações costuma usar? Ex.: "pq", "tbm", "nn", "ss", "mds".',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Como costuma começar as mensagens?',
        tipo: TIPOS.RADIO,
        opcoes: ['Com letra maiúscula "Oieee"', 'Com letra minúscula "oieee"'],
        outro: true,
        obrigatoria: true,
      },
      {
        pergunta: 'Como usa vírgulas, acentos, pontos e interrogações?',
        tipo: TIPOS.RADIO,
        opcoes: ['Nunca', 'Pouco', 'Intermediário', 'Sempre'],
        outro: true,
        obrigatoria: true,
      },
      {
        pergunta: 'Qual nível de escrita mais te satisfaz',
        tipo: TIPOS.RADIO,
        opcoes: [
          'Oii, como você está amoor?',
          'Oieee, como voce tá moor?',
          'oieee como voce ta mor?',
          'Variado',
          'Irrelevante',
        ],
        outro: true,
        obrigatoria: true,
      },
      {
        pergunta: 'Costuma alongar palavras, como "oiii", "ameeei" e "nossaaa"?',
        tipo: TIPOS.RADIO,
        opcoes: ['Sim', 'Não'],
        outro: true,
        obrigatoria: true,
      },
      {
        pergunta:
          'Como escreve quando acha algo engraçado? Diferencie uma risada discreta de uma gargalhada.',
        tipo: TIPOS.LONGO,
      },
      {
        pergunta: 'Quais risadas você costuma usar',
        tipo: TIPOS.CHECKBOX,
        opcoes: [
          'kkkkkkkk',
          'kakakakaka',
          'sksksksksks',
          'rsrsrsrsrs',
          'hehehehe',
          'hihihihi',
          'ahsuahsuahsu',
        ],
        outro: true,
        obrigatoria: true,
      },
      {
        pergunta: 'Usa palavrões? Com que frequência?',
        tipo: TIPOS.RADIO,
        opcoes: [
          'Nunca',
          'Às vezes',
          'Quase sempre',
          'Sempre',
          'Somente quando necessário (BDSM/Personalizados)',
        ],
        outro: true,
        obrigatoria: true,
      },
      { pergunta: 'Quais emojis mais usa?', tipo: TIPOS.LONGO, obrigatoria: true },
      {
        pergunta: 'Usa apelidos carinhosos como "amor", "vida", "bem" ou "bb"? Quais autoriza e em quais situações?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Usa figurinhas, memes ou emoticons, como ":)" e "<3"? De que tipo?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Escreve em outros idiomas? Qual é seu nível e como costuma conversar neles?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Escreva cinco mensagens que representem muito bem seu jeito de falar',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
    ],
  },
  {
    titulo: 'Gostos, comidas e bebidas',
    itens: [
      { pergunta: 'Quais são suas cores favoritas? Existe alguma que não gosta?', tipo: TIPOS.CURTO },
      { pergunta: 'Qual é sua comida favorita?', tipo: TIPOS.CURTO },
      { pergunta: 'Quais comidas você não gosta ou não comeria?', tipo: TIPOS.CURTO },
      { pergunta: 'Você gosta de frutas? Quais prefere e quais não gosta?', tipo: TIPOS.LONGO },
      { pergunta: 'Qual é seu doce ou sobremesa favorita?', tipo: TIPOS.CURTO },
      { pergunta: 'Qual é seu lanche, pizza ou pedido de delivery favorito?', tipo: TIPOS.CURTO },
      { pergunta: 'Quais são suas bebidas favoritas sem álcool?', tipo: TIPOS.CURTO },
      {
        pergunta: 'Consome bebidas alcoólicas? Se quiser informar, quais gosta e quais não gosta?',
        tipo: TIPOS.LONGO,
      },
      { pergunta: 'Gosta de café, chá ou chimarrão? Como prefere?', tipo: TIPOS.CURTO },
      {
        pergunta:
          'Tem alguma restrição alimentar, intolerância ou alergia que queira que a equipe conheça? ' +
          'Informe somente o necessário e diga se pode ser mencionado ao público.',
        tipo: TIPOS.LONGO,
      },
      { pergunta: 'Segue algum estilo de alimentação, como vegetariano ou vegano?', tipo: TIPOS.CURTO },
      { pergunta: 'Gosta de cozinhar? Qual prato sabe fazer melhor?', tipo: TIPOS.LONGO },
      {
        pergunta: 'Prefere doce ou salgado? Comer fora ou pedir em casa?',
        tipo: TIPOS.CHECKBOX,
        opcoes: ['Doce', 'Salgado', 'Pedir', 'Comer fora'],
        outro: true,
      },
      {
        pergunta: 'Torce para algum time? Qual? Acompanha mesmo ou apenas simpatiza?',
        tipo: TIPOS.LONGO,
      },
    ],
  },
  {
    titulo: 'Hobbies e rotina',
    itens: [
      { pergunta: 'Pratica ou acompanha algum esporte?', tipo: TIPOS.CURTO },
      {
        pergunta: 'Joga videogame, computador ou celular? Quais jogos e personagens prefere?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Quais são seus filmes, séries e animes favoritos?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Quais estilos musicais, artistas e músicas mais gosta?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      { pergunta: 'Gosta de ler? Quais livros ou gêneros?', tipo: TIPOS.LONGO, obrigatoria: true },
      {
        pergunta: 'Prefere praia, campo ou cidade? Calor ou frio?',
        tipo: TIPOS.CHECKBOX,
        opcoes: ['Praia', 'Campo', 'Cidade', 'Calor', 'Frio'],
        outro: true,
      },
      { pergunta: 'É mais caseira ou gosta de sair? Quais tipos de passeio prefere?', tipo: TIPOS.LONGO },
      {
        pergunta: 'Tem pets? Quais informações sobre eles autoriza compartilhar?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta:
          'Existe algum assunto que você não acompanha e não gostaria que a equipe fingisse que domina?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      { pergunta: 'Faz academia ou alguma atividade física?', tipo: TIPOS.CURTO, obrigatoria: true },
      { pergunta: 'Qual sua altura?', tipo: TIPOS.CURTO },
      { pergunta: 'Qual seu número de calçado?', tipo: TIPOS.CURTO },
      {
        pergunta: 'Tem tatuagens ou piercings? Quantas? Qual significado?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      { pergunta: 'Você fuma? qual marca, essência ou sabor prefere?', tipo: TIPOS.CURTO },
    ],
  },
  {
    titulo: 'Relacionamentos, orientação e limites',
    descricao:
      'Responda apenas o que se sentir confortável em compartilhar. As respostas orientam seus limites; ' +
      'não autorizam a equipe a inventar experiências ou fazer promessas.',
    itens: [
      {
        pergunta: 'Como descreve sua orientação sexual, caso queira informar?',
        tipo: TIPOS.RADIO,
        opcoes: ['Heterossexual', 'Bissexual', 'Lésbica', 'Pansexual', 'Prefiro não informar'],
        outro: true,
      },
      {
        pergunta: 'Quais pedidos devem ser recusados imediatamente? (ex.: namoro, encontro pessoal etc...)',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
      {
        pergunta: 'Como a equipe deve responder a pedidos de encontro, contato pessoal ou localização?',
        tipo: TIPOS.RADIO,
        opcoes: ['Tentar mudar de assunto', 'Cortar imediatamente'],
        outro: true,
      },
      {
        pergunta:
          'Existe algum limite ou informações que jamais podem ser presumidos ou inventados em seu nome?',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
    ],
  },
  {
    titulo: 'Personalizados',
    descricao:
      'A equipe irá fechar automaticamente estes personalizados e dará prazo mínimo de 3 dias para fazer.\n\n' +
      'Obs.: tudo que não for listado a equipe fechará.',
    itens: [
      {
        pergunta: 'Personalizados que você FAZ',
        tipo: TIPOS.CHECKBOX,
        opcoes: [
          'Que envolvam anal',
          'Que envolvam os pés',
          'Que envolvam acompanhantes Homem',
          'Que envolvam acompanhantes Mulher',
          'Que envolvam brinquedos (dildos e outros)',
          'Que envolvam alguns legumes (pepino, cenoura e outros)',
          'Que envolvam sadomasoquismo',
          'Que envolvam Scat',
          'Que envolvam Golden Shower',
          'Que envolvam Bondage (restrição de movimentos por meio de cordas, algemas, fitas ou tecidos)',
        ],
        outro: true,
        obrigatoria: true,
      },
      {
        pergunta: 'Personalizados que você NÃO FAZ (que não esteja acima listado)',
        tipo: TIPOS.LONGO,
        obrigatoria: true,
      },
    ],
  },
];

const QUESTIONARIO_EMPRESA = [
  { titulo: 'Quem somos', perguntas: ['Quem somos e o que fazemos?'] },
  { titulo: 'Tom de voz', perguntas: ['Como falamos com o público e com as modelos?'] },
  {
    titulo: 'Limites e conduta',
    perguntas: [
      'O que não é aceito em hipótese alguma?',
      'Em que situações a equipe deve parar e chamar a gerência?',
    ],
  },
  { titulo: 'Sigilo', perguntas: ['O que é confidencial e não sai da equipe?'] },
  {
    titulo: 'Fluxo de trabalho',
    perguntas: ['Como abrir turno, registrar venda, pedir folga e avisar um problema?'],
  },
];

const secoesDaEmpresa = () =>
  QUESTIONARIO_EMPRESA.map((secao) =>
    comId(
      {
        titulo: secao.titulo,
        itens: (secao.perguntas || []).map((pergunta) => ({ pergunta, tipo: TIPOS.LONGO })),
      },
      0
    )
  );

/** Deixa uma pergunta no formato atual, aceitando o que veio de versões antigas. */
export const normalizarItem = (item, id) => ({
  id: item.id || id,
  pergunta: item.pergunta || '',
  tipo: item.tipo || TIPOS.LONGO,
  opcoes: Array.isArray(item.opcoes) ? item.opcoes.map((opcao) => String(opcao ?? '')) : [],
  outro: Boolean(item.outro),
  obrigatoria: Boolean(item.obrigatoria),
  resposta: item.resposta || '',
  copiar: Boolean(item.copiar),
});

const comId = (secao, indiceSecao) => ({
  id: secao.id || `s${indiceSecao + 1}`,
  titulo: secao.titulo || '',
  descricao: secao.descricao || '',
  texto: secao.texto || '',
  itens: (Array.isArray(secao.itens) ? secao.itens : []).map((item, indiceItem) =>
    normalizarItem(item, `s${indiceSecao + 1}q${indiceItem + 1}`)
  ),
});

/** Deixa qualquer coisa vinda do banco no formato atual, sem jogar nada fora. */
export const normalizarSecoes = (secoes) =>
  (Array.isArray(secoes) ? secoes : []).map(comId);

/** Playbook novo: o questionário já montado, com as perguntas em branco. */
export const secoesIniciais = (tipo) => {
  if (tipo === TIPO_EMPRESA) return secoesDaEmpresa();
  return QUESTIONARIO_MODELO.map((secao, indiceSecao) => comId(secao, indiceSecao));
};

/** Perguntas que já têm resposta: é só isso que o chatter precisa ver. */
export const itensVisiveis = (secao) =>
  (secao?.itens || []).filter((item) => String(item?.resposta || '').trim());

/** Quantas perguntas faltam responder, para o editor mostrar o andamento. */
export const pendenciasDaSecao = (secao) =>
  (secao?.itens || []).filter((item) => item?.pergunta && !String(item?.resposta || '').trim()).length;

export const modeloDoPlaybook = (playbook, modelos = []) =>
  (modelos || []).find((modelo) => modelo?.id === playbook?.modelo_id) || null;

/**
 * Playbooks que a pessoa pode abrir.
 * A empresa vem sempre primeiro; depois as modelos em ordem alfabética.
 */
export const playbooksVisiveis = (playbooks, modelos, usuario) => {
  const admin = ehAdmin(usuario);
  const lista = (playbooks || []).filter((playbook) => {
    if (!playbook || playbook.arquivado) return false;
    if (playbook.tipo === TIPO_EMPRESA) return true;
    const modelo = modeloDoPlaybook(playbook, modelos);
    if (!modelo || modelo.arquivada) return false;
    if (admin) return true;
    return chattersDaModelo(modelo).includes(usuario?.id);
  });

  return lista.sort((a, b) => {
    if (a.tipo === TIPO_EMPRESA && b.tipo !== TIPO_EMPRESA) return -1;
    if (b.tipo === TIPO_EMPRESA && a.tipo !== TIPO_EMPRESA) return 1;
    const nomeA = modeloDoPlaybook(a, modelos)?.nome || a.titulo || '';
    const nomeB = modeloDoPlaybook(b, modelos)?.nome || b.titulo || '';
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });
};

export const podeEditarPlaybook = (usuario) => ehAdmin(usuario);

export const nomeDoPlaybook = (playbook, modelos = []) => {
  if (playbook?.tipo === TIPO_EMPRESA) return 'Empresa';
  return modeloDoPlaybook(playbook, modelos)?.nome || playbook?.titulo || 'Modelo';
};

/* ------------------------------------------------------------------ *
 * Template do questionário e link respondido pela própria modelo
 * ------------------------------------------------------------------ */

/** O link do formulário vale por 7 dias. */
export const DIAS_DE_VALIDADE = 7;

export const gerarToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

/** O público não passa pelo app: ele bate direto na função do formulário. */
export const baseDoApp = () =>
  typeof window === 'undefined' ? '' : window.location.origin;

export const linkDoFormulario = (token, base = baseDoApp()) =>
  `${base}/functions/playbookFormulario?token=${encodeURIComponent(token || '')}`;

/**
 * O questionário que vale agora.
 * Template de versão antiga (ou ainda não criado) não é usado: nesse caso
 * vale o questionário do código, que é a versão atual. Assim o padrão novo
 * passa a valer no mesmo instante em que o app é publicado.
 */
export const secoesDoTemplate = (template, tipo) => {
  const versao = Number(template?.versao) || 0;
  if (versao < VERSAO_TEMPLATE) return secoesIniciais(tipo);
  const secoes = normalizarSecoes(template?.secoes);
  const temPergunta = secoes.some((secao) => secao.itens.length);
  return temPergunta ? secoes : secoesIniciais(tipo);
};

/** Só o que o formulário precisa: o tipo de cada pergunta e suas opções. */
export const secoesParaFormulario = (playbook) =>
  (playbook?.secoes || []).map((secao) => ({
    id: secao.id,
    titulo: secao.titulo || '',
    descricao: secao.descricao || '',
    itens: (secao.itens || [])
      .filter((item) => String(item?.pergunta || '').trim())
      .map((item) => ({
        id: item.id,
        pergunta: item.pergunta,
        tipo: item.tipo || TIPOS.LONGO,
        opcoes: Array.isArray(item.opcoes) ? item.opcoes : [],
        outro: Boolean(item.outro),
        obrigatoria: Boolean(item.obrigatoria),
        copiar: Boolean(item.copiar),
      })),
  }));

export const conviteValido = (convite) => {
  if (!convite || convite.status !== 'pendente') return false;
  if (!convite.expira_em) return true;
  return new Date(convite.expira_em).getTime() > Date.now();
};

export const totalDePerguntas = (secoes) =>
  (secoes || []).reduce((soma, secao) => soma + (secao?.itens?.length || 0), 0);

export const respondidasDoPlaybook = (playbook) =>
  (playbook?.secoes || []).reduce((soma, secao) => soma + itensVisiveis(secao).length, 0);

/** dd/mm curto, do jeito que o resto do sistema mostra data. */
export const dataCurta = (valor) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};
