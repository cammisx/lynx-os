import { memo } from 'react';
import { TAMANHO } from '@/lib/petsSprites';

/**
 * Desenha um quadro do pet. Cada caractere do mapa vira um quadradinho de
 * cor cheia, sem antialias: é isso que dá o aspecto de pixel art.
 */
function PetSprite({ sprite, acao = 'parado', quadro = 0, escala = 4, virado = false }) {
  if (!sprite) return null;
  const mapas = sprite.quadros[acao] || sprite.quadros.parado;
  const mapa = mapas[quadro % mapas.length] || mapas[0];
  const lado = TAMANHO * escala;

  return (
    <svg
      width={lado}
      height={lado}
      viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{
        display: 'block',
        transform: virado ? 'scaleX(-1)' : 'none',
        filter: 'drop-shadow(0 3px 5px rgba(0, 0, 0, 0.35))',
      }}
    >
      {mapa.map((linha, y) =>
        [...linha].map((letra, x) =>
          letra === '.' ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={sprite.paleta[letra] || 'transparent'}
            />
          )
        )
      )}
    </svg>
  );
}

export default memo(PetSprite);
