/**
 * O passeio da área de trabalho, num fio só para quem quiser tocar.
 *
 * Vive aqui e não dentro do tutorial porque a explicação é a mesma na
 * publicação toda: o roteiro do primeiro acesso usa este fio, e a ajuda da
 * Pixie (menu de clique direito da mesa) usa o mesmo. Cada passo pode ter uma
 * ação (abrir o menu da mesa, abrir a janela de Configurações) e sai no
 * clique, no ritmo de quem está lendo.
 */
import { useEffect, useRef, useState } from 'react';
import { TOUR_MESA, executarAcaoDoTour } from '@/lib/pixieTourMesa';

export default function useTourMesa({ aoTerminar } = {}) {
  const [passo, setPasso] = useState(null);
  const terminar = useRef(aoTerminar);

  useEffect(() => {
    terminar.current = aoTerminar;
  }, [aoTerminar]);

  useEffect(() => {
    if (passo === null) return undefined;

    /* Passou do último: encerra e avisa quem pediu o passeio. */
    if (passo >= TOUR_MESA.length) {
      setPasso(null);
      terminar.current?.();
      return undefined;
    }

    /* Nada de relógio: cada passo sai no clique, para dar tempo de ler. */
    const fala = TOUR_MESA[passo];
    if (fala?.acao) executarAcaoDoTour(fala.acao);
    return undefined;
  }, [passo]);

  return {
    passo,
    emTour: passo !== null,
    fala: passo === null ? null : TOUR_MESA[passo]?.fala || null,
    iniciar: () => setPasso(0),
    avancar: () => setPasso((atual) => (atual === null ? null : atual + 1)),
    parar: () => setPasso(null),
  };
}
