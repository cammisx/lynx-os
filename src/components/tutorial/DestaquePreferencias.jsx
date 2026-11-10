import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EVENTO_DESTAQUE, seguirAlvo } from '@/lib/destaquePreferencias';
import { DESTAQUE_PIXIE } from '@/lib/camadas';

/**
 * A moldura dourada em volta da área que a Pixie está explicando. Só desenha:
 * quem escolhe o alvo é o roteiro do passeio.
 *
 * A moldura anda junto com o item o tempo todo (rolagem, arrasto da janela,
 * animação de abertura, imagem carregando): a medida é conferida a cada quadro
 * e escrita direto no elemento, sem passar por estado, para não piscar.
 */
export default function DestaquePreferencias() {
  const [alvo, setAlvo] = useState(null);
  const moldura = useRef(null);

  useEffect(() => {
    const ouvir = (evento) => {
      const area = evento.detail?.area || null;
      const seletor = evento.detail?.seletor || null;
      setAlvo(area || seletor ? { area, seletor } : null);
    };
    window.addEventListener(EVENTO_DESTAQUE, ouvir);
    return () => window.removeEventListener(EVENTO_DESTAQUE, ouvir);
  }, []);

  useEffect(() => {
    if (!alvo) return undefined;
    const elemento = moldura.current;
    if (!elemento) return undefined;

    return seguirAlvo(alvo, (caixa) => {
      const no = moldura.current;
      if (!no) return;
      if (!caixa) {
        no.style.opacity = '0';
        return;
      }
      no.style.opacity = '1';
      no.style.left = `${caixa.left}px`;
      no.style.top = `${caixa.top}px`;
      no.style.width = `${caixa.width}px`;
      no.style.height = `${caixa.height}px`;
    });
  }, [alvo]);

  if (!alvo) return null;

  return createPortal(
    <div
      ref={moldura}
      aria-hidden="true"
      className="pref-destaque"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: 'none',
        /* Acima da janela, abaixo da Pixie. */
        zIndex: DESTAQUE_PIXIE,
        transition: 'opacity 160ms ease',
      }}
    />,
    document.body
  );
}
