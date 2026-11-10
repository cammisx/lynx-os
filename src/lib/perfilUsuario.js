/**
 * Perfil do usuário: nome de exibição, foto, subnick e tema.
 *
 * Guarda em dois lugares: no banco (campos custom do User, via updateMe) e no
 * navegador. O banco é a verdade quando existe; o localStorage garante que a
 * escolha não se perca enquanto esses campos não estiverem publicados.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { base44 } from '@/api/base44Client';
import { MODO_SISTEMA, aplicarTema, temaPorId } from '@/lib/temas';
import { aplicarDesempenho, escreverDesempenho } from '@/lib/desempenho';
import { aplicarFonte, fonteDoNavegador, tamanhoPorId } from '@/lib/fonte';
import { aplicarFonteApp, fonteAppDoNavegador } from '@/lib/fontesApp';
import { buscarPerfil, salvarPerfilPublico } from '@/lib/perfis';
import { escreverBarra } from '@/lib/barraTarefas';
import { escreverJogos, normalizarJogos } from '@/lib/jogosConfig';
import {
  CAMPO_CELULAR,
  PERFIL_PADRAO,
  compartilhadoDoPerfil,
  ehCelular,
  iniciaisDe,
  mesclarPerfil,
  mesclarPerfilCelular,
  nomeDe,
  normalizarAparelho,
} from '@/lib/perfilLogica';
import { espelharNomeNoChatter, propagarNomeNasModelos } from '@/lib/pessoas';
import { emitChattersChanged } from '@/lib/desktopEvents';

export { iniciaisDe, nomeDe };

const PREFIXO = 'lynx:perfil:';

/* O perfil é dividido em duas partes: o que é seu e vale em qualquer lugar
   (nome, foto, subnick, ordem das barras) e o que é do aparelho (tema, modo,
   fonte, fundo, pet). Cada aparelho tem o seu conjunto; o celular usa os
   campos com sufixo _celular no User. */
let compartilhado = compartilhadoDoPerfil(PERFIL_PADRAO);
let conjuntos = {
  desktop: normalizarAparelho(PERFIL_PADRAO),
  celular: normalizarAparelho(PERFIL_PADRAO),
};
let usandoCelular = false;

const conjuntoAtivo = () => conjuntos[usandoCelular ? 'celular' : 'desktop'];

const montarPerfil = () => ({ ...compartilhado, ...conjuntoAtivo() });

let atual = montarPerfil();

const gravarTudo = (id) => {
  if (!id) return;
  gravarLocal(id, { ...compartilhado, ...conjuntos.desktop, celular: { ...conjuntos.celular } });
};

const aplicarVisual = () => {
  aplicarTema(atual.tema, atual.modo);
  aplicarFonte(atual.fonte);
  aplicarFonteApp(atual.fonteApp);
  /* Modo leve: cada item vira um atributo no <html> que o CSS respeita. */
  aplicarDesempenho(atual.desempenho);
};

/** Monta o que vai para o User: os dois conjuntos, sempre juntos, para que
    salvar no celular não apague o que está no computador. */
