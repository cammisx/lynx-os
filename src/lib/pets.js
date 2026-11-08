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

export const falaAleatoria = (pet) => {
  const lista = FALAS[petValido(pet)] || [];
  if (!lista.length) return '';
  return lista[Math.floor(Math.random() * lista.length)];
};
