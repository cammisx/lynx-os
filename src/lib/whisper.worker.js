/**
 * Worker do transcritor: recebe as amostras já em 16 kHz e devolve o texto.
 * O Whisper fica aqui para a interface não travar enquanto ele pensa.
 */
const CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

let motor = null;
let modulo = null;

const avisar = (dados) => self.postMessage(dados);

const carregarModulo = async () => {
  if (modulo) return modulo;
  const endereco = `${CDN}/dist/transformers.min.js`;
  modulo = await import(/* @vite-ignore */ endereco);
  modulo.env.allowLocalModels = false;
  modulo.env.useBrowserCache = true;
  modulo.env.backends.onnx.wasm.wasmPaths = `${CDN}/dist/`;
  return modulo;
};

self.onmessage = async (evento) => {
  const { amostras } = evento.data || {};
  if (!amostras) return;
  try {
    const transformers = await carregarModulo();
    if (!motor) {
      avisar({ tipo: 'progresso', fase: 'modelo', valor: 0 });
      motor = await transformers.pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        quantized: true,
        progress_callback: (info) => {
          if (info?.status === 'progress' && typeof info.progress === 'number') {
            avisar({ tipo: 'progresso', fase: 'modelo', valor: Math.round(info.progress) });
          }
        },
      });
    }
    avisar({ tipo: 'progresso', fase: 'transcrevendo', valor: 0 });
    const saida = await motor(amostras, {
      language: 'portuguese',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    const texto = String(saida?.text || '').replace(/\s+/g, ' ').trim();
    avisar({ tipo: 'resultado', texto });
  } catch (falha) {
    avisar({ tipo: 'erro', mensagem: String(falha?.message || falha) });
  }
};
