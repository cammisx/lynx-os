import { useMemo } from 'react';
import { fatiasTextoRico } from '@/lib/textoRico';
import { ATALHOS_TODOS, normalizar } from '@/lib/mencoes';

const escapar = (valor) => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Quebra um trecho em pedaços, marcando os "@fulano" (e "@todos").
 * Trabalha sobre o texto original (com acento, como foi escrito) para os
 * índices não saírem do lugar; a versão sem acento entra como alternativa,
 * então "@chloe" também destaca quem se chama "Chloë".
 */
export const comMencoes = (valor, nomes) => {
  const texto = String(valor ?? '');
  if (!texto.includes('@')) return [{ texto, mencao: false }];

  const alvos = new Set();
  ATALHOS_TODOS.forEach((forma) => {
    alvos.add(forma);
    alvos.add(normalizar(forma));
  });
  (nomes || []).forEach((nome) => {
    const limpo = String(nome || '').trim();
    if (!limpo) return;
    alvos.add(limpo);
    alvos.add(normalizar(limpo));
  });

  const lista = [...alvos].filter(Boolean).sort((a, b) => b.length - a.length).map(escapar).join('|');
  if (!lista) return [{ texto, mencao: false }];

  // @ precisa abrir palavra e o nome precisa terminar em fim de palavra.
  const re = new RegExp(`(^|[\\s(.,;:!?"'\\-])(@(?:${lista}))(?![\\p{L}\\p{N}])`, 'giu');
  const pedacos = [];
  let cursor = 0;
  let achado = re.exec(texto);

  while (achado) {
    const inicioMencao = achado.index + achado[1].length;
    if (inicioMencao > cursor) {
      pedacos.push({ texto: texto.slice(cursor, inicioMencao), mencao: false });
    }
    pedacos.push({ texto: achado[2], mencao: true });
    cursor = inicioMencao + achado[2].length;
    achado = re.exec(texto);
  }

  if (cursor < texto.length) pedacos.push({ texto: texto.slice(cursor), mencao: false });
  return pedacos.length ? pedacos : [{ texto, mencao: false }];
};

/** Mostra o pedaço com as menções destacadas e as quebras de linha. */
const comQuebras = (valor, chave, nomes) =>
  comMencoes(valor, nomes).map((pedaco, indice) => {
    const linhas = pedaco.texto.split('\n');
    const conteudo = linhas.map((linha, posicao) => (
      <span key={`${chave}-p${indice}-l${posicao}`}>
        {posicao > 0 && <br />}
        {linha}
      </span>
    ));

    if (!pedaco.mencao) return <span key={`${chave}-p${indice}`}>{conteudo}</span>;

    return (
      <span
        key={`${chave}-p${indice}`}
        style={{
          color: 'var(--c1)',
          fontWeight: 600,
          background: 'color-mix(in srgb, var(--c1) 14%, transparent)',
          borderRadius: 4,
          padding: '0 3px',
        }}
      >
        {conteudo}
      </span>
    );
  });

/** Mostra a mensagem com a formatação, sem nunca interpretar HTML. */
export default function TextoRico({ texto, pessoas = [] }) {
  const fatias = useMemo(() => fatiasTextoRico(texto), [texto]);
  const nomes = useMemo(
    () => (Array.isArray(pessoas) ? pessoas.filter(Boolean) : []),
    [pessoas]
  );

  return fatias.map((fatia, indice) => {
    const chave = `f${indice}`;
    if (fatia.tipo === 'forte')
      return <strong key={chave}>{comQuebras(fatia.valor, chave, nomes)}</strong>;
    if (fatia.tipo === 'italico')
      return <em key={chave}>{comQuebras(fatia.valor, chave, nomes)}</em>;
    if (fatia.tipo === 'riscado')
      return (
        <span key={chave} style={{ textDecoration: 'line-through', opacity: 0.75 }}>
          {comQuebras(fatia.valor, chave, nomes)}
        </span>
      );
    if (fatia.tipo === 'codigo')
      return (
        <code
          key={chave}
          style={{
            fontFamily: 'monospace',
            fontSize: '0.95em',
            padding: '1px 4px',
            borderRadius: 4,
            background: 'color-mix(in srgb, var(--c2) 16%, transparent)',
          }}
        >
          {fatia.valor}
        </code>
      );
    if (fatia.tipo === 'link')
      return (
        <a
          key={chave}
          href={fatia.url}
          target="_blank"
          rel="noreferrer noopener"
          style={{ color: 'var(--c1)', textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          {fatia.valor}
        </a>
      );
    return <span key={chave}>{comQuebras(fatia.valor, chave, nomes)}</span>;
  });
}
