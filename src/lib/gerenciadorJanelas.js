/**
 * Janelas abertas e fixadas na barra de tarefas.
 *
 * A lista é a ordem que aparece na barra, e ela NUNCA se mexe sozinha: abrir,
 * focar ou minimizar não troca ninguém de lugar. Quem muda a ordem é o
 * usuário, arrastando o ícone.
 *
 * Cada item guarda:
 *   aberta      — a janela está montada (tem componente na tela ou minimizado);
 *   minimizada  — montada, mas escondida;
 *   fixada      — continua na barra mesmo fechada;
 *   z           — quem está na frente (o maior manda).
 */

const proximaCamada = (itens) =>
  itens.reduce((maior, item) => Math.max(maior, item.z || 0), 0) + 1;

const criarItem = (id, z) => ({ id, aberta: true, minimizada: false, fixada: false, z });

export const abrirItem = (itens, id, z) => {
  const item = itens.find((atual) => atual.id === id);
  if (!item) return [...itens, criarItem(id, z)];
  return itens.map((atual) =>
    atual.id === id ? { ...atual, aberta: true, minimizada: false, z } : atual
  );
};

/** Fechar tira da barra, a não ser que esteja fixada: aí ela ficaria só apagada. */
export const fecharItem = (itens, id) => {
  const item = itens.find((atual) => atual.id === id);
  if (!item) return itens;
  if (item.fixada) {
    return itens.map((atual) =>
      atual.id === id ? { ...atual, aberta: false, minimizada: false } : atual
    );
  }
  return itens.filter((atual) => atual.id !== id);
};

export const minimizarItem = (itens, id) =>
  itens.map((atual) => (atual.id === id ? { ...atual, minimizada: true } : atual));

export const focarItem = (itens, id, z) =>
  itens.map((atual) =>
    atual.id === id ? { ...atual, aberta: true, minimizada: false, z } : atual
  );

const visiveis = (itens) => itens.filter((item) => item.aberta && !item.minimizada);

/** Id da janela que está na frente, ou null quando todas estão fechadas/minimizadas. */
export const itemNaFrente = (itens) => {
  const lista = visiveis(itens);
  if (!lista.length) return null;
  return lista.reduce((frente, item) => (item.z > frente.z ? item : frente)).id;
};

/** Clique esquerdo no ícone: abre, restaura, foca ou minimiza. */
export const alternarItem = (itens, id, z) => {
  const item = itens.find((atual) => atual.id === id);
  if (!item || !item.aberta) return abrirItem(itens, id, z);
  if (item.minimizada) return focarItem(itens, id, z);
  if (itemNaFrente(itens) === id) return minimizarItem(itens, id);
  return focarItem(itens, id, z);
};

/** Fixar/desafixar. Desafixar uma janela fechada tira ela da barra de vez. */
export const fixarItem = (itens, id) => {
  const item = itens.find((atual) => atual.id === id);
  if (!item) return itens;
  if (item.fixada && !item.aberta) return itens.filter((atual) => atual.id !== id);
  return itens.map((atual) => (atual.id === id ? { ...atual, fixada: !atual.fixada } : atual));
};

/** Reordenar: sai da posição de origem e entra na de destino. */
export const moverItem = (itens, origem, destino) => {
  if (origem === destino) return itens;
  if (origem < 0 || destino < 0 || origem >= itens.length || destino >= itens.length) return itens;
  const copia = [...itens];
  const [item] = copia.splice(origem, 1);
  copia.splice(destino, 0, item);
  return copia;
};
