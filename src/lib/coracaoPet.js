/**
 * Coração em pixel art que sobe quando alguém faz carinho no pet.
 *
 * O mapa é 8x8 e reaproveita as letras da paleta do próprio pet: 'o' contorno,
 * 'b' corpo (a cor escolhida) e 'l' o brilho claro. Assim o coração sai sempre
 * na cor do bicho, sem precisar de um desenho por cor.
 */
export const CORACAO_MAPA = [
  '.oo..oo.',
  'olboobbo',
  'olbbbbbo',
  'obbbbbbo',
  '.obbbbo.',
  '..obbo..',
  '...oo...',
  '........',
];

/** Sprite do coração já com a paleta do pet, pronto para o PetSprite. */
export const coracaoDe = (sprite) => {
  if (!sprite?.paleta) return null;
  return { quadros: { pulso: [CORACAO_MAPA] }, paleta: sprite.paleta };
};
