/**
 * Busca de GIFs no Giphy.
 *
 * A chave é pública (só leitura): vem de VITE_GIPHY_KEY quando o app é
 * publicado ou, se ainda não estiver no código, da chave que a pessoa cola
 * uma vez no painel e fica salva neste navegador.
 */

const BASE = 'https://api.giphy.com/v1/gifs';

// Chave de leitura do projeto no Giphy (só busca GIFs; pode ficar no front).
// VITE_GIPHY_KEY, se existir, tem prioridade.
const CHAVE_PADRAO = 'axYMjofI47JP9crxn5MovLv0U2BftIWK';
const CHAVE_SALVA = 'lynx:giphyKey';
const LIMITE = 24;

export const chaveGiphy = () => {
  const ambiente = String(import.meta.env.VITE_GIPHY_KEY || '').trim();
  if (ambiente) return ambiente;
  try {
    const colada = String(localStorage.getItem(CHAVE_SALVA) || '').trim();
    if (colada) return colada;
  } catch (erro) {
    // sem localStorage usa a chave do projeto
  }
  return CHAVE_PADRAO;
};

export const guardarChaveGiphy = (chave) => {
  const limpa = String(chave || '').trim();
  try {
    if (limpa) localStorage.setItem(CHAVE_SALVA, limpa);
    else localStorage.removeItem(CHAVE_SALVA);
  } catch (erro) {
    // sem localStorage a chave vale só para esta sessão
  }
  return limpa;
};

const imagemDe = (gif) => {
  const imagens = gif?.images || {};
  const envio =
    imagens.downsized_medium?.url ||
    imagens.downsized?.url ||
    imagens.original?.url ||
    '';
  const previa =
    imagens.fixed_width_small?.url ||
    imagens.fixed_width?.url ||
    imagens.downsized_small?.url ||
    envio;
  return {
    id: gif.id,
    titulo: gif.title || 'gif',
    url: envio,
    previa,
    largura: Number(imagens.fixed_width_small?.width) || 0,
    altura: Number(imagens.fixed_width_small?.height) || 0,
  };
};

export const buscarGifs = async (termo = '') => {
  const chave = chaveGiphy();
  if (!chave) {
    const erro = new Error('sem-chave');
    erro.code = 'sem-chave';
    throw erro;
  }

  const busca = String(termo || '').trim();
  const url = busca
    ? `${BASE}/search?api_key=${encodeURIComponent(chave)}&q=${encodeURIComponent(
        busca
      )}&limit=${LIMITE}&rating=pg-13&lang=pt`
    : `${BASE}/trending?api_key=${encodeURIComponent(chave)}&limit=${LIMITE}&rating=pg-13`;

  const resposta = await fetch(url);
  if (resposta.status === 401 || resposta.status === 403) {
    const erro = new Error('chave-invalida');
    erro.code = 'chave-invalida';
    throw erro;
  }
  if (!resposta.ok) {
    const erro = new Error('falha');
    erro.code = 'falha';
    throw erro;
  }

  const dados = await resposta.json();
  return (dados?.data || []).map(imagemDe).filter((gif) => gif.url);
};
