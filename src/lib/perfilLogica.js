/**
 * Regras do perfil sem tocar em rede nem em tela: dá para testar sozinho.
 * O que vem do banco manda; o que ficou salvo no navegador preenche o resto.
 */
import { MODO_PADRAO, TEMA_PADRAO, modoValido } from '@/lib/temas';
import { FONTE_PADRAO } from '@/lib/fonte';
import { FONTE_APP_PADRAO, fonteAppValida } from '@/lib/fontesApp';
import { emLista } from '@/lib/barraTarefas';
import { COR_PADRAO, PET_PADRAO, corValida, petValido } from '@/lib/pets';
import { lerJogos, mesclarJogos, normalizarJogos } from '@/lib/jogosConfig';
import { lerDesempenho } from '@/lib/desempenho';

/**
 * Fundo do desktop em três estados:
 *  animado — a seda de linhas se mexe;
 *  parado  — a seda aparece, mas congelada (economiza CPU);
 *  sem     — nenhuma linha, só a cor do tema (ou a foto do usuário).
 */
export const MODOS_FUNDO = [
  { id: 'animado', nome: 'Animado', dica: 'Linhas em movimento' },
  { id: 'parado', nome: 'Parado', dica: 'Linhas paradas' },
  { id: 'sem', nome: 'Sem linhas', dica: 'Fundo liso' },
];

export const MODO_FUNDO_PADRAO = 'animado';

export const modoFundoValido = (valor) =>
  MODOS_FUNDO.some((item) => item.id === valor) ? valor : MODO_FUNDO_PADRAO;

export const PERFIL_PADRAO = {
  nomeExibicao: '',
  fotoUrl: '',
  subnick: '',
  tema: TEMA_PADRAO,
  modo: MODO_PADRAO,
  fonte: FONTE_PADRAO,
  fonteApp: FONTE_APP_PADRAO,
  fundoUrl: '',
  fundoEstatico: false,
  fundoModo: MODO_FUNDO_PADRAO,
  /* Ordem dos ícones na barra de tarefas e quais ficam fixados nela. */
  barraOrdem: [],
  barraFixadas: [],
  /* Ordem das agendas das modelos no painel do relógio. */
  agendaOrdem: [],
  /* Bicho que passeia pelo desktop (sem pet, gato, cachorro ou morcego) e a
     cor do pelo dele. */
  pet: PET_PADRAO,
  petCor: COR_PADRAO,
  /* Nome dado ao bicho, mostrado no balão de fala e no tooltip. */
  petNome: '',
  /* O que está desligado para aliviar o computador (lista de ids de
     desempenho: "blur,brilho,animacao,fundo,pet,pixie"). */
  desempenho: '',
  /* Regras e recordes dos jogos da janela Jogos (vale nos dois aparelhos). */
  jogosConfig: null,
};

/** Campos custom do User, quando publicados no Builder. */
export const perfilDoUsuario = (user) => ({
  nomeExibicao: user?.nome_exibicao || '',
  fotoUrl: user?.foto_url || '',
  subnick: user?.subnick || '',
  tema: user?.tema || '',
  modo: user?.tema_modo || '',
  fonte: user?.fonte_escala || '',
  fonteApp: user?.fonte_app || '',
  fundoUrl: user?.fundo_url || '',
  fundoEstatico: typeof user?.fundo_estatico === 'boolean' ? user.fundo_estatico : undefined,
  fundoModo: user?.fundo_modo || '',
  /* Vazio vira undefined de propósito: assim o que está no navegador continua
     valendo quando o campo ainda não existe no banco. */
  barraOrdem: user?.barra_ordem ? emLista(user.barra_ordem) : undefined,
  barraFixadas: user?.barra_fixadas ? emLista(user.barra_fixadas) : undefined,
  agendaOrdem: user?.agenda_ordem ? emLista(user.agenda_ordem) : undefined,
  pet: user?.pet || '',
  petCor: user?.pet_cor || '',
  petNome: user?.pet_nome || '',
  desempenho: user?.desempenho || '',
  jogosConfig: lerJogos(user?.jogos_config),
});

export const mesclarPerfilCom = (local = {}, remoto = {}) => {
  const doBanco = Object.fromEntries(Object.entries(remoto).filter(([, valor]) => valor));
  const perfil = { ...PERFIL_PADRAO, ...(local || {}), ...doBanco };
  /* O filtro acima descarta falsy, então um `false` vindo do banco sumiria.
     Aqui o booleano é resolvido na mão: ligado em qualquer lugar vale, e
     desligar por aqui também cola (o local traz o false). */
  const estaticoRemoto = remoto.fundoEstatico;
  const fundoEstatico =
    typeof estaticoRemoto === 'boolean'
      ? estaticoRemoto || Boolean((local || {}).fundoEstatico)
      : Boolean(perfil.fundoEstatico);

  /* O modo é a verdade; o booleano antigo só serve de ponto de partida para
     quem já tinha escolhido "parado" antes de existir a terceira opção. */
  const fundoModo = modoFundoValido(
    remoto.fundoModo || (local || {}).fundoModo || (fundoEstatico ? 'parado' : MODO_FUNDO_PADRAO)
  );

  return {
    ...perfil,
    modo: modoValido(perfil.modo),
    fonteApp: fonteAppValida(perfil.fonteApp),
    fundoModo,
    fundoEstatico: fundoModo === 'parado',
    fundoSemLinhas: fundoModo === 'sem',
    barraOrdem: emLista(perfil.barraOrdem),
    barraFixadas: emLista(perfil.barraFixadas),
    agendaOrdem: emLista(perfil.agendaOrdem),
    pet: petValido(perfil.pet),
    petCor: corValida(perfil.petCor),
    petNome: String(perfil.petNome || '').trim().slice(0, 24),
    desempenho: lerDesempenho(perfil.desempenho).join(','),
    /* Regras da conta mandam; os recordes ficam com o melhor dos dois lados. */
    jogosConfig: mesclarJogos(perfil.jogosConfig, remoto.jogosConfig),
  };
};

