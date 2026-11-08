/**
 * Primeiro acesso: se a pessoa já viu o tutorial.
 *
 * A verdade é o campo `tutorial_visto` no User, para valer em qualquer
 * aparelho. O localStorage é só a memória curta: ele evita que a tela de
 * boas-vindas volte enquanto o servidor ainda não confirmou a gravação (o
 * `user` em memória demora um instante para refletir o updateMe).
 */
import { base44 } from '@/api/base44Client';

const CHAVE = 'lynx:tutorial-visto';

const chaveDe = (usuarioId) => `${CHAVE}:${usuarioId || 'conta'}`;

export const tutorialVistoLocal = (usuarioId) => {
  try {
    return window.localStorage.getItem(chaveDe(usuarioId)) === '1';
  } catch (erro) {
    return false;
  }
};

export const marcarTutorialLocal = (usuarioId) => {
  try {
    window.localStorage.setItem(chaveDe(usuarioId), '1');
  } catch (erro) {
    // navegador sem storage: vale só a marcação do banco
  }
};

/** Quem ainda não viu o tutorial: banco e memória curta dizem que não. */
export const precisaDeTutorial = (user) => {
  if (!user?.id) return false;
  if (user.tutorial_visto) return false;
  return !tutorialVistoLocal(user.id);
};

/** Marca como visto no banco e na memória curta do aparelho. */
export const marcarTutorialVisto = async (user) => {
  marcarTutorialLocal(user?.id);
  try {
    await base44.auth.updateMe({ tutorial_visto: true });
    return true;
  } catch (falha) {
    console.warn('[Tutorial] não consegui gravar no perfil:', falha?.message || falha);
    return false;
  }
};

/** A rota do tutorial, usada também pelo botão de reassistir. */
export const ROTA_TUTORIAL = '/primeiros-passos';