const camposDoUser = (extras = {}) => {
  const d = conjuntos.desktop;
  const c = conjuntos.celular;
  return {
    nome_exibicao: compartilhado.nomeExibicao || '',
    foto_url: compartilhado.fotoUrl || '',
    subnick: compartilhado.subnick || '',
    barra_ordem: escreverBarra(compartilhado.barraOrdem),
    barra_fixadas: escreverBarra(compartilhado.barraFixadas),
    agenda_ordem: escreverBarra(compartilhado.agendaOrdem),
    jogos_config: escreverJogos(compartilhado.jogosConfig),
    tema: d.tema || '',
    tema_modo: d.modo || '',
    fonte_escala: d.fonte || '',
    fonte_app: d.fonteApp || '',
    fundo_url: d.fundoUrl || '',
    fundo_estatico: Boolean(d.fundoEstatico),
    fundo_modo: d.fundoModo || '',
    pet: d.pet || '',
    pet_cor: d.petCor || '',
    pet_nome: d.petNome || '',
    desempenho: escreverDesempenho(d.desempenho),
    [CAMPO_CELULAR.tema]: c.tema || '',
    [CAMPO_CELULAR.modo]: c.modo || '',
    [CAMPO_CELULAR.fonte]: c.fonte || '',
    [CAMPO_CELULAR.fonteApp]: c.fonteApp || '',
    [CAMPO_CELULAR.fundoUrl]: c.fundoUrl || '',
    [CAMPO_CELULAR.fundoEstatico]: Boolean(c.fundoEstatico),
    [CAMPO_CELULAR.fundoModo]: c.fundoModo || '',
    [CAMPO_CELULAR.pet]: c.pet || '',
    [CAMPO_CELULAR.petCor]: c.petCor || '',
    [CAMPO_CELULAR.petNome]: c.petNome || '',
    [CAMPO_CELULAR.desempenho]: escreverDesempenho(c.desempenho),
    ...extras,
  };
};
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

/* Girar o celular ou estreitar a janela do computador troca o conjunto em uso,
   sem recarregar a página. */
let observandoAparelho = false;

const observarAparelho = () => {
  if (observandoAparelho || typeof window === 'undefined' || !window.matchMedia) return;
  const consulta = window.matchMedia('(max-width: 767px)');
  const aoMudar = () => {
    if (consulta.matches === usandoCelular) return;
    usandoCelular = consulta.matches;
    atual = montarPerfil();
    aplicarVisual();
    avisar();
  };
  consulta.addEventListener?.('change', aoMudar);
  observandoAparelho = true;
};

export const assinarPerfil = (fn) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};