export const mesclarPerfil = (local = {}, user = {}) =>
  mesclarPerfilCom(local, perfilDoUsuario(user));

/* ------------------- preferências próprias de cada aparelho ------------------- */

/** O que muda entre computador e celular. Nome, foto, subnick e ordens não. */
export const CAMPOS_COMPARTILHADOS = [
  'nomeExibicao',
  'fotoUrl',
  'subnick',
  'barraOrdem',
  'barraFixadas',
  'agendaOrdem',
  'jogosConfig',
];

export const PREF_POR_APARELHO = [
  'tema',
  'modo',
  'fonte',
  'fonteApp',
  'fundoUrl',
  'fundoEstatico',
  'fundoModo',
  'pet',
  'petCor',
  'petNome',
  'desempenho',
];

/** Campo do User que guarda a versão de celular de cada preferência. */
export const CAMPO_CELULAR = {
  tema: 'tema_celular',
  modo: 'tema_modo_celular',
  fonte: 'fonte_escala_celular',
  fonteApp: 'fonte_app_celular',
  fundoUrl: 'fundo_url_celular',
  fundoEstatico: 'fundo_estatico_celular',
  fundoModo: 'fundo_modo_celular',
  pet: 'pet_celular',
  petCor: 'pet_cor_celular',
  petNome: 'pet_nome_celular',
  desempenho: 'desempenho_celular',
};

/** Mesma regra do uso no app (a casca mobile troca de layout em 768px). */
export const ehCelular = () =>
  typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 768;

/** Campos do conjunto do celular, como vêm do User. */
export const perfilCelularDoUsuario = (user) => ({
  tema: user?.tema_celular || '',
  modo: user?.tema_modo_celular || '',
  fonte: user?.fonte_escala_celular || '',
  fonteApp: user?.fonte_app_celular || '',
  fundoUrl: user?.fundo_url_celular || '',
  fundoEstatico:
    typeof user?.fundo_estatico_celular === 'boolean' ? user.fundo_estatico_celular : undefined,
  fundoModo: user?.fundo_modo_celular || '',
  pet: user?.pet_celular || '',
  petCor: user?.pet_cor_celular || '',
  petNome: user?.pet_nome_celular || '',
  desempenho: user?.desempenho_celular || '',
});

export const mesclarPerfilCelular = (local = {}, user = {}) =>
  mesclarPerfilCom(local, perfilCelularDoUsuario(user));

/** Só o que muda por aparelho, validado e com os derivados do fundo. */
export const normalizarAparelho = (valores = {}) => ({
  tema: valores.tema || TEMA_PADRAO,
  modo: modoValido(valores.modo),
  fonte: valores.fonte || FONTE_PADRAO,
  fonteApp: fonteAppValida(valores.fonteApp),
  fundoUrl: valores.fundoUrl || '',
  fundoModo: modoFundoValido(valores.fundoModo),
  fundoEstatico: modoFundoValido(valores.fundoModo) === 'parado',
  fundoSemLinhas: modoFundoValido(valores.fundoModo) === 'sem',
  pet: petValido(valores.pet),
  petCor: corValida(valores.petCor),
  petNome: String(valores.petNome || '').trim().slice(0, 24),
  desempenho: lerDesempenho(valores.desempenho).join(','),
});

/** O que vale nos dois aparelhos, tirado de um perfil completo. */
export const compartilhadoDoPerfil = (perfil = {}) => ({
  nomeExibicao: perfil.nomeExibicao || '',
  fotoUrl: perfil.fotoUrl || '',
  subnick: perfil.subnick || '',
  barraOrdem: emLista(perfil.barraOrdem),
  barraFixadas: emLista(perfil.barraFixadas),
  agendaOrdem: emLista(perfil.agendaOrdem),
  jogosConfig: normalizarJogos(perfil.jogosConfig),
});

/** Nome que vale na tela: o do perfil manda, depois o da conta. */
export const nomeDe = (perfil, user) =>
  (perfil?.nomeExibicao || user?.full_name || user?.email || 'Conta').trim();

export const iniciaisDe = (nome) => {
  const palavras = String(nome || '').trim().split(/\s+/).filter(Boolean);
  return palavras.slice(0, 2).map((palavra) => palavra[0]).join('').toUpperCase() || '?';
};

/** Nome oficial de uma pessoa: perfil do User manda; Chatter e conta são reserva. */
export const nomeDaPessoa = (user, chatter) =>
  String(
    user?.nome_exibicao ||
      chatter?.nome_exibicao ||
      user?.full_name ||
      user?.email ||
      'Sem nome'
  ).trim();

export const fotoDaPessoa = (user) => user?.foto_url || '';

export const cargoDaPessoa = (user) => (user?.role === 'admin' ? 'admin' : 'chatter');
