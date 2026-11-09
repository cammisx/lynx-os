import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EVENTO_DESTAQUE, medirArea } from '@/lib/destaquePreferencias';

/**
 * A moldura dourada em volta da área das Preferências que a Pixie está
 * explicando. Só desenha: quem escolhe a área é o roteiro do passeio.
 *
 * A medida é refeita enquanto a pessoa rola a janela ou muda o tamanho da
 * tela, porque a moldura anda junto com o bloco.
 */
export default function DestaquePreferencias() {
  const [area, setArea] = useState(null);
  const [caixa, setCaixa] = useState(null);

  useEffect(() => {
    const ouvir = (evento) => setArea(evento.detail?.area || null);
    window.addEventListener(EVENTO_DESTAQUE, ouvir);
    return () => window.removeEventListener(EVENTO_DESTAQUE, ouvir);
  }, []);

  useEffect(() => {
    if (!area) {
      setCaixa(null);
      return undefined;
    }

    const medir = () => setCaixa(medirArea(area) || null);
    medir();
    /* A janela pode estar abrindo ainda: mede mais uma vez. */
    const atrasos = [160, 420].map((ms) => setTimeout(medir, ms));
    window.addEventListener('resize', medir);
    document.addEventListener('scroll', medir, true);

    return () => {
      atrasos.forEach(clearTimeout);
      window.removeEventListener('resize', medir);
      document.removeEventListener('scroll', medir, true);
    };
  }, [area]);

  if (!caixa) return null;

  return createPortal(
    <div
      aria-hidden="true"
      className="pref-destaque"
      style={{
        position: 'fixed',
        left: caixa.left,
        top: caixa.top,
        width: caixa.width,
        height: caixa.height,
        pointerEvents: 'none',
        /* Acima da janela, abaixo da Pixie. */
        zIndex: 9450,
      }}
    />,
    document.body
  );
}
