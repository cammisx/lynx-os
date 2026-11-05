/**
 * Formatação das mensagens no estilo markdown mínimo: negrito, itálico,
 * riscado, trecho de código e link. Guardamos o texto com os marcadores e
 * montamos a mensagem como elementos React, nunca como HTML, para que ninguém
 * consiga injetar script pela mensagem.
 */

const REGRAS = [
  { tipo: 'codigo', re: /`([^`\n]+)`/ },
  { tipo: 'forte', re: /\*\*([^*\n]+)\*\*/ },
  { tipo: 'riscado', re: /~~([^~\n]+)~~/ },
  { tipo: 'italico', re: /(?<![*\w])\*([^*\s][^*\n]*[^*\s]|[^*\s])\*(?!\*)/ },
  { tipo: 'link', re: /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/ },
];

const MOLDURAS = {
  forte: ['**', '**'],
  italico: ['*', '*'],
  riscado: ['~~', '~~'],
  codigo: ['`', '`'],
  link: ['[', '](https://)'],
};

/** Quebra o texto em pedaços simples e pedaços formatados. */
export const fatiasTextoRico = (texto) => {
  let resto = String(texto || '');
  const fatias = [];
  let voltas = 0;

  while (resto && voltas < 400) {
    voltas += 1;
    let melhor = null;
    REGRAS.forEach((regra) => {
      const achado = regra.re.exec(resto);
      if (!achado) return;
      if (!melhor || achado.index < melhor.achado.index) melhor = { tipo: regra.tipo, achado };
    });

    if (!melhor) {
      fatias.push({ tipo: 'texto', valor: resto });
      break;
    }

    const { index } = melhor.achado;
    if (index > 0) fatias.push({ tipo: 'texto', valor: resto.slice(0, index) });
    fatias.push({
      tipo: melhor.tipo,
      valor: melhor.achado[1],
      url: melhor.tipo === 'link' ? melhor.achado[2] : undefined,
    });
    resto = resto.slice(index + melhor.achado[0].length);
  }

  return fatias;
};

/**
 * Envolve a seleção do campo com os marcadores do botão clicado e devolve onde
 * o cursor deve ficar, para o campo não pular para o começo do texto.
 */
export const aplicarMarcador = (valor, inicio, fim, tipo) => {
  const moldura = MOLDURAS[tipo];
  const bruto = String(valor ?? '');
  if (!moldura) return { texto: bruto, inicio, fim };

  const de = Math.max(0, Math.min(Number(inicio) || 0, bruto.length));
  const ate = Math.max(de, Math.min(Number(fim) || de, bruto.length));
  const [antes, depois] = moldura;
  const trecho = bruto.slice(de, ate) || (tipo === 'link' ? 'texto' : 'texto');
  const texto = `${bruto.slice(0, de)}${antes}${trecho}${depois}${bruto.slice(ate)}`;

  if (tipo === 'link') {
    const inicioUrl = de + antes.length + trecho.length + 2;
    return { texto, inicio: inicioUrl, fim: inicioUrl + 'https://'.length };
  }

  return {
    texto,
    inicio: de + antes.length,
    fim: de + antes.length + trecho.length,
  };
};

/** Segundos no formato do player: 1:05. */
export const tempoDeAudio = (segundos) => {
  const total = Math.max(0, Math.round(Number(segundos) || 0));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
};
