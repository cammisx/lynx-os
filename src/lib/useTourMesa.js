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
import { destacarArea, limparDestaque, seguirAlvo } from '@/lib/destaquePreferencias';

export default function useTourMesa({ aoTerminar } = {}) {
  const [passo, setPasso] = useState(null);
  /* A área das Preferências em destaque: { area, caixa }. */
  const [destaque, setDestaque] = useState(null);
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

    /* Passo sem área (a mesa, o menu, o fecho): nada em destaque. */
    if (!fala?.area) {
      limparDestaque();
      setDestaque(null);
      return undefined;
    }

    /* Passo com área: rola a janela até o bloco e passa a acompanhar a caixa.
       Ela fica do lado do bloco mesmo se a janela abrir animando, se a imagem
       do fundo carregar depois ou se a pessoa rolar e arrastar a janela. */
    destacarArea(fala.area);
    return seguirAlvo({ area: fala.area }, (caixa) => {
      if (caixa) setDestaque({ area: fala.area, caixa });
    });
  }, [passo]);

  /* Saindo do passeio (ou da tela), o destaque sai junto. */
  useEffect(
    () => () => {
      limparDestaque();
    },
    []
  );

  return {
    passo,
    emTour: passo !== null,
    fala: passo === null ? null : TOUR_MESA[passo]?.fala || null,
    /* A área em destaque, para ela parar do lado. */
    destaque,
    iniciar: () => setPasso(0),
    avancar: () => setPasso((atual) => (atual === null ? null : atual + 1)),
    parar: () => {
      setPasso(null);
      setDestaque(null);
      limparDestaque();
    },
  };
}
