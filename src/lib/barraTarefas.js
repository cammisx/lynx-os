/**
 * Ordem e janelas fixadas da barra de tarefas, por usuário.
 *
 * Vai e volta do banco como texto separado por vírgula ("turnos,financeiro"),
 * que é o formato que o User aceita bem; aqui dentro é sempre array.
 */

export const emLista = (valor) => {
  if (Array.isArray(valor)) return valor.map((id) => String(id).trim()).filter(Boolean);
  if (typeof valor === 'string') {
    return valor
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [];
};

export const escreverBarra = (lista) => emLista(lista).join(',');

export const lerBarra = (dado = {}) => ({
  ordem: emLista(dado.ordem),
  fixadas: emLista(dado.fixadas),
});

/** Junta a ordem que está na tela com as janelas lembradas que não estão abertas. */
export const juntarOrdem = (itens, anterior = []) => {
  const atuais = itens.map((item) => item.id);
  return [...atuais, ...emLista(anterior).filter((id) => !atuais.includes(id))];
};

/**
 * Onde uma janela deve nascer: antes de todas as que ficavam depois dela.
 * O índice é relativo (quantos vizinhos de barra vêm antes), não o número
 * cru da lista salva, senão uma janela fixada sozinha empurraria tudo.
 */
export const posicaoDeEntrada = (itens, id, ordemAnterior = []) => {
  const lista = emLista(ordemAnterior);
  const indice = lista.indexOf(id);
  if (indice < 0) return itens.length;
  return itens.filter((item) => {
    const posicaoDele = lista.indexOf(item.id);
    return posicaoDele >= 0 && posicaoDele < indice;
  }).length;
};

/**
 * Aplica a ordem salva quando o perfil chega do banco.
 * Janelas fixadas e fechadas voltam para a barra; o resto é só memória de
 * posição, para a janela abrir onde estava.
 */
export const hidratarItens = (itens, ordem = [], fixadas = []) => {
  const lista = emLista(ordem);
  const presas = emLista(fixadas);
  if (!lista.length && !presas.length) return itens;

  const base = itens.length
    ? itens
    : presas.map((id) => ({ id, aberta: false, minimizada: false, fixada: true, z: 0 }));

  const mapa = new Map(
    base.map((item) => [item.id, { ...item, fixada: item.fixada || presas.includes(item.id) }])
  );
  const emOrdem = lista.filter((id) => mapa.has(id)).map((id) => mapa.get(id));
  const resto = [...mapa.values()].filter((item) => !lista.includes(item.id));
  return [...emOrdem, ...resto];
};