export const carregarPerfil = (user) => {
  if (!user?.id || carregadoPara === user.id) return atual;
  carregadoPara = user.id;
  usandoCelular = ehCelular();

  const local = lerLocal(user.id) || {};
  const { celular: celularLocal, ...desktopLocal } = local;

  /* O conjunto do celular nasce copiando o do computador: quem nunca abriu o
     app no telefone vê o mesmo visual de sempre, e a partir daí os dois se
     separam de verdade. */
  const doComputador = mesclarPerfil(desktopLocal, user);
  const doCelular = mesclarPerfilCelular({ ...doComputador, ...(celularLocal || {}) }, user);

  compartilhado = compartilhadoDoPerfil(doComputador);
  conjuntos = {
    desktop: normalizarAparelho(doComputador),
    celular: normalizarAparelho(doCelular),
  };
  atual = montarPerfil();
  if (!atual.fonte) atual.fonte = fonteDoNavegador() || atual.fonte;
  if (!atual.fonteApp) atual.fonteApp = fonteAppDoNavegador() || atual.fonteApp;
  aplicarVisual();
  observarSistema();
  observarAparelho();
  avisar();

  /* O perfil público é a fonte que chega para todo mundo (a listagem de User
     não devolve os campos extras). Chega depois, sem travar a tela. */
  buscarPerfil(user.id).then((publico) => {
    if (publico) {
      /* O perfil público serve para os outros verem seu nome e foto: o visual
         continua mandando por aqui, senão o celular herdaria o tema do
         computador na primeira abertura. */
      compartilhado = {
        ...compartilhado,
        nomeExibicao: publico.nome_exibicao || compartilhado.nomeExibicao,
        fotoUrl: publico.foto_url || compartilhado.fotoUrl,
        subnick: publico.subnick || compartilhado.subnick,
      };
      atual = montarPerfil();
      gravarTudo(user.id);
      aplicarVisual();
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
  compartilhado = { ...compartilhado, barraOrdem: [...ordem], barraFixadas: [...fixadas] };
  atual = montarPerfil();
  gravarTudo(user?.id);
  avisar();
  if (!user?.id) return { remoto: false };

  try {
    /* Manda o perfil inteiro junto: assim a gravação nunca apaga nome, foto
       ou tema, mesmo que a atualização do User substitua o registro. */
    await base44.auth.updateMe(
      camposDoUser({
        barra_ordem: escreverBarra(ordem),
        barra_fixadas: escreverBarra(fixadas),
      })
    );
    return { remoto: true };
  } catch (erro) {
    console.warn('[Perfil] o User recusou a ordem da barra:', erro?.message || erro);
    return { remoto: false };
  }
};

/**
 * Guarda a ordem das agendas das modelos no painel do relógio.
 *
 * Mesmo esquema da barra de tarefas: grava na hora no navegador, manda o
 * perfil inteiro para o User e avisa quem estiver ouvindo. Trocar a ordem não
 * mexe em nome, foto ou tema.
 */
export const salvarOrdemAgenda = async (user, ordem = []) => {
  compartilhado = { ...compartilhado, agendaOrdem: [...ordem] };
  atual = montarPerfil();
  gravarTudo(user?.id);
  avisar();
  if (!user?.id) return { remoto: false };

  try {
    await base44.auth.updateMe(camposDoUser({ agenda_ordem: escreverBarra(ordem) }));
    return { remoto: true };
  } catch (erro) {
    console.warn('[Perfil] o User recusou a ordem da agenda:', erro?.message || erro);
    return { remoto: false };
  }
};

/**
 * Guarda as regras e os recordes dos jogos.
 *
 * Mesmo esquema da barra de tarefas: aplica no estado na hora (a tela responde
 * sem esperar a rede), repete no navegador e manda o perfil inteiro para o
 * User. Assim o que foi ajustado no computador abre igual no celular e o
 * recorde feito num aparelho nao e apagado pelo outro.
 */
export const salvarJogosConfig = async (user, config = null) => {
  compartilhado = { ...compartilhado, jogosConfig: normalizarJogos(config) };
  atual = montarPerfil();
  gravarTudo(user?.id);
  avisar();
  if (!user?.id) return { remoto: false };

  try {
    await base44.auth.updateMe(
      camposDoUser({ jogos_config: escreverJogos(compartilhado.jogosConfig) })
    );
    return { remoto: true };
  } catch (erro) {
    console.warn('[Perfil] o User recusou as configuracoes dos jogos:', erro?.message || erro);
    return { remoto: false };
  }
};

/** Nome trocado por outra janela (admin na lista de chatters) aparece aqui também. */
export const refletirNomeDeUsuario = (usuarioId, nome) => {
  if (!usuarioId || usuarioId !== carregadoPara || !nome) return;
  if (atual.nomeExibicao === nome) return;
  compartilhado = { ...compartilhado, nomeExibicao: nome };
  atual = montarPerfil();
  gravarTudo(usuarioId);
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
    if (doBanco) {
      /* Só o que é compartilhado volta: o visual de cada aparelho fica como
         está, senão salvar no celular puxaria o tema do computador. */
      compartilhado = {
        ...compartilhado,
        nomeExibicao: compartilhado.nomeExibicao || doBanco.nome_exibicao || '',
        fotoUrl: compartilhado.fotoUrl || doBanco.foto_url || '',
        subnick: compartilhado.subnick || doBanco.subnick || '',
      };
      atual = montarPerfil();
    }
  }

  /* O spread não muda o `atual` antigo: para normalizar o modo é preciso ler
     do objeto já mesclado, senão a escolha nova é sobrescrita pela anterior. */
  const mesclado = { ...atual, ...parcial };
  /* O que é do aparelho vai para o conjunto dele; o resto é compartilhado. */
  conjuntos[usandoCelular ? 'celular' : 'desktop'] = normalizarAparelho(mesclado);
  compartilhado = compartilhadoDoPerfil(mesclado);
  atual = montarPerfil();
  aplicarVisual();
  gravarTudo(user?.id);
  avisar();

  if (!user?.id) return { remoto: false };

  /* Duas gravações, cada uma por si: o User (campo oficial, usado pela janela
     de Chatters) e o perfil público (o que os outros enxergam). Se uma falhar,
     a outra ainda vale. */
  let noUser = false;
  try {
    const salvo = await base44.auth.updateMe(camposDoUser());
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
