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
 * Formato: cada playbook tem seções; cada seção tem perguntas. Pergunta sem
 * resposta existe no editor (serve de checklist do que falta levantar) mas não
 * aparece na leitura. Uma pergunta marcada com `copiar` ganha um botão que
 * copia a resposta — é como os acessos são usados no dia a dia.
 *
 * Seção antiga, escrita como um bloco de texto corrido (`texto`), continua
 * sendo lida normalmente: nada do que já estava escrito se perde.
 *
 * Quem lê: todo mundo lê o playbook da empresa e os das modelos a que está
 * atribuído. O admin lê todos os ativos. Só o admin edita.
 */
import { chattersDaModelo, ehAdmin } from '@/lib/chat';

export const TIPO_EMPRESA = 'empresa';
export const TIPO_MODELO = 'modelo';

/**
 * O questionário que a agência envia a cada modelo nova. É o mesmo formulário
 * "LYNX - Perfil da Modelo", com todas as perguntas: preencher o playbook é
 * responder o formulário dentro do sistema.
 */
const QUESTIONARIO_MODELO = [
  {
    titulo: 'Contas e acessos',
    /* e-mail, senha e Instagram: é o que o chatter mais copia no dia a dia */
    copiar: true,
    perguntas: ['E-mail', 'Senha', 'Instagram'],
  },
  {
    titulo: 'Identificação',
    perguntas: [
      'Seu nome pode ser informado?',
      'Como prefere ser chamada? Quais apelidos autoriza?',
      'Qual idade da sua persona?',
      'Qual dia e mês de aniversário autoriza divulgar?',
      'Qual é seu signo? Você gosta ou costuma falar sobre astrologia?',
      'Qual profissão, curso ou área de estudo autoriza mencionar?',
      'Como descreve sua orientação sexual, caso queira informar?',
      'Qual sua altura?',
      'Qual seu número de calçado?',
    ],
  },
  {
    titulo: 'Personalidade e humor',
    perguntas: [
      'Como você se descreveria para alguém que acabou de conhecer?',
      'Você se considera mais tímida, extrovertida ou depende da situação?',
      'Se fosse para definir sua personagem, qual seria a escolha? (carinhosa, brincalhona, reservada, direta, romântica, irônica, dominadora, permite adequação de acordo com o assinante)',
      'Quais manias, trejeitos, expressões ou bordões são mais usados por você?',
      'Que tipo de humor você tem? Quais brincadeiras gosta de fazer?',
      'O que costuma deixar você feliz ou empolgada?',
      'O que costuma irritar você?',
    ],
  },
  {
    titulo: 'Como ela escreve',
    perguntas: [
      'Você usa "você", "vc", "cê", "tu" ou outra forma? Escreva exemplos.',
      'Quais abreviações costuma usar? (ex.: pq, tbm, nn, ss, mds)',
      'Como costuma começar as mensagens?',
      'Como usa vírgulas, acentos, pontos e interrogações? (nunca, pouco, intermediário, sempre)',
      'Qual nível de escrita mais te satisfaz?',
      'Costuma alongar palavras, como "oiii", "ameeei" e "nossaaa"?',
      'Como escreve quando acha algo engraçado? Diferencie uma risada discreta de uma gargalhada.',
      'Quais risadas você costuma usar?',
      'Usa palavrões? Com que frequência?',
      'Quais emojis mais usa?',
      'Usa apelidos carinhosos como "amor", "vida", "bem" ou "bb"? Quais autoriza e em quais situações?',
      'Usa figurinhas, memes ou emoticons, como ":)" e "<3"? De que tipo?',
      'Escreve em outros idiomas? Qual é seu nível e como costuma conversar neles?',
      'Escreva cinco mensagens que representem muito bem seu jeito de falar.',
    ],
  },
  {
    titulo: 'Gostos e vida',
    perguntas: [
      'Quais são suas cores favoritas? Existe alguma que não gosta?',
      'Qual é sua comida favorita?',
      'Quais comidas você não gosta ou não comeria?',
      'Você gosta de frutas? Quais prefere e quais não gosta?',
      'Qual é seu doce ou sobremesa favorita?',
      'Qual é seu lanche, pizza ou pedido de delivery favorito?',
      'Quais são suas bebidas favoritas sem álcool?',
      'Consome bebidas alcoólicas? Se quiser informar, quais gosta e quais não gosta?',
      'Gosta de café, chá ou chimarrão? Como prefere?',
      'Tem alguma restrição alimentar, intolerância ou alergia? Pode ser mencionado ao público?',
      'Segue algum estilo de alimentação, como vegetariano ou vegano?',
      'Gosta de cozinhar? Qual prato sabe fazer melhor?',
      'Prefere doce ou salgado? Comer fora ou pedir em casa?',
      'Torce para algum time? Qual? Acompanha mesmo ou apenas simpatiza?',
      'Pratica ou acompanha algum esporte?',
      'Joga videogame, computador ou celular? Quais jogos e personagens prefere?',
      'Quais são seus filmes, séries e animes favoritos?',
      'Quais estilos musicais, artistas e músicas mais gosta?',
      'Gosta de ler? Quais livros ou gêneros?',
      'Prefere praia, campo ou cidade? Calor ou frio?',
      'É mais caseira ou gosta de sair? Quais tipos de passeio prefere?',
      'Tem pets? Quais informações sobre eles autoriza compartilhar?',
      'Existe algum assunto que você não acompanha e não gostaria que a equipe fingisse dominar?',
      'Faz academia ou alguma atividade física?',
      'Tem tatuagens ou piercings? Quantas? Qual significado?',
      'Você fuma? Qual marca, essência ou sabor prefere?',
    ],
  },
  {
    titulo: 'Limites e o que não mencionar',
    perguntas: [
      'Quais informações pessoais nunca devem ser compartilhadas?',
      'Que tipo de piada ou brincadeira você não autoriza utilizar?',
      'Quais pedidos devem ser recusados imediatamente? (ex.: namoro, encontro pessoal)',
      'Como a equipe deve responder a pedidos de encontro, contato pessoal ou localização?',
      'Existe algum limite ou informação que jamais pode ser presumido ou inventado em seu nome?',
    ],
  },
  {
    titulo: 'Personalizados',
    perguntas: [
      'Personalizados que você FAZ',
      'Personalizados que você NÃO FAZ (que não esteja listado acima)',
      'Regra de fechamento (a equipe fecha o que não estiver listado, com prazo mínimo de 3 dias)',
    ],
  },
];

