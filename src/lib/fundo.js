/**
 * Preparo da imagem de fundo do desktop.
 *
 * Uma foto de celular chega com 4000px e 6 MB. Como ela é só papel de parede,
 * reduzimos para no máximo 1920px no lado maior e recomprimimos em JPEG antes
 * de subir. Assim quem abre o sistema num PC modesto não paga o peso à toa.
 */
const LADO_MAXIMO = 1920;
const QUALIDADE = 0.82;

const leituraDeImagem = (arquivo) =>
  new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result || ''));
    leitor.onerror = () => reject(new Error('não consegui ler a imagem'));
    leitor.readAsDataURL(arquivo);
  });

const carregarImagem = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('imagem inválida'));
    img.src = src;
  });

/**
 * Devolve um File já reduzido. Se algo der errado no caminho, devolve o
 * arquivo original: melhor subir pesado do que não subir.
 */
export const prepararFundo = async (arquivo) => {
  try {
    const original = await leituraDeImagem(arquivo);
    const img = await carregarImagem(original);

    const maior = Math.max(img.width, img.height);
    const escala = maior > LADO_MAXIMO ? LADO_MAXIMO / maior : 1;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);

    const ctx = canvas.getContext('2d');
    if (!ctx) return arquivo;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob((resultado) => resolve(resultado), 'image/jpeg', QUALIDADE)
    );
    if (!blob) return arquivo;

    const nome = String(arquivo.name || 'fundo').replace(/\.[^.]+$/, '');
    return new File([blob], `${nome}-fundo.jpg`, { type: 'image/jpeg' });
  } catch (erro) {
    console.warn('[Fundo] não consegui reduzir a imagem, vai a original', erro?.message || erro);
    return arquivo;
  }
};
