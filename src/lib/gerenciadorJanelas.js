/**
 * Quais janelas estão abertas e em que ordem.
 *
 * A lista é a própria ordem de empilhamento: a última é a que está na frente.
 * Minimizada continua na lista (com o componente vivo, sem perder o que foi
 * digitado) e volta para a frente quando é restaurada.
 */

export const abrirJanela = (janelas, id) => {
  const existente = janelas.find((janela) => janela.id === id);
  const jaNaFrente =
    existente && !existente.minimizada && janelas[janelas.length - 1]?.id === id;
  if (jaNaFrente) return janelas;
  const semEla = janelas.filter((janela) => janela.id !== id);
  if (existente) return [...semEla, { ...existente, minimizada: false }];
  return [...semEla, { id, minimizada: false }];
};

export const fecharJanela = (janelas, id) => janelas.filter((janela) => janela.id !== id);

export const minimizarJanela = (janelas, id) =>
  janelas.map((janela) => (janela.id === id ? { ...janela, minimizada: true } : janela));

/** Clique no ícone da barra: minimiza a que está na frente, senão traz para a frente. */
export const alternarJanela = (janelas, id) => {
  const alvo = janelas.find((janela) => janela.id === id);
  if (!alvo) return abrirJanela(janelas, id);
  const naFrente = janelas[janelas.length - 1]?.id === id;
  if (alvo.minimizada || !naFrente) return abrirJanela(janelas, id);
  return minimizarJanela(janelas, id);
};

/** A que está na frente e visível manda no destaque da barra. */
export const janelaAtiva = (janelas) => {
  const visiveis = janelas.filter((janela) => !janela.minimizada);
  return visiveis.length ? visiveis[visiveis.length - 1].id : null;
};
