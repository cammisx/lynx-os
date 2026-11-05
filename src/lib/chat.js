/**
 * Regras de exibição do chat interno.
 *
 * Aqui ficam apenas funções puras: quem enxerga qual canal, como o canal se
 * chama para cada pessoa, contagem de não lidas e formatação de horário.
 * A conversa com o banco fica no hook useChat.
 */

export const CANAL_GERAL = 'geral';
export const CANAL_MODELO = 'modelo';
export const CANAL_PRIVADO = 'privado';
export const CANAL_GRUPO = 'grupo';

export const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

export const ehAdmin = (usuario) => usuario?.role === 'admin';

/** Chave usada para não duplicar os canais automáticos (geral e um por modelo). */
export const chaveDoCanal = (canal) => {
  if (!canal) return '';
  if (canal.tipo === CANAL_MODELO) return `modelo:${canal.modelo_id || ''}`;
  return canal.tipo || '';
};

/** Na hora de agrupar a lista, privado e grupo são únicos por id: dois privados
 *  diferentes não podem virar um só. */
export const chaveDeDedupe = (canal) => {
  if (!canal) return '';
  if (canal.tipo === CANAL_GERAL || canal.tipo === CANAL_MODELO) return chaveDoCanal(canal);
  return `unico:${canal.id}`;
};

/** Chatters vinculados a uma modelo (independente de ter turno nela). */
export const chattersDaModelo = (modelo) =>
  (modelo?.chatters || []).map((chatter) => chatter?.usuario_id).filter(Boolean);

/**
 * Quem enxerga cada canal:
 * - geral: todo mundo;
 * - modelo: chatters vinculados àquela modelo (admin vê todas as modelos);
 * - privado e grupo: somente quem está na conversa, inclusive admin.
 */
export const canalVisivel = (canal, usuario, modelos = []) => {
  if (!canal || !usuario) return false;
  if (canal.tipo === CANAL_GERAL) return true;
  if (canal.tipo === CANAL_MODELO) {
    if (ehAdmin(usuario)) return true;
    const modelo = (modelos || []).find((item) => item.id === canal.modelo_id);
    if (!modelo) return false;
    return chattersDaModelo(modelo).includes(usuario.id);
  }
  return (canal.participantes || []).includes(usuario.id);
};

const semAcento = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Nome do canal do ponto de vista de quem está olhando. */
export const nomeDoCanal = (canal, { usuario, pessoas, modelos } = {}) => {
  if (!canal) return '';
  if (canal.tipo === CANAL_GERAL) return 'Geral';
  if (canal.tipo === CANAL_MODELO) {
    const modelo = (modelos || []).find((item) => item.id === canal.modelo_id);
    return modelo?.nome || canal.nome || 'Modelo';
  }
  if (canal.tipo === CANAL_PRIVADO) {
    const outroId = (canal.participantes || []).find((id) => id !== usuario?.id);
    const outro = (pessoas || []).find((pessoa) => pessoa.id === outroId);
    return outro?.nome || outro?.email || canal.nome || 'Conversa';
  }
  return canal.nome || 'Grupo';
};

/** Rótulo pequeno embaixo do nome, para diferenciar canal de modelo e grupo. */
export const tipoDoCanal = (canal) => {
  if (!canal) return '';
  if (canal.tipo === CANAL_GERAL) return 'todos';
  if (canal.tipo === CANAL_MODELO) return 'modelo';
  if (canal.tipo === CANAL_GRUPO) return 'grupo';
  return 'privado';
};

/** Cor estável por pessoa, para o avatar de iniciais. */
const CORES = ['var(--c1)', 'var(--c5)', 'var(--c14)', 'var(--c6)', 'var(--c16)'];

export const corDaPessoa = (chave) => {
  const texto = semAcento(chave);
  let soma = 0;
  for (let i = 0; i < texto.length; i += 1) soma += texto.charCodeAt(i) * (i + 1);
  return CORES[soma % CORES.length];
};

export const iniciais = (nome) => {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
};

/**
 * O backend devolve created_date sem timezone e o valor está em UTC.
 * String sem fuso é lida pelo navegador como hora local, o que joga a data
 * 3h para frente em São Paulo. Aqui a leitura é sempre a mesma.
 */
export const paraData = (valor) => {
  if (valor instanceof Date) return valor;
  if (valor === null || valor === undefined || valor === '') return new Date(NaN);
  if (typeof valor === 'number') return new Date(valor);
  const texto = String(valor).trim();
  if (!texto) return new Date(NaN);
  const comFuso = /Z$|[+-]\d{2}:\d{2}$/.test(texto);
  return new Date(comFuso ? texto : `${texto.replace(' ', 'T')}Z`);
};

