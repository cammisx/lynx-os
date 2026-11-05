/**
 * Regras de exibição do chat interno.
 *
 * Aqui ficam apenas funções puras: quem enxerga qual canal, como o canal se
 * chama para cada pessoa, contagem de não lidas e formatação de horário.
 * A conversa com o banco fica no hook useChat.
 */

/**
 * O backend devolve `created_date` em UTC mas sem o sufixo de fuso
 * ("2026-11-05T15:55:12.68"). O navegador lê uma string dessas como hora local,
 * então o UTC cru aparecia na tela. Aqui a string sem fuso é marcada como UTC e
 * o horário é exibido no fuso da agência, sem depender do fuso do dispositivo.
 */
const FUSO = 'America/Sao_Paulo';

export const paraData = (valor) => {
  if (valor instanceof Date) return valor;
  if (!valor) return new Date(NaN);
  const texto = String(valor).trim();
  const semFuso = !/Z$|[+-]\d{2}:\d{2}$/.test(texto);
  return new Date(semFuso ? `${texto.replace(' ', 'T')}Z` : texto);
};

export const horaLocal = (valor) => {
  const data = paraData(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: FUSO });
};

/** Dia no fuso da agência (2026-11-05), para separar blocos e comparar dias. */
const diaNoFuso = (data) => data.toLocaleDateString('en-CA', { timeZone: FUSO });

const diaCurto = (valor) => {
  const data = paraData(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO });
};

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

/** Mensagem oculta para mim não conta em nada: nem lista, nem badge. */
export const mensagemVisivel = (mensagem, usuarioId) =>
  Boolean(mensagem) && !(mensagem.oculta_para || []).includes(usuarioId);

/** Quantas mensagens de outras pessoas chegaram depois da última leitura. */
export const naoLidasDoCanal = (mensagens, membro, usuarioId) => {
  const desde = membro?.ultima_leitura_em ? new Date(membro.ultima_leitura_em).getTime() : 0;
  return (mensagens || []).filter((mensagem) => {
    if (mensagem.autor_id === usuarioId) return false;
    if (!mensagemVisivel(mensagem, usuarioId)) return false;
    return new Date(mensagem.created_date).getTime() > desde;
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

export const horaDaMensagem = (iso) => horaLocal(iso);

/** "Hoje", "Ontem" ou "05/11" para separar os blocos de mensagens por dia. */
export const diaDaMensagem = (iso) => {
  const dia = diaNoFuso(paraData(iso));
  if (dia === diaNoFuso(new Date())) return 'Hoje';
  if (dia === diaNoFuso(new Date(Date.now() - 86400000))) return 'Ontem';
  return diaCurto(iso);
};

/** Quando foi a última mensagem, no formato curto da lista de canais. */
export const quandoFoi = (iso) => {
  if (!iso) return '';
  const dia = diaNoFuso(paraData(iso));
  if (dia === diaNoFuso(new Date())) return horaDaMensagem(iso);
  if (dia === diaNoFuso(new Date(Date.now() - 86400000))) return 'ontem';
  return diaCurto(iso);
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