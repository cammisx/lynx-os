/**
 * Conteúdo: a parte de cada modelo, com as mesmas regras do playbook.
 *
 *  - existe um conteúdo por modelo;
 *  - ele nasce junto com a modelo;
 *  - quando a modelo é arquivada ou excluída, o conteúdo também é arquivado,
 *    nunca apagado, e sai da visão geral;
 *  - se a modelo volta, o conteúdo volta junto;
 *  - o admin vê o de todas as modelos e pode editar; o chatter vê só o das
 *    modelos dele e não edita.
 *
 * O que vai dentro de cada bloco ainda está sendo definido: por enquanto a
 * entidade guarda "secoes" e a janela mostra o lugar vazio.
 */
import { chattersDaModelo, ehAdmin } from '@/lib/chat';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

export const modeloDoConteudo = (conteudo, modelos = []) =>
  (modelos || []).find((modelo) => modelo?.id === conteudo?.modelo_id) || null;

export const nomeDoConteudo = (conteudo, modelos = []) =>
  modeloDoConteudo(conteudo, modelos)?.nome || conteudo?.titulo || 'Modelo';

/** O que a pessoa pode ver: admin tudo; chatter só as modelos dele. */
export const conteudosVisiveis = (conteudos, modelos, usuario) => {
  const admin = ehAdmin(usuario);
  const lista = asList(conteudos).filter((conteudo) => {
    if (!conteudo || conteudo.arquivado) return false;
    const modelo = modeloDoConteudo(conteudo, modelos);
    if (!modelo || modelo.arquivada) return false;
    if (admin) return true;
    return chattersDaModelo(modelo).includes(usuario?.id);
  });

  return lista.sort((a, b) =>
    nomeDoConteudo(a, modelos).localeCompare(nomeDoConteudo(b, modelos), 'pt-BR')
  );
};

export const podeEditarConteudo = (conteudo, usuario) =>
  ehAdmin(usuario) && Boolean(conteudo) && !conteudo.arquivado;
