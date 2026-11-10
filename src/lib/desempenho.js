/**
 * Desempenho: o que dá para desligar para o sistema ficar mais leve.
 *
 * Num computador que não aguenta, o peso do LynxOS vem do vidro fosco
 * (backdrop-filter espalhado pelo sistema), dos brilhos e das animações.
 * Cada item abaixo desliga uma dessas coisas.
 *
 * A escolha vale por aparelho, igual tema e fonte: o PC fraco é o PC, e o
 * celular não precisa pagar a conta. Fica guardada no perfil como uma lista
 * de ids, no mesmo espírito de `barra_ordem`: "blur,brilho,animacao".
 *
 * O que é puramente visual sai por atributo no <html> (`data-sem-blur` e
 * companhia), lido pelo CSS. O que muda o que é desenhado (pet, fundo e a
 * própria Pixie) também é lido por um hook, para o React parar de montar
 * essas peças.
 */
import { useEffect, useState } from 'react';

export const ITENS = [
  {
    id: 'blur',
    rotulo: 'Vidro fosco',
    dica: 'Tira o desfoque atrás das janelas e dos painéis: o fundo fica sólido.',
  },
  {
    id: 'brilho',
    rotulo: 'Brilhos e sombras',
    dica: 'Sem o glow das janelas, dos botões e das molduras.',
  },
  {
    id: 'animacao',
    rotulo: 'Animações',
    dica: 'Sem abertura de janela, seda do fundo, moldura pulsando e corações.',
  },
  {
    id: 'fundo',
    rotulo: 'Imagem do fundo',
    dica: 'Usa a cor lisa no lugar da imagem do desktop.',
  },
  {
    id: 'pet',
    rotulo: 'Pet do desktop',
    dica: 'O bichinho sai da tela.',
  },
  {
    id: 'pixie',
    rotulo: 'Pixie parada',
    dica: 'Ela continua ali para explicar, mas fica parada, sem voar e sem animação.',
  },
];

export const IDS = ITENS.map((item) => item.id);

/** Lista limpa e sem repetição: só ids que existem. */
export const lerDesempenho = (valor) => {
  const bruto = Array.isArray(valor)
    ? valor
    : typeof valor === 'string'
      ? valor.split(',')
      : [];
  return [...new Set(bruto.map((item) => String(item).trim()).filter((item) => IDS.includes(item)))];
};

export const escreverDesempenho = (lista) => lerDesempenho(lista).join(',');

/** O interruptor mestre: todos os itens desligados. */
export const modoLeveLigado = (lista) => lerDesempenho(lista).length === IDS.length;

export const estaLigado = (lista, id) => lerDesempenho(lista).includes(id);

/* --- o conjunto em vigor, para o CSS e para quem desenha --- */

let atual = [];
const ouvintes = new Set();

/** Escreve nos atributos do <html> e avisa quem desenha (pet, fundo, Pixie). */
export const aplicarDesempenho = (valor) => {
  atual = lerDesempenho(valor);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    IDS.forEach((id) => {
      if (atual.includes(id)) root.setAttribute(`data-sem-${id}`, '');
      else root.removeAttribute(`data-sem-${id}`);
    });
  }
  ouvintes.forEach((fn) => fn(atual));
  return atual;
};

export const desempenhoAtual = () => atual;

const assinar = (fn) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};

/** O conjunto em vigor, reagindo a mudanças (trocar de aparelho, salvar). */
export const useDesempenho = () => {
  const [lista, setLista] = useState(atual);
  useEffect(() => {
    /* O perfil pode ser aplicado entre o primeiro render e este efeito (é o
       que acontece ao abrir o sistema com o modo leve já salvo): sem esta
       leitura a escolha ficava valendo no CSS e não no que é desenhado. */
    setLista(atual);
    return assinar(setLista);
  }, []);
  return lista;
};
