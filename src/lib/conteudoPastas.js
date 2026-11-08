/**
 * Pastas e itens do conteúdo de cada modelo.
 *
 * A modelo tem pastas; dentro delas ficam os itens que ela vende ou publica.
 * Cada item guarda uma imagem (capa, obrigatória), o tipo (vídeo, foto ou
 * áudio), a duração quando é vídeo ou áudio, a data e, se quiser, nome,
 * descrição e tags.
 *
 * Tags são sempre MAIÚSCULAS e sem espaço sobrando: assim "Natal", "natal" e
 * "NATAL " não viram três tags diferentes.
 */

export const TIPOS = [
  { value: 'video', label: 'Vídeo' },
  { value: 'foto', label: 'Foto' },
  { value: 'audio', label: 'Áudio' },
];

export const tipoValido = (tipo) =>
  TIPOS.some((item) => item.value === tipo) ? tipo : '';

export const tipoLabel = (tipo) => TIPOS.find((item) => item.value === tipo)?.label || 'Sem tipo';

export const precisaDuracao = (tipo) => tipo === 'video' || tipo === 'audio';

const novoId = (prefixo) =>
  `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const pad = (valor) => String(valor).padStart(2, '0');

/** Data escolhida no calendário vira "2026-11-08" no banco. */
export const diaISO = (data) =>
  data ? `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` : '';

export const diaDeISO = (iso) => {
  const texto = String(iso || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export const diaTexto = (iso) => {
  const data = diaDeISO(iso);
  return data ? `${pad(data.getDate())}/${pad(data.getMonth() + 1)}/${data.getFullYear()}` : '—';
};

/** Duração em segundos vira "3:20" (ou "1:02:05" quando passa de uma hora). */
export const duracaoTexto = (segundos) => {
  const total = Math.max(0, Math.round(Number(segundos) || 0));
  if (!total) return '—';
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segs = total % 60;
  if (horas) return `${horas}:${pad(minutos)}:${pad(segs)}`;
  return `${minutos}:${pad(segs)}`;
};

export const segundosDe = (minutos, segundos) => {
  const min = Math.max(0, Math.floor(Number(minutos) || 0));
  const seg = Math.max(0, Math.min(59, Math.floor(Number(segundos) || 0)));
  return min * 60 + seg;
};

export const partesDaDuracao = (segundos) => {
  const total = Math.max(0, Math.round(Number(segundos) || 0));
  return { minutos: Math.floor(total / 60), segundos: total % 60 };
};

/* ---------- tags ---------- */

/** Forma canônica: sem espaço sobrando, tudo em maiúscula. */
export const tagNormalizada = (texto) =>
  String(texto || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

export const juntarTags = (lista = []) => {
  const vistas = new Set();
  const saida = [];
  (lista || []).forEach((tag) => {
    const limpa = tagNormalizada(tag);
    if (!limpa || vistas.has(limpa)) return;
    vistas.add(limpa);
    saida.push(limpa);
  });
  return saida.sort((a, b) => a.localeCompare(b, 'pt-BR'));
};

export const temTag = (lista = [], tag) =>
  juntarTags(lista).includes(tagNormalizada(tag));

export const comTag = (lista = [], tag) => {
  const limpa = tagNormalizada(tag);
  if (!limpa) return juntarTags(lista);
  return juntarTags([...(lista || []), limpa]);
};

export const semTag = (lista = [], tag) =>
  juntarTags(lista).filter((item) => item !== tagNormalizada(tag));

/** Todas as tags já usadas nos conteúdos que a pessoa pode ver. */
export const tagsDeConteudos = (conteudos = []) => {
  const todas = [];
  (conteudos || []).forEach((conteudo) => {
    pastasDe(conteudo).forEach((pasta) => {
      (pasta.itens || []).forEach((item) => {
        (item.tags || []).forEach((tag) => todas.push(tag));
      });
    });
  });
  return juntarTags(todas);
};

/* ---------- pastas e itens ---------- */

export const novoItemDeConteudo = () => ({
  id: novoId('item'),
  nome: '',
  imagem_url: '',
  tipo: '',
  duracao_seg: null,
  data: '',
  descricao: '',
  tags: [],
});

export const itemNormalizado = (item = {}) => ({
  id: item.id || novoId('item'),
  nome: String(item.nome || ''),
  imagem_url: String(item.imagem_url || ''),
  tipo: tipoValido(item.tipo),
  duracao_seg: precisaDuracao(item.tipo) ? Math.max(0, Math.round(Number(item.duracao_seg) || 0)) : null,
  data: String(item.data || ''),
  descricao: String(item.descricao || ''),
  tags: juntarTags(item.tags || []),
});

export const novaPastaConteudo = (nome = 'Nova pasta') => ({
  id: novoId('pasta'),
  nome: String(nome || 'Nova pasta'),
  itens: [],
});

export const pastasDe = (conteudo) =>
  (conteudo?.pastas || []).map((pasta) => ({
    id: pasta.id || novoId('pasta'),
    nome: String(pasta.nome || 'Nova pasta'),
    itens: (pasta.itens || []).map(itemNormalizado),
  }));

export const pastaPorId = (pastas = [], pastaId) =>
  (pastas || []).find((pasta) => pasta.id === pastaId) || null;

export const contarItens = (pasta) => (pasta?.itens || []).length;

/** O que falta para o item poder ser salvo. Vazio = tudo certo. */
export const validarItem = (item = {}) => {
  const erros = {};
  if (!String(item.imagem_url || '').trim()) erros.imagem_url = 'Manda a imagem do item.';
  if (!tipoValido(item.tipo)) erros.tipo = 'Escolhe vídeo, foto ou áudio.';
  if (precisaDuracao(item.tipo) && !(Number(item.duracao_seg) > 0)) {
    erros.duracao = 'Diz a duração em minutos e segundos.';
  }
  if (!String(item.data || '').trim()) erros.data = 'Escolhe a data.';
  return erros;
};

/** Título do cartão: o tipo com a data (o item não tem mais campo de nome). */
export const tituloDoItem = (item) => {
  const nome = String(item?.nome || '').trim();
  if (nome) return nome;
  return item?.data ? `${tipoLabel(item.tipo)} de ${diaTexto(item.data)}` : 'Item sem data';
};
