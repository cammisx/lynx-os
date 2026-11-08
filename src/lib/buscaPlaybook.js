/**
 * Busca dentro do playbook.
 *
 * O chatter procura "risada", "personalizado", "limite". A busca ignora
 * maiúscula e acento, então "calcao" acha "calção" e vice-versa.
 */

/** Texto sem acento e em minúsculas. */
export const semAcento = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Cada letra do texto normalizado aponta para a posição dela no original.
 * É o que permite destacar o trecho certo mesmo quando a palavra tem acento.
 */
export const mapaDoTexto = (texto) => {
  const letras = [];
  const origens = [];
  for (let i = 0; i < texto.length; i += 1) {
    const base = semAcento(texto[i]);
    for (let k = 0; k < base.length; k += 1) {
      letras.push(base[k]);
      origens.push(i);
    }
  }
  return { normalizado: letras.join(''), origens };
};

/** Pedaços do texto: strings normais e trechos que casaram com a busca. */
export const pedacosDestacados = (texto, termo) => {
  const conteudo = String(texto ?? '');
  const alvo = semAcento(termo);
  if (!alvo) return [{ texto: conteudo, destaque: false }];

  const { normalizado, origens } = mapaDoTexto(conteudo);
  const pedacos = [];
  let cursor = 0;
  let achado = normalizado.indexOf(alvo);

  while (achado !== -1) {
    const inicio = origens[achado];
    const fim = origens[achado + alvo.length - 1] + 1;
    if (inicio > cursor) pedacos.push({ texto: conteudo.slice(cursor, inicio), destaque: false });
    pedacos.push({ texto: conteudo.slice(inicio, fim), destaque: true });
    cursor = fim;
    achado = normalizado.indexOf(alvo, achado + alvo.length);
  }

  if (!pedacos.length) return [{ texto: conteudo, destaque: false }];
  if (cursor < conteudo.length) pedacos.push({ texto: conteudo.slice(cursor), destaque: false });
  return pedacos;
};

/**
 * Só as seções e perguntas que têm a ver com o termo.
 * Seção que casa pelo título ou pelo texto explicativo aparece inteira;
 * seção que casa só por alguma pergunta aparece só com as perguntas certas.
 */
export const filtrarSecoes = (secoes, termo) => {
  const alvo = semAcento(termo).trim();
  if (!alvo) return secoes;

  return (secoes || [])
    .map((secao) => {
      if (semAcento(secao?.titulo).includes(alvo)) return secao;
      /* Só o texto corrido, que é o que a leitura mostra. A descrição da
         seção é instrução para quem preenche, e não aparece para o chatter. */
      if (semAcento(secao?.texto).includes(alvo)) return { ...secao, itens: [] };

      const itens = (secao?.itens || []).filter(
        (item) =>
          semAcento(item?.pergunta).includes(alvo) || semAcento(item?.resposta).includes(alvo)
      );
      return itens.length ? { ...secao, itens } : null;
    })
    .filter(Boolean);
};

/** Perguntas que a leitura mostra: só as que já foram respondidas. */
export const itensParaLeitura = (secao) =>
  (secao?.itens || []).filter(
    (item) => String(item?.pergunta || '').trim() && String(item?.resposta || '').trim()
  );

export const contarItens = (secoes) =>
  (secoes || []).reduce((soma, secao) => soma + (secao?.itens?.length || 0), 0);
