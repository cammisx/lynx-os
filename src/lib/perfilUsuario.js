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
import { aplicarFonteApp, fonteAppDoNavegador, fonteAppValida } from '@/lib/fontesApp';
import { buscarPerfil, salvarPerfilPublico } from '@/lib/perfis';
import { escreverBarra } from '@/lib/barraTarefas';
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
  if (!atual.fonteApp) atual.fonteApp = fonteAppDoNavegador() || atual.fonteApp;
  aplicarTema(atual.tema, atual.modo);
  aplicarFonte(atual.fonte);
  aplicarFonteApp(atual.fonteApp);
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
      aplicarFonteApp(atual.fonteApp);
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
        fundoUrl: atual.fundoUrl || '',
        fundoEstatico: Boolean(atual.fundoEstatico),
        fundoModo: atual.fundoModo || '',
      });
    }
  });

  return atual;
};

/**
 * Guarda a ordem dos ícones da barra de tarefas.
 *
 * É leve de propósito: só mexe nesses dois campos, sem repetir o salvamento
 * completo do perfil (nome, foto, tema). Grava no navegador na hora, então a
 * ordem sobrevive a um recarregamento mesmo que o banco recuse o campo.
 */
export const salvarBarraTarefas = async (user, { ordem = [], fixadas = [] } = {}) => {
  atual = { ...atual, barraOrdem: ordem, barraFixadas: fixadas };
  if (user?.id) gravarLocal(user.id, atual);
  avisar();
  if (!user?.id) return { remoto: false };

  try {
    /* Manda o perfil inteiro junto: assim a gravação nunca apaga nome, foto
       ou tema, mesmo que a atualização do User substitua o registro. */
    await base44.auth.updateMe({
      nome_exibicao: atual.nomeExibicao || '',
      foto_url: atual.fotoUrl || '',
      subnick: atual.subnick || '',
      tema: atual.tema || '',
      tema_modo: atual.modo || '',
      fonte_escala: atual.fonte || '',
      fonte_app: atual.fonteApp || '',
      fundo_url: atual.fundoUrl || '',
      fundo_estatico: Boolean(atual.fundoEstatico),
      fundo_modo: atual.fundoModo || '',
      barra_ordem: escreverBarra(ordem),
      barra_fixadas: escreverBarra(fixadas),
      pet: atual.pet || '',
      pet_cor: atual.petCor || '',
    });
    return { remoto: true };
  } catch (erro) {
    console.warn('[Perfil] o User recusou a ordem da barra:', erro?.message || erro);
    return { remoto: false };
  }
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

  /* O spread não muda o `atual` antigo: para normalizar o modo é preciso ler
     do objeto já mesclado, senão a escolha nova é sobrescrita pela anterior. */
  const mesclado = { ...atual, ...parcial };
  atual = {
    ...mesclado,
    modo: modoValido(mesclado.modo),
    fonteApp: fonteAppValida(mesclado.fonteApp),
  };
  aplicarTema(atual.tema, atual.modo);
  aplicarFonte(atual.fonte);
  aplicarFonteApp(atual.fonteApp);
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
      fonte_app: atual.fonteApp || '',
      fundo_url: atual.fundoUrl || '',
      fundo_estatico: Boolean(atual.fundoEstatico),
      fundo_modo: atual.fundoModo || '',
      barra_ordem: escreverBarra(atual.barraOrdem),
      barra_fixadas: escreverBarra(atual.barraFixadas),
      pet: atual.pet || '',
      pet_cor: atual.petCor || '',
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
    fundoUrl: atual.fundoUrl,
    fundoEstatico: Boolean(atual.fundoEstatico),
    fundoModo: atual.fundoModo || '',
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