/** Mensagem oculta para mim não conta em nada: nem lista, nem badge. */
export const mensagemVisivel = (mensagem, usuarioId) =>
  Boolean(mensagem) && !(mensagem.oculta_para || []).includes(usuarioId);

/** Quantas mensagens de outras pessoas chegaram depois da última leitura. */
export const naoLidasDoCanal = (mensagens, membro, usuarioId) => {
  /* O banco devolve created_date sem timezone (UTC) e a última leitura é
     gravada com "Z". Sem passar as duas pelo mesmo parser, a mensagem parecia
     sempre mais nova que a leitura e o badge nunca zerava. */
  const desde = membro?.ultima_leitura_em ? paraData(membro.ultima_leitura_em).getTime() : 0;
  return (mensagens || []).filter((mensagem) => {
    if (mensagem.autor_id === usuarioId) return false;
    if (!mensagemVisivel(mensagem, usuarioId)) return false;
    return paraData(mensagem.created_date).getTime() > desde;
  }).length;
};

export const previewDaMensagem = (mensagem) => {
  if (!mensagem) return '';
  if (mensagem.apagada) return 'mensagem apagada';
  if (mensagem.tipo === 'imagem') return '📷 Imagem';
  if (mensagem.tipo === 'audio') return '🎤 Áudio';
  const texto = String(mensagem.texto || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return texto.length > 60 ? `${texto.slice(0, 60)}…` : texto;
};

export const horaDaMensagem = (iso) => {
  if (!iso) return '';
  const texto = String(iso).trim();
  const comFuso = /Z$|[+-]\d{2}:\d{2}$/.test(texto);
  const data = new Date(comFuso ? texto : `${texto.replace(' ', 'T')}Z`);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/** "Hoje", "Ontem" ou "05/11" para separar os blocos de mensagens por dia. */
export const diaDaMensagem = (iso) => {
  const comFuso = /Z$|[+-]\d{2}:\d{2}$/.test(String(iso).trim());
  const data = new Date(comFuso ? iso : `${String(iso).trim().replace(' ', 'T')}Z`);
  const hoje = new Date();
  const zerar = (valor) => new Date(valor.getFullYear(), valor.getMonth(), valor.getDate()).getTime();
  const diferenca = Math.round((zerar(hoje) - zerar(data)) / 86400000);
  if (diferenca === 0) return 'Hoje';
  if (diferenca === 1) return 'Ontem';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/** Quando foi a última mensagem, no formato curto da lista de canais. */
export const quandoFoi = (iso) => {
  if (!iso) return '';
  const comFuso = /Z$|[+-]\d{2}:\d{2}$/.test(String(iso).trim());
  const data = new Date(comFuso ? iso : `${String(iso).trim().replace(' ', 'T')}Z`);
  const agora = new Date();
  const mesmoDia =
    data.getDate() === agora.getDate() &&
    data.getMonth() === agora.getMonth() &&
    data.getFullYear() === agora.getFullYear();
  if (mesmoDia) return horaDaMensagem(iso);
  const ontem = new Date(agora.getTime() - 86400000);
  if (
    data.getDate() === ontem.getDate() &&
    data.getMonth() === ontem.getMonth() &&
    data.getFullYear() === ontem.getFullYear()
  ) {
    return 'ontem';
  }
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/** Ordem da lista: conversas com novidade primeiro, depois as mais recentes. */
export const ordemDosCanais = (canais = []) =>
  [...canais].sort((a, b) => {
    const movA = new Date(a.ultima_mensagem_em || a.created_date || 0).getTime();
    const movB = new Date(b.ultima_mensagem_em || b.created_date || 0).getTime();
    return movB - movA;
  });

export const resumoDoCanal = (canal, mensagens, pessoas) => {
  const ultima = [...(mensagens || [])].filter((m) => !m.apagada).slice(-1)[0];
  if (ultima) {
    const autor = (pessoas || []).find((pessoa) => pessoa.id === ultima.autor_id);
    const prefixo = canal.tipo === CANAL_PRIVADO ? '' : `${(autor?.nome || 'alguém').split(' ')[0]}: `;
    return `${prefixo}${previewDaMensagem(ultima)}`;
  }
  return canal.ultima_mensagem_preview || 'sem mensagens ainda';
};