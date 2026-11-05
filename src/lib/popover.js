import { useCallback, useEffect, useState } from 'react';

/**
 * Posiciona uma lista suspensa em camada fixa sobre tudo.
 * Se não couber embaixo do campo, abre pra cima inteira.
 */
export default function usePopoverPos({
  open,
  anchorRef,
  alturaMax = 260,
  minWidth = 0,
  align = 'left',
}) {
  const [pos, setPos] = useState(null);

  const medir = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const abaixo = window.innerHeight - r.bottom - 12;
    const acima = r.top - 12;
    const abrirAcima = abaixo < Math.min(alturaMax, 220) && acima > abaixo;
    const disponivel = abrirAcima ? acima : abaixo;
    const altura = Math.max(150, Math.min(alturaMax, disponivel));
    const largura = Math.max(Math.round(r.width), minWidth);
    const desejado = align === 'right' ? r.right - largura : r.left;
    const left = Math.min(Math.max(8, desejado), Math.max(8, window.innerWidth - largura - 8));
    setPos({
      left,
      top: abrirAcima ? Math.max(8, r.top - altura - 6) : r.bottom + 6,
      width: largura,
      maxHeight: altura,
      abrirAcima,
    });
  }, [anchorRef, alturaMax, minWidth, align]);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return undefined;
    }
    medir();
    const aoMover = () => medir();
    window.addEventListener('scroll', aoMover, true);
    window.addEventListener('resize', aoMover);
    return () => {
      window.removeEventListener('scroll', aoMover, true);
      window.removeEventListener('resize', aoMover);
    };
  }, [open, medir]);

  return pos;
}
