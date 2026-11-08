/**
 * Transcrição de áudio no próprio navegador, com Whisper rodando em Web Worker.
 * Nada é enviado para servidor: o áudio é decodificado aqui e o texto sai daqui
 * também. O modelo fica em cache depois do primeiro uso.
 */
import { fecharContexto } from '@/lib/audioCorte';

const CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
const MODELO = 'Xenova/whisper-base';
const TAXA = 16000;

/** Baixa o áudio e devolve as amostras mono em 16 kHz. */
export const decodificarAudio = async (url) => {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error('não consegui baixar o áudio');
  const bytes = await resposta.arrayBuffer();

  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!Contexto) throw new Error('este navegador não decodifica áudio');
  const contexto = new Contexto();
  let audio;
  try {
    audio = await contexto.decodeAudioData(bytes);
  } finally {
    fecharContexto(contexto);
  }

  const canais = audio.numberOfChannels;
  const misturado = new Float32Array(audio.length);
  for (let canal = 0; canal < canais; canal += 1) {
    const dados = audio.getChannelData(canal);
    for (let i = 0; i < dados.length; i += 1) misturado[i] += dados[i] / canais;
  }

  if (Math.abs(audio.sampleRate - TAXA) < 1) return misturado;

  /* Reamostragem linear: suficiente para fala e não depende do que o navegador
     aceitou na hora de abrir o AudioContext. */
  const proporcao = audio.sampleRate / TAXA;
  const tamanho = Math.floor(misturado.length / proporcao);
  const saida = new Float32Array(tamanho);
  for (let i = 0; i < tamanho; i += 1) {
    const posicao = i * proporcao;
    const antes = Math.floor(posicao);
    const depois = Math.min(antes + 1, misturado.length - 1);
    const peso = posicao - antes;
    saida[i] = misturado[antes] * (1 - peso) + misturado[depois] * peso;
  }
  return saida;
};

let worker = null;
let modeloPronto = false;
let semWorker = false;

const criarWorker = () => {
  try {
    const instancia = new Worker(new URL('./whisper.worker.js', import.meta.url), { type: 'module' });
    worker = instancia;
    return instancia;
  } catch (falha) {
    semWorker = true;
    return null;
  }
};

let motorNaPagina = null;

/** Caminho de emergência: roda o modelo aqui mesmo, sem worker. */
const transcreverNaPagina = async (amostras, aoProgresso) => {
  if (!motorNaPagina) {
    const endereco = `${CDN}/dist/transformers.min.js`;
    const mod = await import(/* @vite-ignore */ endereco);
    mod.env.allowLocalModels = false;
    mod.env.useBrowserCache = true;
    mod.env.backends.onnx.wasm.wasmPaths = `${CDN}/dist/`;
    motorNaPagina = await mod.pipeline('automatic-speech-recognition', MODELO, {
      quantized: true,
      progress_callback: (info) => {
        if (info?.status === 'progress' && typeof info.progress === 'number') {
          aoProgresso({ fase: 'modelo', valor: Math.round(info.progress) });
        }
      },
    });
  }
  const motor = motorNaPagina;
  aoProgresso({ fase: 'transcrevendo', valor: 0 });
  const saida = await motor(amostras, {
    language: 'portuguese',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  modeloPronto = true;
  return String(saida?.text || '').replace(/\s+/g, ' ').trim();
};

/**
 * Transcreve um áudio. `aoProgresso` recebe { fase, valor }, com fase
 * 'modelo' (download do modelo na primeira vez) ou 'transcrevendo'.
 */
const rodarNoWorker = (instancia, amostras, aoProgresso) =>
  new Promise((resolver, rejeitar) => {
    const encerrar = () => {
      instancia.removeEventListener('message', ouvir);
      instancia.removeEventListener('error', falhar);
    };

    const ouvir = (evento) => {
      const dados = evento.data || {};
      if (dados.tipo === 'progresso') {
        if (dados.fase === 'transcrevendo') modeloPronto = true;
        aoProgresso({ fase: dados.fase, valor: dados.valor });
        return;
      }
      if (dados.tipo === 'resultado') {
        modeloPronto = true;
        encerrar();
        resolver(dados.texto || '');
        return;
      }
      if (dados.tipo === 'erro') {
        encerrar();
        rejeitar(new Error(dados.mensagem || 'falha na transcrição'));
      }
    };

    const falhar = (evento) => {
      encerrar();
      rejeitar(new Error(evento?.message || 'o transcritor parou'));
    };

    instancia.addEventListener('message', ouvir);
    instancia.addEventListener('error', falhar);
    instancia.postMessage({ amostras });
  });

/**
 * Transcreve um áudio. `aoProgresso` recebe { fase, valor }, com fase
 * 'modelo' (download do modelo na primeira vez) ou 'transcrevendo'.
 * O trabalho acontece num worker; se ele não subir, roda na própria página.
 */
export const transcreverAudio = async (url, aoProgresso = () => {}) => {
  const amostras = await decodificarAudio(url);
  const instancia = semWorker ? null : worker || criarWorker();

  if (instancia) {
    try {
      return await rodarNoWorker(instancia, amostras, aoProgresso);
    } catch (falha) {
      console.warn('[Chat] transcritor em segundo plano falhou, tentando direto', falha);
      semWorker = true;
      try {
        instancia.terminate();
      } catch (erro) {
        // o worker já tinha saído
      }
      worker = null;
    }
  }

  return transcreverNaPagina(amostras, aoProgresso);
};

/** Descarta o worker e o modelo quando o chat fecha. */
export const encerrarTranscritor = () => {
  if (!worker) return;
  try {
    worker.terminate();
  } catch (falha) {
    // sem problema: o worker já não existia
  }
  worker = null;
  modeloPronto = false;
};

export const transcritorPronto = () => modeloPronto;
