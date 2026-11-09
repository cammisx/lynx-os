import { useCallback, useEffect, useState } from 'react';
import { escalaAtual } from '@/lib/fonte';

/**
 * Posiciona uma lista suspensa em camada fixa sobre tudo.
 * Se não couber embaixo do campo, abre pra cima inteira.
 *
 * O html do app recebe `zoom` quando o tamanho de leitura não é Normal: a
 * medida do campo vem em px de tela, mas o painel (que abre por portal dentro
 * do html) posiciona em px locais. Por isso medimos tudo em px de tela e só
 * convertemos no fim — sem isso o painel abre torto e mais estreito.
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
    const zoom = escalaAtual();
    const r = el.getBoundingClientRect();
    const borda = 12 * zoom;
    const colado = 6 * zoom;
    const abaixo = window.innerHeight - r.bottom - borda;
    const acima = r.top - borda;
    const abrirAcima = abaixo < Math.min(alturaMax * zoom, 220 * zoom) && acima > abaixo;
    const disponivel = abrirAcima ? acima : abaixo;
    const altura = Math.max(150 * zoom, Math.min(alturaMax * zoom, disponivel));
    const largura = Math.max(Math.round(r.width), minWidth * zoom);
    const desejado = align === 'right' ? r.right - largura : r.left;
    const minimo = 8 * zoom;
    const left = Math.min(
      Math.max(minimo, desejado),
      Math.max(minimo, window.innerWidth - largura - minimo)
    );
    setPos({
      left: left / zoom,
      top: (abrirAcima ? Math.max(minimo, r.top - altura - colado) : r.bottom + colado) / zoom,
      width: largura / zoom,
      maxHeight: altura / zoom,
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
