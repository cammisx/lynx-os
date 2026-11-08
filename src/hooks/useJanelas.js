import { useCallback, useRef, useState } from 'react';
import {
  abrirItem,
  alternarItem,
  fecharItem,
  fixarItem,
  focarItem,
  itemNaFrente,
  minimizarItem,
  moverItem,
} from '@/lib/gerenciadorJanelas';

/**
 * Estado das janelas: quais estão abertas, qual está na frente, qual tem
 * alteração não salva, e a ordem dos ícones na barra.
 */
export default function useJanelas() {
  const [itens, setItens] = useState([]);
  const [sujas, setSujas] = useState({});
  const camada = useRef(1);

  const proximaCamada = useCallback(() => {
    camada.current += 1;
    return camada.current;
  }, []);

  return {
    itens,
    ativa: itemNaFrente(itens),
    sujas,
    abrir: useCallback((id) => setItens((a) => abrirItem(a, id, proximaCamada())), [proximaCamada]),
    fechar: useCallback((id) => setItens((a) => fecharItem(a, id)), []),
    minimizar: useCallback((id) => setItens((a) => minimizarItem(a, id)), []),
    focar: useCallback((id) => setItens((a) => focarItem(a, id, proximaCamada())), [proximaCamada]),
    alternar: useCallback(
      (id) => setItens((a) => alternarItem(a, id, proximaCamada())),
      [proximaCamada]
    ),
    fixar: useCallback((id) => setItens((a) => fixarItem(a, id)), []),
    mover: useCallback((origem, destino) => setItens((a) => moverItem(a, origem, destino)), []),
    marcarSujo: useCallback((id, sujo) => {
      setSujas((anteriores) => {
        if (Boolean(anteriores[id]) === Boolean(sujo)) return anteriores;
        return { ...anteriores, [id]: Boolean(sujo) };
      });
    }, []),
  };
}
