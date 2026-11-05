/**
 * Tamanho de leitura do sistema.
 *
 * O shell é feito em px por todo lado, então mexer no font-size do html não
 * mudaria nada. O caminho que funciona é o `zoom` na raiz: ele escala o
 * desenho inteiro (texto, vidro, janelas, modais que abrem por portal) do
 * mesmo jeito que o zoom do navegador.
 *
 * Normal = 1, que é como o app sempre foi. Deixar o zoom fora do html quando
 * a escolha é Normal evita qualquer arredondamento de pixel no dia a dia.
 */
export const TAMANHOS = [
  { id: 'pequeno', nome: 'Pequeno', escala: 0.9, dica: 'cabe mais coisa na tela' },
  { id: 'normal', nome: 'Normal', escala: 1, dica: 'o padrão do sistema' },
  { id: 'grande', nome: 'Grande', escala: 1.15, dica: 'leitura mais confortável' },
  { id: 'muito-grande', nome: 'Muito grande', escala: 1.3, dica: 'para quem precisa de perto' },
];

export const FONTE_PADRAO = 'normal';

export const tamanhoPorId = (id) => TAMANHOS.find((tamanho) => tamanho.id === id) || TAMANHOS[1];

const PREFIXO_LOCAL = 'lynx:fonte';
const CHAVE_LOCAL = 'lynx:fonte';

/** Guarda a escolha no navegador também: vale antes do banco responder. */
export const fonteDoNavegador = () => {
  try {
    return window.localStorage.getItem(CHAVE_LOCAL) || '';
  } catch (erro) {
    return '';
  }
};

export const aplicarFonte = (id) => {
  const tamanho = tamanhoPorId(id);
  const root = document.documentElement;
  root.setAttribute('data-fonte', tamanho.id);
  root.style.setProperty('--escala-fonte', String(tamanho.escala));
  if (tamanho.escala === 1) root.style.removeProperty('zoom');
  else root.style.zoom = String(tamanho.escala);
  /* Janelas abertas precisam se reposicionar: com zoom maior a área útil
     encolhe e elas poderiam ficar com o pé fora da tela. */
  window.dispatchEvent(new CustomEvent('lynx:fonte'));
  try {
    window.localStorage.setItem(CHAVE_LOCAL, tamanho.id);
  } catch (erro) {
    // sem storage a escolha vale só nesta sessão
  }
  return tamanho;
};

export { PREFIXO_LOCAL };