const QUESTIONARIO_EMPRESA = [
  { titulo: 'Quem somos', perguntas: ['Quem somos e o que fazemos?'] },
  {
    titulo: 'Tom de voz',
    perguntas: ['Como falamos com o público e com as modelos?'],
  },
  {
    titulo: 'Limites e conduta',
    perguntas: ['O que não é aceito em hipótese alguma?'],
  },
  { titulo: 'Sigilo', perguntas: ['O que é confidencial e não sai da equipe?'] },
  {
    titulo: 'Fluxo de trabalho',
    perguntas: ['Como abrir turno, registrar venda, pedir folga e avisar um problema?'],
  },
];

const perguntasDoTipo = (tipo) =>
  tipo === TIPO_EMPRESA ? QUESTIONARIO_EMPRESA : QUESTIONARIO_MODELO;

const comId = (secao, indiceSecao) => ({
  id: secao.id || `s${indiceSecao + 1}`,
  titulo: secao.titulo || '',
  texto: secao.texto || '',
  itens: (Array.isArray(secao.itens) ? secao.itens : []).map((item, indiceItem) => ({
    id: item.id || `s${indiceSecao + 1}q${indiceItem + 1}`,
    pergunta: item.pergunta || '',
    resposta: item.resposta || '',
    copiar: Boolean(item.copiar),
  })),
});

/** Deixa qualquer coisa vinda do banco no formato atual, sem jogar nada fora. */
export const normalizarSecoes = (secoes) =>
  (Array.isArray(secoes) ? secoes : []).map(comId);

/** Playbook novo: o questionário já montado, com as perguntas em branco. */
export const secoesIniciais = (tipo) =>
  perguntasDoTipo(tipo).map((secao, indiceSecao) =>
    comId(
      {
        titulo: secao.titulo,
        itens: (secao.perguntas || []).map((pergunta, indiceItem) => ({
          id: `s${indiceSecao + 1}q${indiceItem + 1}`,
          pergunta,
          resposta: '',
          copiar: Boolean(secao.copiar),
        })),
      },
      indiceSecao
    )
  );

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
