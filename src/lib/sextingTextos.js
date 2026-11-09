/**
 * SEXTING: os passos da sequencia e as frases que a modelo manda.
 *
 * O tabuleiro nao mostra mais numeros soltos: cada valor e um passo da
 * sequencia, do "Inicial" (2) ate a "Chamada" (8192). Acima disso o bloco
 * volta a mostrar o numero, porque a sequencia nao tem fim (16384, 32768...).
 */
export const PASSOS = {
  2: 'Inicial',
  4: 'Vídeo do peito',
  8: 'Vídeo strip',
  16: 'Vídeo peito e PPK',
  32: 'Masturbação 1',
  64: 'Masturbação 2',
  128: 'Masturbação 3',
  256: 'Masturbação 4',
  512: 'Masturbação 5',
  1024: 'Finalização',
  2048: 'Solicitação de mídia',
  4096: 'Personalizado',
  8192: 'Chamada',
};

/** A tabela completa, na ordem, para a instrucao das configuracoes. */
export const SEQUENCIA = Object.entries(PASSOS).map(([valor, nome]) => ({
  valor: Number(valor),
  nome,
}));

/**
 * Texto que aparece dentro do bloco: o nome inteiro do passo, ou o numero
 * quando passa de 8192 (a sequencia nao tem fim).
 */
export const rotuloDoBloco = (valor) => (PASSOS[valor] ? PASSOS[valor].toUpperCase() : String(valor));

export const nomeDoPasso = (valor) => PASSOS[valor] || String(valor);


/**
 * Falas da modelo, disparadas na PRIMEIRA vez que o passo aparece na partida.
 * O sorteio evita repetir a frase anterior quando o grupo tem mais de uma.
 */
export const FRASES = {
  32: [
    'nossa amor, to louquinha de tesão aqui por vc 😈',
    'olha como eu to molhadinha aqui, mo 💦',
    'gosta da minha bucetinha, amor? 🥵',
  ],
  1024: [
    'AAHN OHWNNN AWHNN GOZEI AMOR 💦',
    'goza pra mim mo 🥵',
    'olha a bagunça que eu fiz 😈',
  ],
  2048: ['nossa amor que delícia de pau 🍆'],
  4096: ['vou amar fazer um vídeo bem especial pra vc amor 😘'],
  8192: ['isso amor, vamos gozar juntinhos numa chamada 📞'],
};

export const temFrase = (valor) => Object.prototype.hasOwnProperty.call(FRASES, valor);

/** Todos os passos que tem fala, em ordem. */
export const PASSOS_COM_FRASE = Object.keys(FRASES)
  .map(Number)
  .sort((a, b) => a - b);

/** Sorteia uma fala do passo, sem repetir a ultima que saiu. */
export const sortearFrase = (valor, ultima = null) => {
  const lista = FRASES[valor] || [];
  if (!lista.length) return null;
  if (lista.length === 1) return lista[0];
  const opcoes = lista.filter((frase) => frase !== ultima);
  return opcoes[Math.floor(Math.random() * opcoes.length)];
};

export const INSTRUCAO_SEXTING =
  'Como jogar: setas do teclado, WASD ou arraste o dedo. Dois blocos iguais se juntam e sobem um passo da sequência. ' +
  'A ordem é: 2 Inicial, 4 Vídeo do peito, 8 Vídeo strip, 16 Vídeo peito e PPK, 32 a 512 as Masturbações 1 a 5, ' +
  '1024 Finalização, 2048 Solicitação de mídia, 4096 Personalizado e 8192 Chamada. ' +
  'Depois da Chamada o jogo continua valendo pontos, sem fim.';
