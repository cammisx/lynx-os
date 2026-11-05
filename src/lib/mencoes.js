/**
 * Menções no chat: "@fulano" e "@todos".
 *
 * O texto da mensagem continua sendo texto puro (nada de HTML), então a menção
 * é reconhecida comparando o que foi escrito com os nomes de quem está no
 * canal. Nomes com espaço ("Camille Chloë") funcionam porque o seletor do
 * campo sempre insere o nome completo de uma vez.
 */

/** Formas aceitas de chamar todo mundo. */
export const ATALHOS_TODOS = ['todos', 'todas', 'all', 'everyone', 'geral'];

/** Comparação sem acento e sem caixa: "Chloë" casa com "@chloe". */
export const normalizar = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const escapar = (valor) => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** O trecho "@..." que está sendo digitado antes do cursor (ou null). */
export const consultaDeMencao = (texto, cursor) => {
  const antes = String(texto || '').slice(0, cursor ?? String(texto || '').length);
  const achado = antes.match(/(^|[\s(])@([^\s@]{0,30})$/);
  if (!achado) return null;
  return {
    inicio: antes.length - achado[2].length - 1,
    consulta: achado[2],
  };
};

/**
 * Opções para o seletor: primeiro "todos", depois quem está no canal que casa
 * com o que foi digitado.
 */
export const opcoesDeMencao = (consulta, pessoas = [], { limite = 6 } = {}) => {
  const buscado = normalizar(consulta);
  const opcoes = [];

  if (!buscado || 'todos'.startsWith(buscado) || buscado === 'todas') {
    opcoes.push({ id: 'todos', nome: 'todos', rotulo: 'todos', atalho: true });
  }

  const vistos = new Set();
  (Array.isArray(pessoas) ? pessoas : []).forEach((pessoa) => {
    const nome = String(pessoa?.nome || '').trim();
    if (!nome || !pessoa?.id || vistos.has(pessoa.id)) return;
    vistos.add(pessoa.id);
    const alvo = normalizar(nome);
    // Casa pelo começo ou por qualquer palavra do meio ("chloe" acha "Camille Chloë").
    const casa =
      !buscado ||
      alvo.startsWith(buscado) ||
      alvo.split(/\s+/).some((parte) => parte.startsWith(buscado)) ||
      alvo.includes(buscado);
    if (casa) opcoes.push({ id: pessoa.id, nome, rotulo: nome, foto_url: pessoa.foto_url || '' });
  });

  return opcoes.slice(0, Math.max(1, limite) + 1);
};

/**
 * Quem foi mencionado na mensagem.
 * Devolve { todos, ids } — ids já sem o autor.
 */
export const acharMencoes = (texto, pessoas = [], autorId = '') => {
  const alvo = normalizar(texto);
  if (!alvo) return { todos: false, ids: [] };

  const atalho = ATALHOS_TODOS.some((forma) => new RegExp(`@${forma}\\b`).test(alvo));
  const lista = (Array.isArray(pessoas) ? pessoas : []).filter((pessoa) => pessoa?.id && pessoa?.nome);

  if (atalho) {
    return { todos: true, ids: lista.map((pessoa) => pessoa.id).filter((id) => id !== autorId) };
  }

  // Do nome mais longo para o mais curto: "Ana Paula" não deve casar como "Ana".
  const ordenadas = [...lista].sort((a, b) => String(b.nome).length - String(a.nome).length);
  const achados = [];
  const consumido = alvo;

  ordenadas.forEach((pessoa) => {
    const nome = normalizar(pessoa.nome);
    if (!nome) return;
    // O nome pode ter espaço; a menção é "@" + nome completo.
    const padrao = new RegExp(`@${escapar(nome).replace(/\s+/g, '\\s+')}\\b`);
    if (padrao.test(consumido) || consumido.includes(`@${nome}`)) achados.push(pessoa.id);
  });

  return { todos: false, ids: [...new Set(achados)].filter((id) => id !== autorId) };
};

/** Trecho curto da mensagem para a notificação. */
export const resumoDaMensagem = (texto, limite = 90) => {
  const limpo = String(texto || '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite - 1)}…`;
};

/** Sobrenome curto de quem mandou: "Camille Chloë" vira "Camille". */
export const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || 'Alguém';
