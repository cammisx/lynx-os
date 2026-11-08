/**
 * Pets do desktop: quem pode aparecer e o que cada um fala quando recebe
 * carinho. O desenho vem de petsSprites.js, que é gerado.
 *
 * A escolha é do usuário: sem pet, gato, cachorro ou morcego. Fica salva no
 * perfil, igual ao tema e ao fundo, então cada pessoa vê o bicho que quis.
 */
import { CORES, SPRITES } from '@/lib/petsSprites';

export const PET_PADRAO = 'nenhum';

export const PETS_DISPONIVEIS = [
  { id: 'nenhum', nome: 'Sem pet', dica: 'Nada passeando pelo desktop' },
  { id: 'gato', nome: 'Gato', dica: 'Dorme no sol e ignora você' },
  { id: 'cachorro', nome: 'Cachorro', dica: 'Festeiro, late pra tudo' },
  { id: 'morcego', nome: 'Morcego', dica: 'Acorda quando o sol cai' },
];

/* Cores de pelo oferecidas para qualquer pet. */
export const CORES_PET = CORES;

export const COR_PADRAO = 'original';

export const corValida = (valor) =>
  CORES_PET.some((item) => item.id === valor) ? valor : COR_PADRAO;

export const nomeDaCor = (cor) =>
  CORES_PET.find((item) => item.id === corValida(cor))?.nome || 'Original';

export const petValido = (valor) =>
  PETS_DISPONIVEIS.some((item) => item.id === valor) ? valor : PET_PADRAO;

export const temPet = (valor) => petValido(valor) !== 'nenhum';

/** O desenho do pet na cor escolhida. Os quadros são os mesmos; muda a paleta. */
export const spriteDe = (pet, cor) => {
  const base = SPRITES[petValido(pet)];
  if (!base) return null;
  const chave = base.paletas[corValida(cor)] ? corValida(cor) : COR_PADRAO;
  return { quadros: base.quadros, paleta: base.paletas[chave] };
};

export const nomeDoPet = (pet) => PETS_DISPONIVEIS.find((item) => item.id === petValido(pet))?.nome || 'Sem pet';

/* O que cada um diz quando você clica nele. */
export const FALAS = {
  gato: [
    'Miau.',
    'Já te vi trabalhando.',
    'Isso podia ser um cochilo.',
    'Colei aqui do nada.',
    'Petisco quando?',
  ],
  cachorro: [
    'Au au!',
    'Você voltou!',
    'Vamos passear?',
    'Tô aqui do seu lado.',
    'Isso aí, mais um turno!',
  ],
  morcego: [
    'Boa noite.',
    'Só passo pra assombrar.',
    'Eco, eco, eco.',
    'Você não dorme nunca?',
    'Gosto daqui de cima.',
  ],
};

/* O que cada um responde quando recebe carinho (o clique normal fica em FALAS).
   Esta lista e so o padrao: o admin pode trocar tudo pela janela de reacoes, que
   grava na entidade PetReacao. */
export const FALAS_CARINHO = {
  gato: [
    'Prrrrr...',
    'Tá bom, pode continuar.',
    'Ronrono só por educação.',
    'Mais atrás da orelha.',
    'Vou fingir que não gostei.',
  ],
  cachorro: [
    'Aí sim!',
    'De novo, de novo!',
    'Melhor parte do dia.',
    'Uau, carinho!',
    'Te amo, chefe.',
  ],
  morcego: [
    'Hmm, que quentinho.',
    'Ninguém nunca faz isso comigo.',
    'Fico pendurado, mas derretido.',
    'Guardo esse carinho pra noite.',
    'Só não para.',
  ],
};

/* Interacoes que existem para cada pet. O id e o mesmo que vai para o banco. */
export const TIPOS_REACAO = [
  { id: 'clique', nome: 'Clique normal', dica: 'Quando você clica no pet' },
  { id: 'carinho', nome: 'Fazer carinho', dica: 'Corações e animação de feliz' },
];

export const tipoReacaoValido = (valor) =>
  TIPOS_REACAO.some((item) => item.id === valor) ? valor : 'clique';

/** Frases de fabrica de um pet numa interacao. */
export const reacoesPadrao = (pet, tipo = 'clique') => {
  const fonte = tipoReacaoValido(tipo) === 'carinho' ? FALAS_CARINHO : FALAS;
  return [...(fonte[petValido(pet)] || [])];
};

/**
 * Agrupa os registros da entidade PetReacao em { pet: { clique: [], carinho: [] } }.
 * Pet ou tipo invalido e descartado: o que manda é o padrao do codigo.
 */
export const agruparReacoes = (registros = []) => {
  const mapa = {};
  registros.forEach((registro) => {
    const pet = petValido(registro?.pet);
    if (!temPet(pet)) return;
    const tipo = tipoReacaoValido(registro?.tipo);
    const texto = String(registro?.texto || '').trim();
    if (!texto) return;
    mapa[pet] = mapa[pet] || { clique: [], carinho: [] };
    mapa[pet][tipo].push(texto);
  });
  return mapa;
};

/** Frases que valem na tela: o banco manda e, sem registro, fica o padrao. */
export const frasesDe = (pet, tipo, reacoes = {}) => {
  const guardadas = reacoes?.[petValido(pet)]?.[tipoReacaoValido(tipo)] || [];
  return guardadas.length ? guardadas : reacoesPadrao(pet, tipo);
};

export const falaAleatoria = (pet, tipo = 'clique', reacoes = {}) => {
  const lista = frasesDe(pet, tipo, reacoes);
  if (!lista.length) return '';
  return lista[Math.floor(Math.random() * lista.length)];
};
