import { useCallback, useEffect, useRef, useState } from 'react';
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
import { hidratarItens, juntarOrdem, posicaoDeEntrada } from '@/lib/barraTarefas';

const ESPERA_SALVAR = 700;

/**
 * Estado das janelas: quais estão abertas, qual está na frente, qual tem
 * alteração não salva, e a ordem dos ícones na barra.
 *
 * A ordem é lembrada por usuário: chega em `ordemInicial`/`fixadasIniciais`
 * (vindas do perfil) e volta pelo `aoMudar` sempre que a barra muda.
 */
export default function useJanelas({ ordemInicial = [], fixadasIniciais = [], aoMudar } = {}) {
  const [itens, setItens] = useState([]);
  const [sujas, setSujas] = useState({});
  const camada = useRef(1);
  const ordemLembrada = useRef([]);
  const hidratado = useRef(false);
  const mexeu = useRef(false);
  const aoMudarRef = useRef(aoMudar);
  aoMudarRef.current = aoMudar;

  const proximaCamada = useCallback(() => {
    camada.current += 1;
    return camada.current;
  }, []);

  /* O perfil chega depois da primeira pintura: quando as listas salvas
     aparecem, a barra se organiza uma única vez. Depois disso quem manda é o
     que o usuário arrastou. */
  useEffect(() => {
    if (hidratado.current) return;
    if (!ordemInicial.length && !fixadasIniciais.length) return;
    hidratado.current = true;
    ordemLembrada.current = ordemInicial;
    setItens((atuais) => hidratarItens(atuais, ordemInicial, fixadasIniciais));
  }, [ordemInicial, fixadasIniciais]);

  /* Guarda a ordem depois que o usuário mexeu, nunca antes: senão a barra
     vazia do começo sobrescreveria o que estava salvo. */
  useEffect(() => {
    if (!mexeu.current) return;
    const ordem = juntarOrdem(itens, ordemLembrada.current);
    const fixadas = itens.filter((item) => item.fixada).map((item) => item.id);
    ordemLembrada.current = ordem;
    if (!aoMudarRef.current) return undefined;
    const relogio = setTimeout(() => aoMudarRef.current({ ordem, fixadas }), ESPERA_SALVAR);
    return () => clearTimeout(relogio);
  }, [itens]);

  const mexer = useCallback(() => {
    mexeu.current = true;
  }, []);

  const abrir = useCallback(
    (id) => {
      mexer();
      setItens((atuais) => {
        const existe = atuais.some((item) => item.id === id);
        const posicao = existe ? undefined : posicaoDeEntrada(atuais, id, ordemLembrada.current);
        return abrirItem(atuais, id, proximaCamada(), posicao);
      });
    },
    [mexer, proximaCamada]
  );

  return {
    itens,
    ativa: itemNaFrente(itens),
    sujas,
    /* Camada livre do gerenciador: quem abre por cima de todas as janelas
       (o relógio) usa isso para não nascer atrás de nenhuma delas. */
    proximaCamada,
    abrir,
    fechar: useCallback(
      (id) => {
        mexer();
        setItens((atuais) => fecharItem(atuais, id));
      },
      [mexer]
    ),
    minimizar: useCallback((id) => setItens((atuais) => minimizarItem(atuais, id)), []),
    focar: useCallback(
      (id) => setItens((atuais) => focarItem(atuais, id, proximaCamada())),
      [proximaCamada]
    ),
    alternar: useCallback(
      (id) => setItens((atuais) => alternarItem(atuais, id, proximaCamada())),
      [proximaCamada]
    ),
    fixar: useCallback(
      (id) => {
        mexer();
        setItens((atuais) => fixarItem(atuais, id));
      },
      [mexer]
    ),
    mover: useCallback(
      (origem, destino) => {
        mexer();
        setItens((atuais) => moverItem(atuais, origem, destino));
      },
      [mexer]
    ),
    marcarSujo: useCallback((id, sujo) => {
      setSujas((anteriores) => {
        if (Boolean(anteriores[id]) === Boolean(sujo)) return anteriores;
        return { ...anteriores, [id]: Boolean(sujo) };
      });
    }, []),
  };
}
