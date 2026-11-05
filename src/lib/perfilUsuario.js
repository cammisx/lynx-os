/**
 * Perfil do usuário: nome de exibição, foto, subnick e tema.
 *
 * Guarda em dois lugares: no banco (campos custom do User, via updateMe) e no
 * navegador. O banco é a verdade quando existe; o localStorage garante que a
 * escolha não se perca enquanto esses campos não estiverem publicados.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { base44 } from '@/api/base44Client';
import { aplicarTema, temaPorId } from '@/lib/temas';
import { aplicarFonte, fonteDoNavegador, tamanhoPorId } from '@/lib/fonte';
import { PERFIL_PADRAO, iniciaisDe, mesclarPerfil, nomeDe } from '@/lib/perfilLogica';
import { espelharNomeNoChatter, propagarNomeNasModelos } from '@/lib/pessoas';
import { emitChattersChanged } from '@/lib/desktopEvents';

export { iniciaisDe, nomeDe };

const PREFIXO = 'lynx:perfil:';

let atual = { ...PERFIL_PADRAO };
let carregadoPara = null;
const ouvintes = new Set();

const avisar = () => {
  ouvintes.forEach((fn) => fn());
};

const chaveDe = (id) => `${PREFIXO}${id}`;

const lerLocal = (id) => {
  try {
    const bruto = window.localStorage.getItem(chaveDe(id));
    return bruto ? JSON.parse(bruto) : {};
  } catch (erro) {
    return {};
  }
};

const gravarLocal = (id, dados) => {
  try {
    window.localStorage.setItem(chaveDe(id), JSON.stringify(dados));
  } catch (erro) {
    // navegador sem storage: o perfil vale só nesta sessão
  }
};

export const perfilAtual = () => atual;

export const assinarPerfil = (fn) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};

export const carregarPerfil = (user) => {
  if (!user?.id || carregadoPara === user.id) return atual;
  carregadoPara = user.id;
  atual = mesclarPerfil(lerLocal(user.id), user);
  if (!atual.fonte) atual.fonte = fonteDoNavegador() || atual.fonte;
  aplicarTema(atual.tema);
  aplicarFonte(atual.fonte);
  avisar();
  return atual;
};

/** Nome trocado por outra janela (admin na lista de chatters) aparece aqui também. */
export const refletirNomeDeUsuario = (usuarioId, nome) => {
  if (!usuarioId || usuarioId !== carregadoPara || !nome) return;
  if (atual.nomeExibicao === nome) return;
  atual = { ...atual, nomeExibicao: nome };
  gravarLocal(usuarioId, atual);
  avisar();
};

/**
 * Salva o que mudou. Aplica o tema na hora e devolve `remoto: false` quando o
 * banco recusou (campos do perfil ainda não publicados).
 */
export const salvarPerfil = async (user, parcial = {}) => {
  const antes = { nome: atual.nomeExibicao, foto: atual.fotoUrl, subnick: atual.subnick };
  atual = { ...atual, ...parcial };
  aplicarTema(atual.tema);
  aplicarFonte(atual.fonte);
  if (user?.id) gravarLocal(user.id, atual);
  avisar();

  if (!user?.id) return { remoto: false };

  try {
    const salvo = await base44.auth.updateMe({
      nome_exibicao: atual.nomeExibicao || '',
      foto_url: atual.fotoUrl || '',
      subnick: atual.subnick || '',
      tema: atual.tema || '',
      fonte_escala: atual.fonte || '',
    });
    /* Campo que não existe no schema volta sem estar na resposta: nesse caso
       o perfil só ficou guardado aqui. */
    const remoto = Boolean(salvo && 'nome_exibicao' in salvo);

    /* O nome é o mesmo do resto do app: quando ele muda, leva para a cópia que
       o desktop, o painel do relógio e os relatórios já leem. Trocar só o tema
       não custa essas leituras. */
    if (atual.nomeExibicao && atual.nomeExibicao !== antes.nome) {
      await espelharNomeNoChatter({
        usuarioId: user.id,
        nome: atual.nomeExibicao,
        email: user.email,
      });
      await propagarNomeNasModelos({ usuarioId: user.id, nome: atual.nomeExibicao });
    }

    /* Foto e subnick também aparecem em outras janelas: avisa sempre que
       qualquer um dos três mudou. */
    if (
      atual.nomeExibicao !== antes.nome ||
      atual.fotoUrl !== antes.foto ||
      atual.subnick !== antes.subnick
    ) {
      emitChattersChanged();
    }

    return { remoto };
  } catch (erro) {
    console.warn('[Perfil] salvo só neste navegador:', erro?.message || erro);
    return { remoto: false };
  }
};

export const usePerfil = (user) => {
  useEffect(() => {
    carregarPerfil(user);
  }, [user?.id]);

  const perfil = useSyncExternalStore(assinarPerfil, perfilAtual, perfilAtual);
  return {
    ...perfil,
    tema: temaPorId(perfil.tema).id,
    fonte: tamanhoPorId(perfil.fonte).id,
  };
};
