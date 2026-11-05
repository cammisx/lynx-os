import { useMemo } from 'react';
import { fatiasTextoRico } from '@/lib/textoRico';

const comQuebras = (valor, chave) =>
  String(valor)
    .split('\n')
    .map((linha, indice) => (
      <span key={`${chave}-l${indice}`}>
        {indice > 0 && <br />}
        {linha}
      </span>
    ));

/** Mostra a mensagem com a formatação, sem nunca interpretar HTML. */
export default function TextoRico({ texto }) {
  const fatias = useMemo(() => fatiasTextoRico(texto), [texto]);

  return fatias.map((fatia, indice) => {
    const chave = `f${indice}`;
    if (fatia.tipo === 'forte') return <strong key={chave}>{comQuebras(fatia.valor, chave)}</strong>;
    if (fatia.tipo === 'italico') return <em key={chave}>{comQuebras(fatia.valor, chave)}</em>;
    if (fatia.tipo === 'riscado')
      return <span key={chave} style={{ textDecoration: 'line-through', opacity: 0.75 }}>{comQuebras(fatia.valor, chave)}</span>;
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
    return <span key={chave}>{comQuebras(fatia.valor, chave)}</span>;
  });
}
