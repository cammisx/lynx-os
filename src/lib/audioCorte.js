/**
 * Áudio para o som de notificação: ler o arquivo escolhido, desenhar a forma
 * de onda, cortar os 4 segundos que a pessoa quiser e devolver um WAV.
 *
 * Tudo acontece no navegador, sem servidor: o corte é renderizado offline e o
 * que sobe para a nuvem já é o trecho pronto, leve (mono, 22 kHz).
 */

export const DURACAO_MAXIMA = 4;
const TAXA_SAIDA = 22050;

const ContextoAudio = () =>
  typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;

export const audioSuportado = () => Boolean(ContextoAudio() && window.OfflineAudioContext);

/** Decodifica o arquivo escolhido. Lança erro se o navegador não conhecer o formato. */
export async function decodificarAudio(arquivo) {
  const Classe = ContextoAudio();
  if (!Classe) throw new Error('Este navegador não abre áudio.');
  const dados = await arquivo.arrayBuffer();
  const contexto = new Classe();
  try {
    return await contexto.decodeAudioData(dados);
  } catch (erro) {
    throw new Error('Não consegui ler este áudio. Tente mp3 ou wav.');
  } finally {
    contexto.close?.();
  }
}

/** Picos para desenhar a onda: um valor 0..1 por coluna. */
export function picosDaOnda(buffer, colunas = 320) {
  const canais = buffer.numberOfChannels;
  const tamanho = buffer.length;
  const passo = Math.max(1, Math.floor(tamanho / colunas));
  const saida = new Array(colunas).fill(0);
  for (let canal = 0; canal < canais; canal += 1) {
    const dados = buffer.getChannelData(canal);
    for (let coluna = 0; coluna < colunas; coluna += 1) {
      let maior = 0;
      const inicio = coluna * passo;
      const fim = Math.min(tamanho, inicio + passo);
      for (let i = inicio; i < fim; i += 1) {
        const valor = Math.abs(dados[i] || 0);
        if (valor > maior) maior = valor;
      }
      if (maior > saida[coluna]) saida[coluna] = maior;
    }
  }
  return saida;
}

const escreverTexto = (visao, posicao, texto) => {
  for (let i = 0; i < texto.length; i += 1) visao.setUint8(posicao + i, texto.charCodeAt(i));
};

/** WAV PCM 16 bits, um canal. */
function wavDoBuffer(buffer) {
  const dados = buffer.getChannelData(0);
  const tamanho = 44 + dados.length * 2;
  const visao = new DataView(new ArrayBuffer(tamanho));
  escreverTexto(visao, 0, 'RIFF');
  visao.setUint32(4, tamanho - 8, true);
  escreverTexto(visao, 8, 'WAVE');
  escreverTexto(visao, 12, 'fmt ');
  visao.setUint32(16, 16, true);
  visao.setUint16(20, 1, true);
  visao.setUint16(22, 1, true);
  visao.setUint32(24, buffer.sampleRate, true);
  visao.setUint32(28, buffer.sampleRate * 2, true);
  visao.setUint16(32, 2, true);
  visao.setUint16(34, 16, true);
  escreverTexto(visao, 36, 'data');
  visao.setUint32(40, dados.length * 2, true);
  let posicao = 44;
  for (let i = 0; i < dados.length; i += 1) {
    const amostra = Math.max(-1, Math.min(1, dados[i]));
    visao.setInt16(posicao, amostra < 0 ? amostra * 0x8000 : amostra * 0x7fff, true);
    posicao += 2;
  }
  return new Blob([visao], { type: 'audio/wav' });
}

/**
 * Recorta o trecho e devolve o WAV pronto para subir.
 * `inicio` e `duracao` em segundos.
 */
export async function cortarParaWav(buffer, inicio, duracao) {
  const ClasseOffline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!ClasseOffline) throw new Error('Este navegador não corta áudio.');
  const amostras = Math.max(1, Math.floor(Math.min(duracao, buffer.duration) * TAXA_SAIDA));
  const offline = new ClasseOffline(1, amostras, TAXA_SAIDA);
  const fonte = offline.createBufferSource();
  fonte.buffer = buffer;
  fonte.connect(offline.destination);
  /* O começo negativo existe quando o arquivo é mais curto que o pedido. */
  fonte.start(0, Math.max(0, inicio));
  const renderizado = await offline.startRendering();
  return wavDoBuffer(renderizado);
}

/** Toca só o trecho escolhido, para conferir antes de salvar. */
export function tocarTrecho(buffer, inicio, duracao, volume = 0.8) {
  const Classe = ContextoAudio();
  if (!Classe) return null;
  const contexto = new Classe();
  const fonte = contexto.createBufferSource();
  const ganho = contexto.createGain();
  ganho.gain.value = volume;
  fonte.buffer = buffer;
  fonte.connect(ganho);
  ganho.connect(contexto.destination);
  fonte.start(0, Math.max(0, inicio), duracao);
  fonte.onended = () => {
    try {
      contexto.close?.();
    } catch (erro) {
      // já fechado
    }
  };
  return {
    parar: () => {
      try {
        fonte.stop();
        contexto.close?.();
      } catch (erro) {
        // já parado
      }
    },
  };
}

export const formatarSegundos = (valor) => {
  const numero = Number(valor) || 0;
  return `${numero.toFixed(1).replace('.', ',')}s`;
};
