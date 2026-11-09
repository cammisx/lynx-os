/**
 * Estrategias: os textos prontos que o time usa no atendimento.
 *
 * Regras:
 *  - quem cria, edita e exclui e o admin; o chatter so le e copia;
 *  - cada estrategia tem um nome (obrigatorio), uma descricao (opcional) e
 *    quantos itens quiser;
 *  - cada item e uma MENSAGEM, que e o bloco de texto que se copia, mais um
 *    campo opcional de INSTRUCOES, que explica como usar e nunca e copiado.
 *
 * Os itens ficam dentro da propria estrategia (array), como as secoes do
 * playbook: um item solto no banco so daria trabalho para ordenar e limpar.
 */
import { ehAdmin } from '@/lib/chat';

export const podeEditarEstrategia = (usuario) => ehAdmin(usuario);

export const idDeItem = () =>
  `it${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const itemVazio = () => ({ id: idDeItem(), mensagem: '', instrucoes: '' });

export const estrategiaVazia = () => ({
  nome: '',
  descricao: '',
  itens: [itemVazio()],
});

const texto = (valor) => (typeof valor === 'string' ? valor : '');

/** Deixa o registro do banco no formato que a tela espera. */
export const normalizarEstrategia = (registro) => {
  const itens = Array.isArray(registro?.itens) ? registro.itens : [];
  return {
    ...registro,
    nome: texto(registro?.nome),
    descricao: texto(registro?.descricao),
    itens: itens
      .filter((item) => item && (texto(item.mensagem).trim() || texto(item.instrucoes).trim()))
      .map((item) => ({
        id: texto(item.id) || idDeItem(),
        mensagem: texto(item.mensagem),
        instrucoes: texto(item.instrucoes),
      })),
  };
};

/** O que vai para o banco: sem espacos sobrando e sem item vazio. */
export const paraSalvar = (estrategia) => ({
  nome: texto(estrategia?.nome).trim(),
  descricao: texto(estrategia?.descricao).trim(),
  itens: (Array.isArray(estrategia?.itens) ? estrategia.itens : [])
    .map((item) => ({
      id: texto(item?.id) || idDeItem(),
      mensagem: texto(item?.mensagem).trim(),
      instrucoes: texto(item?.instrucoes).trim(),
    }))
    .filter((item) => item.mensagem || item.instrucoes),
});

/** Nome e obrigatorio; uma estrategia sem nenhuma mensagem nao serve. */
export const problemasDaEstrategia = (estrategia) => {
  const limpa = paraSalvar(estrategia);
  const problemas = [];
  if (!limpa.nome) problemas.push('Dê um nome para a estratégia.');
  if (!limpa.itens.some((item) => item.mensagem)) {
    problemas.push('Adicione pelo menos uma mensagem.');
  }
  return problemas;
};

export const moverItem = (lista, de, para) => {
  if (para < 0 || para >= lista.length || de === para) return lista;
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
};

/** Copia com a área de transferência moderna e, se ela não existir, no antigo. */
export const copiarTexto = async (texto) => {
  if (!texto) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (falha) {
    /* segue para o plano B */
  }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch (falha) {
    return false;
  }
};
