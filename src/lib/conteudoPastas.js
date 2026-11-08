/**
 * Pastas e itens do conteúdo de cada modelo.
 *
 * A modelo tem pastas; os itens ficam soltos no conteúdo e cada item diz em
 * quais pastas ele aparece (uma ou mais). Assim o mesmo item pode viver em
 * duas pastas sem virar duas cópias.
 *
 * Cada item guarda uma imagem (obrigatória), o tipo (vídeo, foto ou áudio), a
 * duração quando é vídeo ou áudio, a data e, se quiser, descrição e tags.
 *
 * Tags são sempre MAIÚSCULAS e sem espaço sobrando: "Natal", "natal" e "NATAL "
 * são a mesma tag.
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

/** Tags usadas nos itens (do item que está na tela, salvo ou não). */
export const tagsDosItens = (itens = []) => {
  const todas = [];
  (itens || []).forEach((item) => {
    (item.tags || []).forEach((tag) => todas.push(tag));
  });
  return juntarTags(todas);
};

/** Todas as tags já usadas nos conteúdos que a pessoa pode ver. */
export const tagsDeConteudos = (conteudos = []) => {
  const todas = [];
  (conteudos || []).forEach((conteudo) => {
    const { itens } = conteudoNormalizado(conteudo);
    itens.forEach((item) => (item.tags || []).forEach((tag) => todas.push(tag)));
  });
  return juntarTags(todas);
};

/* ---------- pastas e itens ---------- */

/** Preço em reais com dois decimais, ou null quando está vazio. */
export const numeroPreco = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 0) return null;
  return Math.round(numero * 100) / 100;
};

export const novoItemDeConteudo = (pastas = []) => ({
  id: novoId('item'),
  nome: '',
  imagem_url: '',
  tipo: '',
  duracao_seg: null,
  data: '',
  descricao: '',
  tags: [],
  pastas: (pastas || []).filter(Boolean),
  preco_minimo: null,
  preco_normal: null,
  preco_maximo: null,
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
  pastas: Array.from(new Set((item.pastas || []).filter(Boolean))),
  preco_minimo: numeroPreco(item.preco_minimo),
  preco_normal: numeroPreco(item.preco_normal),
  preco_maximo: numeroPreco(item.preco_maximo),
});

export const novaPastaConteudo = (nome = 'Nova pasta') => ({
  id: novoId('pasta'),
  nome: String(nome || 'Nova pasta'),
});

/**
 * Lê o conteúdo em qualquer formato e devolve sempre { pastas, itens }.
 *
 * O formato antigo guardava os itens dentro de cada pasta. Quem abrir um
 * conteúdo assim vê os itens migrados para a lista solta, marcados na pasta
 * onde estavam, e nada se perde.
 */
export const conteudoNormalizado = (conteudo) => {
  const pastasBrutas = conteudo?.pastas || [];

  const pastas = pastasBrutas.map((pasta) => ({
    id: pasta.id || novoId('pasta'),
    nome: String(pasta.nome || 'Nova pasta'),
  }));

  const itens = (conteudo?.itens || []).map(itemNormalizado);

  pastasBrutas.forEach((pasta, indice) => {
    const pastaId = pastas[indice].id;
    (pasta.itens || []).forEach((bruto) => {
      const item = itemNormalizado({ ...bruto, pastas: [pastaId] });
      const igual = itens.find((linha) => linha.id === item.id);
      if (igual) {
        if (!igual.pastas.includes(pastaId)) igual.pastas.push(pastaId);
      } else {
        itens.push(item);
      }
    });
  });

  /* Pasta apagada não pode continuar marcada no item. */
  const ids = new Set(pastas.map((pasta) => pasta.id));
  itens.forEach((item) => {
    item.pastas = item.pastas.filter((pastaId) => ids.has(pastaId));
  });

  return { pastas, itens };
};

export const pastaPorId = (pastas = [], pastaId) =>
  (pastas || []).find((pasta) => pasta.id === pastaId) || null;

export const itensDaPasta = (itens = [], pastaId) =>
  (itens || []).filter((item) => (item.pastas || []).includes(pastaId));

export const contarItens = (itens = [], pastaId) => itensDaPasta(itens, pastaId).length;

/** Nome das pastas de um item, na ordem das pastas do conteúdo. */
export const nomesDasPastas = (item, pastas = []) =>
  (item?.pastas || [])
    .map((pastaId) => pastaPorId(pastas, pastaId)?.nome)
    .filter(Boolean);

/* ---------- busca e filtros ---------- */

export const normalizarBusca = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Busca por termo (descrição e tags, sem ligar para acento ou caixa) e filtro
 * de tags: o item precisa ter TODAS as tags escolhidas.
 */
export const filtrarItens = (itens = [], { busca = '', tags = [] } = {}) => {
  const termo = normalizarBusca(busca);
  const pedidas = juntarTags(tags);
  const partes = termo ? termo.split(/\s+/).filter(Boolean) : [];

  return (itens || []).filter((item) => {
    const tagsDoItem = juntarTags(item.tags || []);
    if (pedidas.length && !pedidas.every((tag) => tagsDoItem.includes(tag))) return false;
    if (!partes.length) return true;
    const texto = normalizarBusca([item.descricao || '', tagsDoItem.join(' ')].join(' '));
    return partes.every((parte) => texto.includes(parte));
  });
};

/** O que falta para o item poder ser salvo. Vazio = tudo certo. */
export const validarItem = (item = {}) => {
  const erros = {};
  if (!String(item.imagem_url || '').trim()) erros.imagem_url = 'Manda a imagem do item.';
  if (!tipoValido(item.tipo)) erros.tipo = 'Escolhe vídeo, foto ou áudio.';
  if (precisaDuracao(item.tipo) && !(Number(item.duracao_seg) > 0)) {
    erros.duracao = 'Diz a duração em minutos e segundos.';
  }
  if (!String(item.data || '').trim()) erros.data = 'Escolhe a data.';
  if (!(item.pastas || []).length) erros.pastas = 'Marca pelo menos uma pasta.';
  return erros;
};

/** Preços do item, na ordem mínimo, normal e máximo (null quando vazio). */
export const precosDoItem = (item) => [
  numeroPreco(item?.preco_minimo),
  numeroPreco(item?.preco_normal),
  numeroPreco(item?.preco_maximo),
];

/** Título do cartão: o tipo com a data (o item não tem campo de nome). */
export const tituloDoItem = (item) => {
  const nome = String(item?.nome || '').trim();
  if (nome) return nome;
  return item?.data ? `${tipoLabel(item.tipo)} de ${diaTexto(item.data)}` : 'Item sem data';
};
