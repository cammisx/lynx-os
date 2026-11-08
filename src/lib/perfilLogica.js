/**
 * Regras do perfil sem tocar em rede nem em tela: dá para testar sozinho.
 * O que vem do banco manda; o que ficou salvo no navegador preenche o resto.
 */
import { MODO_PADRAO, TEMA_PADRAO, modoValido } from '@/lib/temas';
import { FONTE_PADRAO } from '@/lib/fonte';
import { FONTE_APP_PADRAO, fonteAppValida } from '@/lib/fontesApp';
import { emLista } from '@/lib/barraTarefas';
import { COR_PADRAO, PET_PADRAO, corValida, petValido } from '@/lib/pets';

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
  /* Bicho que passeia pelo desktop (sem pet, gato, cachorro ou morcego) e a
     cor do pelo dele. */
  pet: PET_PADRAO,
  petCor: COR_PADRAO,
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
  pet: user?.pet || '',
  petCor: user?.pet_cor || '',
});

export const mesclarPerfil = (local = {}, user = {}) => {
  const remoto = perfilDoUsuario(user);
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
    pet: petValido(perfil.pet),
    petCor: corValida(perfil.petCor),
  };
};

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
