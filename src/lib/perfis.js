/**
 * Perfil público de cada pessoa (nome, foto, subnick, tema).
 *
 * Por que não viver só no User: a listagem de User que o app usa para montar
 * as pessoas do chat devolve o básico da conta, sem os campos extras. Então o
 * que a pessoa escolhe no perfil também fica aqui, onde qualquer um lê.
 * O User continua sendo atualizado (é o campo que a janela de Chatters edita);
 * esta entidade é a garantia de que o nome e a foto chegam em todo mundo.
 */
import { base44 } from '@/api/base44Client';

export const PERFIS_EVENT = 'lynx:perfis';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const avisar = () => {
  try {
    window.dispatchEvent(new Event(PERFIS_EVENT));
  } catch (erro) {
    // sem window (ou sem evento) não é problema: o próximo carregamento resolve
  }
};

/** Tolerante a falha: se a entidade ainda não estiver publicada, volta vazio. */
export const listarPerfis = async () => {
  try {
    return asList(await base44.entities.PerfilUsuario.list());
  } catch (erro) {
    console.warn('[Perfil] lista de perfis indisponível', erro?.message || erro);
    return [];
  }
};

export const mapaDePerfis = (perfis = []) => {
  const mapa = new Map();
  perfis.forEach((perfil) => {
    if (perfil?.usuario_id) mapa.set(perfil.usuario_id, perfil);
  });
  return mapa;
};

export const buscarPerfil = async (usuarioId) => {
  if (!usuarioId) return null;
  try {
    const encontrados = asList(
      await base44.entities.PerfilUsuario.filter({ usuario_id: usuarioId })
    );
    return encontrados[0] || null;
  } catch (erro) {
    console.warn('[Perfil] não consegui ler o perfil', erro?.message || erro);
    return null;
  }
};

/** Cria na primeira vez, atualiza depois. Nunca quebra quem chamou. */
export const salvarPerfilPublico = async (usuarioId, dados = {}) => {
  if (!usuarioId) return null;
  const corpo = Object.fromEntries(
    Object.entries({
      usuario_id: usuarioId,
      usuario_email: dados.usuario_email,
      nome_exibicao: dados.nome_exibicao,
      foto_url: dados.foto_url,
      subnick: dados.subnick,
      tema: dados.tema,
      modo: dados.modo,
      fonte_escala: dados.fonte_escala,
    }).filter(([, valor]) => valor !== undefined)
  );

  try {
    const existentes = asList(
      await base44.entities.PerfilUsuario.filter({ usuario_id: usuarioId })
    );
    const salvo = existentes[0]?.id
      ? await base44.entities.PerfilUsuario.update(existentes[0].id, corpo)
      : await base44.entities.PerfilUsuario.create(corpo);
    avisar();
    return salvo;
  } catch (erro) {
    console.warn('[Perfil] não consegui gravar o perfil público', erro?.message || erro);
    return null;
  }
};
