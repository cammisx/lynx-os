import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import MenuFlutuante from './MenuFlutuante';
import { itemChamarPixie } from '@/lib/pixie';

/**
 * Menu de botão direito do app inteiro, no lugar do menu do navegador.
 *
 * O menu base entende onde está clicando: campo de texto ganha Copiar,
 * Recortar, Colar e Selecionar tudo; texto selecionado ganha Copiar; link e
 * imagem ganham as opções próprias.
 *
 * Telas e componentes somam itens pelo hook useMenuContexto().registrar,
 * recebendo o elemento clicado e devolvendo a lista deles (ou null).
 */

export const SEPARADOR = { separador: true };

const MenuContextoTela = createContext(null);

export const useMenuContexto = () => useContext(MenuContextoTela) || { registrar: () => () => {} };

const campoDe = (alvo) => {
  if (!alvo || typeof alvo.closest !== 'function') return null;
  if (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA') return alvo;
  return alvo.closest('input, textarea, [contenteditable="true"]') || null;
};

const textoDoCampo = (campo) => {
  if (!campo) return '';
  if (typeof campo.value === 'string') {
    const inicio = campo.selectionStart ?? 0;
    const fim = campo.selectionEnd ?? 0;
    return fim > inicio ? campo.value.slice(inicio, fim) : '';
  }
  return window.getSelection?.()?.toString?.() || '';
};

const copiar = async (texto) => {
  if (!texto) return false;
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (erro) {
    /* Sem permissão de área de transferência: o caminho antigo ainda salva. */
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const deu = document.execCommand('copy');
      area.remove();
      return deu;
    } catch (falhou) {
      return false;
    }
  }
};

const apagarSelecao = (campo) => {
  if (typeof campo.setRangeText === 'function') {
    const inicio = campo.selectionStart ?? 0;
    const fim = campo.selectionEnd ?? inicio;
    campo.setRangeText('', inicio, fim, 'end');
  } else {
    document.execCommand('delete');
  }
  campo.dispatchEvent(new Event('input', { bubbles: true }));
};

const recortar = async (campo) => {
  const texto = textoDoCampo(campo);
  if (!texto) return false;
  await copiar(texto);
  apagarSelecao(campo);
  return true;
};

const colar = async (campo) => {
  if (!campo) return false;
  let texto = '';
  try {
    texto = await navigator.clipboard.readText();
  } catch (erro) {
    /* Sem permissão de leitura: tenta o caminho antigo, que depende do
       elemento estar em foco (o menu não rouba o foco justamente por isso). */
    try {
      return document.execCommand('paste');
    } catch (falhou) {
      return false;
    }
  }
  if (!texto) return false;
  if (typeof campo.setRangeText === 'function') {
    const inicio = campo.selectionStart ?? campo.value?.length ?? 0;
    const fim = campo.selectionEnd ?? inicio;
    campo.setRangeText(texto, inicio, fim, 'end');
  } else {
    document.execCommand('insertText', false, texto);
  }
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
};

const selecionarTudo = (campo) => {
  if (typeof campo.select === 'function') {
    campo.select();
    return;
  }
  const faixa = document.createRange();
  faixa.selectNodeContents(campo);
  const selecao = window.getSelection();
  selecao.removeAllRanges();
  selecao.addRange(faixa);
};

const itensBase = (alvo) => {
  const campo = campoDe(alvo);
  const doCampo = textoDoCampo(campo);
  const solta = campo ? '' : window.getSelection?.()?.toString?.() || '';
  const texto = doCampo || solta;
  const itens = [];

  if (texto) {
    itens.push({ id: 'copiar', rotulo: 'Copiar', atalho: 'Ctrl+C', acao: () => copiar(texto) });
  }
  if (campo && texto) {
    itens.push({ id: 'recortar', rotulo: 'Recortar', atalho: 'Ctrl+X', acao: () => recortar(campo) });
  }
  if (campo) {
    itens.push({ id: 'colar', rotulo: 'Colar', atalho: 'Ctrl+V', acao: () => colar(campo) });
    itens.push({
      id: 'selecionar-tudo',
      rotulo: 'Selecionar tudo',
      atalho: 'Ctrl+A',
      acao: () => selecionarTudo(campo),
    });
  }

  const link = alvo.closest?.('a[href]');
  if (link) {
    if (itens.length) itens.push(SEPARADOR);
    const endereco = link.href;
    itens.push({
      id: 'abrir-link',
      rotulo: 'Abrir link em nova aba',
      acao: () => window.open(endereco, '_blank', 'noopener'),
    });
    itens.push({ id: 'copiar-link', rotulo: 'Copiar endereço do link', acao: () => copiar(endereco) });
  }

  const imagem = alvo.closest?.('img[src]');
  if (imagem) {
    if (itens.length) itens.push(SEPARADOR);
    const endereco = imagem.src;
    itens.push({
      id: 'abrir-imagem',
      rotulo: 'Abrir imagem em nova aba',
      acao: () => window.open(endereco, '_blank', 'noopener'),
    });
    itens.push({
      id: 'copiar-imagem',
      rotulo: 'Copiar endereço da imagem',
      acao: () => copiar(endereco),
    });
  }

  return itens;
};

export function MenuContextoProvider({ children }) {
  const [menu, setMenu] = useState(null);
  const coletores = useRef([]);

  const registrar = useCallback((coletor) => {
    if (typeof coletor !== 'function') return () => {};
    coletores.current.push(coletor);
    return () => {
      coletores.current = coletores.current.filter((atual) => atual !== coletor);
    };
  }, []);

  useEffect(() => {
    const aoAbrir = (evento) => {
      const alvo = evento.target;
      if (!(alvo instanceof Element)) return;
      /* Elementos com menu próprio (barra de tarefas, menus abertos) cuidam
         de si mesmos. */
      if (alvo.closest('[data-menu-own]')) return;

      const base = itensBase(alvo);
      const grupos = coletores.current
        .map((coletor) => {
          try {
            return coletor(alvo, evento) || [];
          } catch (erro) {
            console.warn('[Menu] coletor falhou', erro?.message || erro);
            return [];
          }
        })
        .filter((lista) => lista.length);

      const extras = [];
      grupos.forEach((lista) => {
        if (extras.length) extras.push(SEPARADOR);
        extras.push(...lista);
      });

      const semPixie = [...base, ...(base.length && extras.length ? [SEPARADOR] : []), ...extras];
      /* Chamar a Pixie está em todo menu: ela é a explicação do sistema. E
         com isso todo lugar tem menu, mesmo onde antes vinha o do navegador. */
      const itens = [
        ...semPixie,
        ...(semPixie.length ? [SEPARADOR] : []),
        itemChamarPixie({ x: evento.clientX, y: evento.clientY, alvo: evento.target }),
      ];
      evento.preventDefault();
      setMenu({ x: evento.clientX, y: evento.clientY, itens });
    };

    document.addEventListener('contextmenu', aoAbrir);
    return () => document.removeEventListener('contextmenu', aoAbrir);
  }, []);

  return (
    <MenuContextoTela.Provider value={{ registrar }}>
      {children}
      {menu ? (
        <MenuFlutuante x={menu.x} y={menu.y} itens={menu.itens} onFechar={() => setMenu(null)} />
      ) : null}
    </MenuContextoTela.Provider>
  );
}
