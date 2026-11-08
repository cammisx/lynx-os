import { useCallback, useState } from 'react';
import {
  abrirJanela,
  alternarJanela,
  fecharJanela,
  janelaAtiva,
  minimizarJanela,
} from '@/lib/gerenciadorJanelas';

/** Estado das janelas abertas: abrir, fechar, minimizar e trazer para a frente. */
export default function useJanelas() {
  const [janelas, setJanelas] = useState([]);

  return {
    janelas,
    ativa: janelaAtiva(janelas),
    abrir: useCallback((id) => setJanelas((atuais) => abrirJanela(atuais, id)), []),
    fechar: useCallback((id) => setJanelas((atuais) => fecharJanela(atuais, id)), []),
    minimizar: useCallback((id) => setJanelas((atuais) => minimizarJanela(atuais, id)), []),
    alternar: useCallback((id) => setJanelas((atuais) => alternarJanela(atuais, id)), []),
  };
}
