/**
 * Ordem das agendas das modelos no painel do relógio, por usuário.
 *
 * É só preferência de visualização de quem está olhando: cada pessoa arruma as
 * abas do seu jeito. Fica no User (campo agenda_ordem, igual à barra de
 * tarefas) e no localStorage, para valer antes do banco responder.
 */
import { emLista } from '@/lib/barraTarefas';

export const CHAVE_ORDEM_AGENDA = 'lynx:agenda-ordem';

export const lerOrdemAgendaLocal = () => {
  try {
    return emLista(window.localStorage.getItem(CHAVE_ORDEM_AGENDA) || '');
  } catch (erro) {
    return [];
  }
};

export const gravarOrdemAgendaLocal = (ids = []) => {
  try {
    window.localStorage.setItem(CHAVE_ORDEM_AGENDA, emLista(ids).join(','));
  } catch (erro) {
    // sem storage a ordem vale só nesta sessão
  }
};

/** Banco primeiro; o navegador cobre o caso do campo ainda não publicado. */
export const ordemAgendaInicial = (user) => {
  const doBanco = emLista(user?.agenda_ordem);
  return doBanco.length ? doBanco : lerOrdemAgendaLocal();
};

/** Ordem salva + quem apareceu depois (modelo nova entra no fim). */
export const juntarOrdemAgenda = (idsVisiveis = [], ordemSalva = []) => {
  const visiveis = emLista(idsVisiveis);
  const salvos = emLista(ordemSalva).filter((id) => visiveis.includes(id));
  return [...salvos, ...visiveis.filter((id) => !salvos.includes(id))];
};

/** Move um id para a posição de outro, mantendo o resto na ordem. */
export const moverNaOrdem = (ordem = [], origem, destino) => {
  const lista = emLista(ordem);
  const de = lista.indexOf(origem);
  const para = lista.indexOf(destino);
  if (de < 0 || para < 0 || de === para) return lista;
  const copia = [...lista];
  copia.splice(de, 1);
  copia.splice(para, 0, origem);
  return copia;
};

/** Ordena a lista de modelos conforme a ordem pedida. */
export const ordenarModelos = (modelos = [], ordem = []) => {
  const lista = emLista(ordem);
  const posicao = (id) => {
    const indice = lista.indexOf(id);
    return indice < 0 ? lista.length + 999 : indice;
  };
  return [...modelos].sort((a, b) => posicao(a.id) - posicao(b.id));
};
