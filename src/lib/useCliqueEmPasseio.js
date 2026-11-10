/**
 * O clique que passa por cima dela.
 *
 * O menu Iniciar vive acima da camada da Pixie, então o clique numa página do
 * menu não chega nela: chega no item, que abre a janela. Este ouvido fica na
 * janela do navegador e, enquanto ela espera um lugar, vê esse clique, deixa a
 * página abrir e então começa o passeio dela.
 */
import { useEffect } from 'react';
import { PASSEIOS } from '@/lib/pixiePasseios';

export default function useCliqueEmPasseio(ativo, aoEscolher) {
  useEffect(() => {
    if (!ativo || typeof document === 'undefined') return undefined;

    const aoClicar = (evento) => {
      const item = evento.target?.closest?.('[data-passeio]');
      if (!item) return;
      /* O que é dela não conta: o balão e a camada dela também têm cliques. */
      if (item.closest('[data-pixie]')) return;
      const chave = item.getAttribute('data-passeio');
      if (!PASSEIOS[chave]) return;
      /* Deixa o clique terminar de abrir a janela; ela começa logo depois. */
      setTimeout(() => aoEscolher(chave, item), 240);
    };

    document.addEventListener('click', aoClicar, true);
    return () => document.removeEventListener('click', aoClicar, true);
  }, [ativo, aoEscolher]);
}
