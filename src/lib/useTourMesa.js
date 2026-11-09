/**
 * O passeio da área de trabalho, num fio só para quem quiser tocar.
 *
 * Vive aqui e não dentro do tutorial porque a explicação é a mesma na
 * publicação toda: o roteiro do primeiro acesso usa este fio, e a ajuda da
 * Pixie (menu de clique direito da mesa) usa o mesmo. Cada passo pode ter uma
 * ação (abrir o menu da mesa, abrir a janela de Configurações) e sai no
 * clique ou sozinho depois de um tempo, para ninguém ficar preso.
 */
import { useEffect, useRef, useState } from 'react';
import { TOUR_MESA, executarAcaoDoTour } from '@/lib/pixieTourMesa';

export const ESPERA_DO_PASSO = 8000;
/* A última fala sai sozinha mais cedo: no fim, quem conduz é a pessoa. */
export const ESPERA_DO_ULTIMO = 4000;

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

    const fala = TOUR_MESA[passo];
    if (fala?.acao) executarAcaoDoTour(fala.acao);
    const espera = passo === TOUR_MESA.length - 1 ? ESPERA_DO_ULTIMO : ESPERA_DO_PASSO;
    const t = setTimeout(() => setPasso((atual) => atual + 1), espera);
    return () => clearTimeout(t);
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
