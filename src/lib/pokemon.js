/**
 * Quem é esse Pokémon? — dados da PokeAPI.
 *
 * A PokeAPI (pokeapi.co) é pública, não pede chave e libera CORS. A lista de
 * nomes é buscada uma única vez e fica em cache no módulo; os sprites saem
 * direto do repositório oficial de imagens (também sem chave), então cada
 * rodada do jogo não faz requisição nenhuma.
 */

const API = 'https://pokeapi.co/api/v2';
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/* Geração 1 (1-151): é a que todo mundo reconhece de bate-pronto, então serve
   melhor pra pausa rápida do time do que sortear entre os 1000+. Pra abrir
   mais gerações basta subir este número. */
export const TOTAL_GERACAO_1 = 151;

let promessaDoPool = null;

/** "nidoran-f" vira "Nidoran F", "mr-mime" vira "Mr Mime". */
export function nomeBonito(nome) {
  return String(nome)
    .split('-')
    .filter(Boolean)
    .map((pedaco) => pedaco.charAt(0).toUpperCase() + pedaco.slice(1).toLowerCase())
    .join(' ');
}

/** Arte oficial (grande), com queda para o sprite pequeno se a imagem falhar. */
export function spriteDoPokemon(id, arteOficial = true) {
  return arteOficial ? `${SPRITES}/other/official-artwork/${id}.png` : `${SPRITES}/${id}.png`;
}

/** Lista de { id, nome } da geração 1. Só a primeira rodada espera a resposta. */
export function carregarPokemons() {
  if (!promessaDoPool) {
    promessaDoPool = fetch(`${API}/pokemon?limit=${TOTAL_GERACAO_1}`)
      .then((resposta) => {
        if (!resposta.ok) throw new Error(`PokeAPI respondeu ${resposta.status}`);
        return resposta.json();
      })
      .then((dados) =>
        (dados.results || []).map((item, indice) => ({
          id: indice + 1,
          nome: nomeBonito(item.name),
        }))
      )
      .catch((erro) => {
        promessaDoPool = null; // deixa a próxima tentativa buscar de novo
        throw erro;
      });
  }
  return promessaDoPool;
}

/* Fisher-Yates: embaralha de verdade, diferente de ordenar por Math.random. */
const misturar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

/** Uma rodada: o alvo sorteado e três nomes errados pra completar as opções. */
export function sortearRodada(pokemons, alvoAnterior = null) {
  const candidatos = pokemons.filter((item) => item.id !== alvoAnterior?.id);
  const alvo = candidatos[Math.floor(Math.random() * candidatos.length)];
  const outros = misturar(pokemons.filter((item) => item.id !== alvo.id)).slice(0, 3);
  return { alvo, opcoes: misturar([alvo, ...outros]) };
}
