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
 * Quem lê: todo mundo lê o playbook da empresa e os das modelos a que está
 * atribuído. O admin lê todos os ativos. Só o admin edita.
 */
import { chattersDaModelo, ehAdmin } from '@/lib/chat';

export const TIPO_EMPRESA = 'empresa';
export const TIPO_MODELO = 'modelo';

/** Diretrizes que já vêm escritas para ninguém começar no vazio. */
export const SECOES_PADRAO_EMPRESA = [
  {
    titulo: 'Quem somos',
    texto:
      'Apresente a agência em poucas linhas: o que fazemos, com quem trabalhamos e o que o cliente pode esperar de nós.',
  },
  {
    titulo: 'Tom de voz',
    texto:
      'Como falamos com o público e com as modelos. Ex.: próximo, respeitoso, sem formalidade excessiva, nunca prometendo o que não podemos entregar.',
  },
  {
    titulo: 'Limites e conduta',
    texto:
      'O que não é aceito em hipótese alguma: assédio, exposição de dados, combinar encontros presenciais, falar em nome da modelo sem autorização.',
  },
  {
    titulo: 'Sigilo',
    texto:
      'Tudo o que passa nas conversas é confidencial. Prints, valores e informações das modelos não saem da equipe.',
  },
  {
    titulo: 'Fluxo de trabalho',
    texto: 'Como abrir turno, registrar venda, pedir folga e avisar um problema.',
  },
];

export const SECOES_PADRAO_MODELO = [
  {
    titulo: 'Perfil e posicionamento',
    texto:
      'Quem é a modelo, para quem ela fala e o que a diferencia. É o que todo mundo precisa ter na cabeça antes de responder uma mensagem.',
  },
  {
    titulo: 'Tom de voz',
    texto: 'Como ela escreve: emojis, informalidade, tempo de resposta, apelidos que usa.',
  },
  {
    titulo: 'O que oferecer',
    texto: 'Conteúdos, packs e mimos que estão disponíveis, com valores e quando oferecer.',
  },
  {
    titulo: 'Limites',
    texto: 'O que não é feito, o que não é falado e quando encerrar uma conversa.',
  },
  {
    titulo: 'Combinações do turno',
    texto: 'Horários, frequência de posts, quando chamar a modelo e quando resolver sozinho.',
  },
];

const comId = (secao, indice) => ({
  id: secao.id || `s${indice + 1}`,
  titulo: secao.titulo || '',
  texto: secao.texto || '',
});

export const secoesIniciais = (tipo) =>
  (tipo === TIPO_EMPRESA ? SECOES_PADRAO_EMPRESA : SECOES_PADRAO_MODELO).map(comId);

export const normalizarSecoes = (secoes) =>
  (Array.isArray(secoes) ? secoes : []).map(comId);

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
