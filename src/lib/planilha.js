/**
 * Leitor de planilha .xlsx do extrato do Privacy.
 *
 * O arquivo é um zip: pegamos o XML da primeira aba e lemos as linhas na ordem
 * das células (o export do Privacy não usa referência de coluna). Strings podem
 * vir inline (t="str") ou na tabela compartilhada (t="s"), e as duas formas
 * são resolvidas aqui.
 */

import { unzipSync, strFromU8 } from 'fflate';

const acharEntrada = (arquivos, padrao) => Object.keys(arquivos).find((nome) => padrao.test(nome));

const textoDoNo = (no) => {
  if (!no) return '';
  const partes = [...no.getElementsByTagNameNS('*', 't')].map((t) => t.textContent || '');
  if (partes.length) return partes.join('');
  const valor = no.getElementsByTagNameNS('*', 'v')[0];
  return valor?.textContent || '';
};

const lerCompartilhadas = (arquivos) => {
  const chave = acharEntrada(arquivos, /^xl\/sharedStrings\.xml$/);
  if (!chave) return [];
  const doc = new DOMParser().parseFromString(strFromU8(arquivos[chave]), 'application/xml');
  return [...doc.getElementsByTagNameNS('*', 'si')].map((si) => textoDoNo(si));
};

/** Devolve a matriz de células da primeira aba, linha por linha. */
export const linhasDaPlanilha = (buffer) => {
  const arquivos = unzipSync(new Uint8Array(buffer));
  const chave =
    acharEntrada(arquivos, /^xl\/worksheets\/sheet1\.xml$/) ||
    acharEntrada(arquivos, /^xl\/worksheets\/.+\.xml$/);
  if (!chave) throw new Error('Planilha sem aba legível.');

  const compartilhadas = lerCompartilhadas(arquivos);
  const doc = new DOMParser().parseFromString(strFromU8(arquivos[chave]), 'application/xml');

  return [...doc.getElementsByTagNameNS('*', 'row')].map((row) =>
    [...row.getElementsByTagNameNS('*', 'c')].map((celula) => {
      if (celula.getAttribute('t') === 's') {
        const indice = Number(celula.getElementsByTagNameNS('*', 'v')[0]?.textContent || -1);
        return compartilhadas[indice] ?? '';
      }
      return textoDoNo(celula);
    })
  );
};

export const lerArquivoPlanilha = async (arquivo) => {
  const buffer = await arquivo.arrayBuffer();
  return linhasDaPlanilha(buffer);
};
