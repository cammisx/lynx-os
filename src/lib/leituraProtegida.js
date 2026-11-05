/**
 * Abranda as leituras de entidade do app.
 *
 * O shell tem muitos pedaços pedindo as mesmas listas ao mesmo tempo (painel do
 * relógio, widgets do desktop, janelas abertas, efeitos duplicados do React em
 * desenvolvimento). Cada pedido vira uma requisição, e o servidor corta quem
 * passa de 140 leituras por minuto.
 *
 * Aqui ficam três proteções, todas invisíveis para quem usa:
 *   1. junta pedidos idênticos que aconteceram juntos (uma requisição só);
 *   2. guarda a resposta por dois segundos, para painel e widget não pedirem a
 *      mesma coisa no mesmo instante;
 *   3. se o servidor responder "rate limit", espera e tenta mais uma vez em vez
 *      de entregar lista vazia.
 *
 * Escrever (create, update, delete) sempre passa direto e joga fora o que
 * estava guardado daquela entidade: o que acabou de mudar aparece na hora.
 */

const VALIDADE_MS = 2000;
const ESPERA_RATE_LIMIT_MS = 4000;
const LEITURAS = new Set(['list', 'filter', 'get']);
const ESCRITAS = new Set(['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'bulkDelete']);

const ehRateLimit = (erro) => {
  const texto = `${erro?.message || ''} ${erro?.status || ''} ${erro?.data?.message || ''}`;
  return /rate limit/i.test(texto) || erro?.status === 429;
};

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chaveDe = (metodo, args) => {
  try {
    return `${metodo}:${JSON.stringify(args)}`;
  } catch (erro) {
    return null;
  }
};

export const criarLeitorProtegido = () => {
  const contador = { total: 0, porMinuto: 0, janela: [] };

  if (typeof window !== 'undefined') {
    // Conferir o volume pelo console: window.__lynxLeituras.porMinuto
    window.__lynxLeituras = contador;
  }

  const marcar = () => {
    const agora = Date.now();
    contador.total += 1;
    contador.janela.push(agora);
    contador.janela = contador.janela.filter((instante) => agora - instante < 60000);
    contador.porMinuto = contador.janela.length;
  };

  const embrulharEntidade = (entidade, protecoes) => {
    if (!entidade || typeof entidade !== 'object') return entidade;
    if (protecoes.has(entidade)) return protecoes.get(entidade);

    // Cada entidade tem seu próprio cache: não há como uma lista de Modelo
    // responder por uma lista de Shift.
    const cache = new Map();
    const emVoo = new Map();

    const esquecer = () => {
      cache.clear();
      emVoo.clear();
    };

    const ler = async (original, alvo, metodo, args) => {
      const chave = chaveDe(metodo, args);

      if (chave) {
        const guardado = cache.get(chave);
        if (guardado && Date.now() - guardado.em < VALIDADE_MS) return guardado.valor;
        if (emVoo.has(chave)) return emVoo.get(chave);
      }

      const pedido = (async () => {
        marcar();
        try {
          return await original.apply(alvo, args);
        } catch (erro) {
          if (!ehRateLimit(erro)) throw erro;
          // O servidor pediu calma: espera o tempo dele e tenta uma vez.
          await esperar(ESPERA_RATE_LIMIT_MS);
          marcar();
          return original.apply(alvo, args);
        }
      })();

      if (!chave) return pedido;

      /* A promessa controlada tira o pedido da fila antes de entregar o
         resultado (ou o erro): erro nunca fica preso impedindo a retentativa. */
      const controlado = pedido.then(
        (valor) => {
          cache.set(chave, { em: Date.now(), valor });
          emVoo.delete(chave);
          return valor;
        },
        (erro) => {
          emVoo.delete(chave);
          throw erro;
        }
      );

      emVoo.set(chave, controlado);
      return controlado;
    };

    const embrulhada = new Proxy(entidade, {
      get(alvo, propriedade) {
        const original = Reflect.get(alvo, propriedade, alvo);
        if (typeof original !== 'function') return original;
        if (LEITURAS.has(propriedade)) {
          return (...args) => ler(original, alvo, propriedade, args);
        }
        if (ESCRITAS.has(propriedade)) {
          return (...args) => {
            const escrita = original.apply(alvo, args);
            // Some com o guardado assim que a escrita dá certo.
            if (escrita && typeof escrita.then === 'function') {
              return escrita.then((resultado) => {
                esquecer();
                return resultado;
              });
            }
            esquecer();
            return escrita;
          };
        }
        return original.bind(alvo);
      },
    });

    protecoes.set(entidade, embrulhada);
    return embrulhada;
  };

  return {
    contador,
    protegerEntidades(entidades) {
      if (!entidades || typeof entidades !== 'object') return entidades;
      if (entidades.__protegido) return entidades;

      const protecoes = new WeakMap();

      return new Proxy(entidades, {
        get(alvo, propriedade) {
          if (propriedade === '__protegido') return true;
          const entidade = Reflect.get(alvo, propriedade, alvo);
          if (typeof propriedade !== 'string') return entidade;
          return embrulharEntidade(entidade, protecoes);
        },
      });
    },
  };
};

export const { contador: contadorLeituras, protegerEntidades } = criarLeitorProtegido();
