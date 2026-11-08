import { CORACAO_MAPA } from '@/lib/coracaoPet';

/**
 * Coração em pixel art 8x8 na paleta do pet. Sem antialias, igual ao bicho.
 */
export default function CoracaoPet({ paleta, escala = 2 }) {
  const lado = 8 * escala;
  return (
    <svg
      width={lado}
      height={lado}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}
    >
      {CORACAO_MAPA.map((linha, y) =>
        [...linha].map((letra, x) =>
          letra === '.' ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={paleta?.[letra] || 'transparent'}
            />
          )
        )
      )}
    </svg>
  );
}
