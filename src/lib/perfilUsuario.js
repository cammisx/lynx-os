/**
 * Perfil do usuário: nome de exibição, foto, subnick e tema.
 *
 * Guarda em dois lugares: no banco (campos custom do User, via updateMe) e no
 * navegador. O banco é a verdade quando existe; o localStorage garante que a
 * escolha não se perca enquanto esses campos não estiverem publicados.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { base44 } from '@/api/base44Client';
import { MODO_SISTEMA, aplicarTema, modoValido, temaPorId } from '@/lib/temas';
import { aplicarFonte, fonteDoNavegador, tamanhoPorId } from '@/lib/fonte';
import { buscarPerfil, salvarPerfilPublico } from '@/lib/perfis';
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

/* Modo "sistema": quando o Windows troca entre claro e escuro, o app acompanha
   sem precisar recarregar. */
let observandoSistema = false;

const observarSistema = () => {
  if (observandoSistema || typeof window === 'undefined' || !window.matchMedia) return;
  const consulta = window.matchMedia('(prefers-color-scheme: light)');
  const aoMudar = () => {
    if (atual.modo === MODO_SISTEMA) aplicarTema(atual.tema, atual.modo);
  };
  consulta.addEventListener?.('change', aoMudar);
  observandoSistema = true;
};

export const assinarPerfil = (fn) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};

export const carregarPerfil = (user) => {
  if (!user?.id || carregadoPara === user.id) return atual;
  carregadoPara = user.id;
  atual = mesclarPerfil(lerLocal(user.id), user);
  if (!atual.fonte) atual.fonte = fonteDoNavegador() || atual.fonte;
  aplicarTema(atual.tema, atual.modo);
  aplicarFonte(atual.fonte);
  observarSistema();
  avisar();

  /* O perfil público é a fonte que chega para todo mundo (a listagem de User
     não devolve os campos extras). Chega depois, sem travar a tela. */
  buscarPerfil(user.id).then((publico) => {
    if (publico) {
      atual = mesclarPerfil(atual, publico);
      gravarLocal(user.id, atual);
      aplicarTema(atual.tema, atual.modo);
      aplicarFonte(atual.fonte);
      avisar();
      return;
    }
    /* Nada no banco, mas o navegador tem nome/foto de um salvamento anterior
       que não chegou lá: sobe agora, para as outras pessoas passarem a ver. */
    if (atual.nomeExibicao || atual.fotoUrl) {
      salvarPerfilPublico(user.id, {
        usuario_email: user.email,
        nome_exibicao: atual.nomeExibicao,
        foto_url: atual.fotoUrl,
        subnick: atual.subnick,
        tema: atual.tema,
        modo: atual.modo,
        fonte_escala: atual.fonte,
      });
    }
  });

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

  /* Se a tela ainda não recebeu o perfil do banco (ele chega logo depois da
     abertura), salvar agora gravaria campos vazios por cima do que existe. */
  const mexeuNoNome = Object.prototype.hasOwnProperty.call(parcial, 'nomeExibicao');
  const mexeuNaFoto = Object.prototype.hasOwnProperty.call(parcial, 'fotoUrl');
  if (user?.id && ((!atual.nomeExibicao && !mexeuNoNome) || (!atual.fotoUrl && !mexeuNaFoto))) {
    const doBanco = await buscarPerfil(user.id);
    if (doBanco) atual = mesclarPerfil(atual, doBanco);
  }

  atual = { ...atual, ...parcial, modo: modoValido(atual.modo) };
  aplicarTema(atual.tema, atual.modo);
  aplicarFonte(atual.fonte);
  if (user?.id) gravarLocal(user.id, atual);
  avisar();

  if (!user?.id) return { remoto: false };

  /* Duas gravações, cada uma por si: o User (campo oficial, usado pela janela
     de Chatters) e o perfil público (o que os outros enxergam). Se uma falhar,
     a outra ainda vale. */
  let noUser = false;
  try {
    const salvo = await base44.auth.updateMe({
      nome_exibicao: atual.nomeExibicao || '',
      foto_url: atual.fotoUrl || '',
      subnick: atual.subnick || '',
      tema: atual.tema || '',
      tema_modo: atual.modo || '',
      fonte_escala: atual.fonte || '',
    });
    noUser = Boolean(salvo && 'nome_exibicao' in salvo);
  } catch (erro) {
    console.warn('[Perfil] o User recusou os campos extras:', erro?.message || erro);
  }

  const publico = await salvarPerfilPublico(user.id, {
    usuario_email: user.email,
    nome_exibicao: atual.nomeExibicao,
    foto_url: atual.fotoUrl,
    subnick: atual.subnick,
    tema: atual.tema,
    modo: atual.modo,
    fonte_escala: atual.fonte,
  });
  const remoto = noUser || Boolean(publico);

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
