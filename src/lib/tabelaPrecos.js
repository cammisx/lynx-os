/**
 * Tabela de preços da modelo: cada linha é um item e três valores — mínimo,
 * normal e máximo. Serve de guia para o chatter negociar sem inventar preço.
 *
 * Valores são guardados em reais (número com centavos) ou null quando o admin
 * deixou em branco. Quem digita vê sempre a moeda formatada.
 */
import { moeda } from '@/lib/financeiro';

export const COLUNAS = [
  { id: 'minimo', nome: 'Mínimo', dica: 'O piso da modelo: abaixo disso, não' },
  { id: 'normal', nome: 'Normal', dica: 'O preço do dia a dia' },
  { id: 'maximo', nome: 'Máximo', dica: 'O teto: pedido especial, horário ruim' },
];

const novoId = () =>
  `preco-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Converte o que veio do banco (ou da tela) em número de reais, ou null. */
export const valorNumerico = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 0) return null;
  return Math.round(numero * 100) / 100;
};

export const itemDePreco = (item = {}) => ({
  id: item.id || novoId(),
  item: String(item.item || ''),
  minimo: valorNumerico(item.minimo),
  normal: valorNumerico(item.normal),
  maximo: valorNumerico(item.maximo),
});

export const novoItemPreco = () => itemDePreco({});

/** O que vale gravar: só linhas com nome. Linha vazia é rascunho, não preço. */
export const itensParaSalvar = (itens = []) =>
  (itens || [])
    .map(itemDePreco)
    .filter((linha) => linha.item.trim())
    .map((linha) => ({ ...linha, item: linha.item.trim() }));

export const tabelaDe = (conteudo) => (conteudo?.tabela_precos || []).map(itemDePreco);

/** Texto do campo: moeda quando tem valor, travessão quando está em branco. */
export const textoDoValor = (valor) => {
  const numero = valorNumerico(valor);
  return numero === null ? '—' : moeda(numero);
};

/**
 * Máscara de dinheiro: conta os dígitos como centavos.
 * "1.234" digitado vira 12.34, "123456" vira 1234.56.
 */
export const valorDigitado = (texto) => {
  const digitos = String(texto || '').replace(/\D/g, '').slice(0, 11);
  if (!digitos) return null;
  return Number(digitos) / 100;
};

/** Para o campo mostrar o número pronto para editar (ex: "1234.56"). */
export const textoParaEditar = (valor) => {
  const numero = valorNumerico(valor);
  if (numero === null) return '';
  return numero.toFixed(2).replace('.', ',');
};

/**
 * Avisos que não bloqueiam o salvamento, só chamam atenção: preço fora de
 * ordem confunde quem está lendo a tabela.
 */
export const avisosDaTabela = (itens = []) => {
  const avisos = [];
  (itens || []).forEach((linha) => {
    const nome = String(linha.item || '').trim() || 'Item sem nome';
    const { minimo, normal, maximo } = itemDePreco(linha);
    if (minimo !== null && normal !== null && minimo > normal) {
      avisos.push(`${nome}: o mínimo está maior que o normal.`);
    }
    if (normal !== null && maximo !== null && normal > maximo) {
      avisos.push(`${nome}: o normal está maior que o máximo.`);
    }
    if (minimo === null && normal === null && maximo === null) {
      avisos.push(`${nome}: nenhum preço preenchido.`);
    }
  });
  return avisos;
};

/** Faixa de preço de uma linha, do jeito que o chatter lê em voz alta. */
export const faixaDoItem = (linha) => {
  const { minimo, normal, maximo } = itemDePreco(linha);
  if (minimo !== null && maximo !== null) {
    return `${moeda(minimo)} a ${moeda(maximo)}`;
  }
  const um = [minimo, normal, maximo].find((valor) => valor !== null);
  return um === undefined ? 'Sem preço' : moeda(um);
};
