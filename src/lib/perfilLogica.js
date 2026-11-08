/**
 * Regras do perfil sem tocar em rede nem em tela: dá para testar sozinho.
 * O que vem do banco manda; o que ficou salvo no navegador preenche o resto.
 */
import { MODO_PADRAO, TEMA_PADRAO, modoValido } from '@/lib/temas';
import { FONTE_PADRAO } from '@/lib/fonte';

export const PERFIL_PADRAO = {
  nomeExibicao: '',
  fotoUrl: '',
  subnick: '',
  tema: TEMA_PADRAO,
  modo: MODO_PADRAO,
  fonte: FONTE_PADRAO,
  fundoUrl: '',
  fundoEstatico: false,
};

/** Campos custom do User, quando publicados no Builder. */
export const perfilDoUsuario = (user) => ({
  nomeExibicao: user?.nome_exibicao || '',
  fotoUrl: user?.foto_url || '',
  subnick: user?.subnick || '',
  tema: user?.tema || '',
  modo: user?.tema_modo || '',
  fonte: user?.fonte_escala || '',
  fundoUrl: user?.fundo_url || '',
  fundoEstatico: typeof user?.fundo_estatico === 'boolean' ? user.fundo_estatico : undefined,
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
  return { ...perfil, modo: modoValido(perfil.modo), fundoEstatico };
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
