/**
 * O fio de um passeio guiado, para quem quiser tocar.
 *
 * Passo 0 é sempre o convite: ela brilha o alvo e espera a pessoa abrir. Do
 * passo 1 em diante ela explica com o painel aberto e cada passo sai no clique
 * dela (ou no clique em qualquer lugar da tela, quando quem chama deixa).
 *
 * Quem abre e fecha as coisas é a `acao` do passo: assim ela pode explicar os
 * modais de mimo, folga e ajuste com eles abertos, sem pedir que a pessoa
 * ache o botão no meio da explicação.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  brilharElemento,
  executarAcaoDePasseio,
  passeioDe,
  seguirElemento,
} from '@/lib/pixiePasseios';

/* Depois de abrir o painel, um clique perdido não pode pular a primeira fala. */
const TRAVA_APOS_ABRIR = 460;
const INTERVALO_DO_ABERTO = 200;

export default function usePasseioGuiado({ aoTerminar, aoPasso } = {}) {
  /* Qual passeio está no ar (o mapa é de todos eles). */
  const [chave, setChave] = useState(null);
  /* null = parado; 0 = convite para abrir; 1..n = passos da explicação. */
  const [passo, setPasso] = useState(null);
  /* Onde ela fica, medido a cada quadro. */
  const [ancora, setAncora] = useState(null);
  const def = passeioDe(chave);
  const terminar = useRef(aoTerminar);
  const aoPassar = useRef(aoPasso);
  const trava = useRef(0);

  useEffect(() => {
    terminar.current = aoTerminar;
  }, [aoTerminar]);

  useEffect(() => {
    aoPassar.current = aoPasso;
  }, [aoPasso]);

  const encerrar = useCallback(
    ({ avisar = true } = {}) => {
      const atual = passeioDe(chave);
      if (atual?.fechar) executarAcaoDePasseio(atual.fechar);
      if (atual?.alvo) brilharElemento(atual.alvo, false);
      setPasso(null);
      setAncora(null);
      if (avisar) terminar.current?.();
    },
    [chave]
  );

  /* Começa de onde a pessoa parou: se o painel já está aberto, vai direto para
     a explicação em vez de pedir mais um clique. */
  const iniciar = useCallback((novaChave) => {
    const atual = passeioDe(novaChave);
    if (!atual) return;
    trava.current = 0;
    setChave(novaChave);
    if (typeof document !== 'undefined' && atual.aberto && document.querySelector(atual.aberto)) {
      trava.current = Date.now() + TRAVA_APOS_ABRIR;
      setPasso(1);
      return;
    }
    setPasso(0);
  }, []);

  const avancar = useCallback(() => {
    if (passo === null) return;
    if (Date.now() < trava.current) return;
    const atual = passeioDe(chave);
    if (!atual) return;

    const doPasso = passo === 0 ? null : atual.passos[passo - 1];
    if (doPasso?.fecha) executarAcaoDePasseio(doPasso.fecha);

    const proximo = passo + 1;
    if (proximo > atual.passos.length) {
      encerrar();
      return;
    }
    trava.current = Date.now() + 320;
    setPasso(proximo);
  }, [passo, chave, encerrar]);

  /* Cada passo: roda a ação, brilha (no convite) e leva ela para o lado. */
  useEffect(() => {
    if (passo === null || !def) {
      setAncora(null);
      return undefined;
    }

    const convidando = passo === 0;
    const doPasso = convidando ? null : def.passos[passo - 1];
    if (doPasso?.acao) executarAcaoDePasseio(doPasso.acao);
    brilharElemento(def.alvo, convidando);
    aoPassar.current?.(passo, doPasso || null);

    const foco = convidando ? def.alvo : doPasso?.foco || def.aberto;
    const pararDeSeguir = seguirElemento(foco, setAncora, {
      lado: convidando ? null : 'esquerda',
      folga: convidando ? 46 : 56,
    });

    return pararDeSeguir;
  }, [passo, def]);

  /* O convite sai quando o painel aparece. */
  useEffect(() => {
    if (passo !== 0 || !def) return undefined;
    const relogio = setInterval(() => {
      if (!document.querySelector(def.aberto)) return;
      clearInterval(relogio);
      trava.current = Date.now() + TRAVA_APOS_ABRIR;
      setPasso(1);
    }, INTERVALO_DO_ABERTO);
    return () => clearInterval(relogio);
  }, [passo, def]);

  /* Saindo da tela sem terminar: nada de moldura acesa nem painel aberto. */
  useEffect(
    () => () => {
      if (!def) return;
      if (def.alvo) brilharElemento(def.alvo, false);
    },
    [def]
  );

  const parar = useCallback(() => encerrar({ avisar: false }), [encerrar]);

  const fala =
    !def || passo === null ? null : passo === 0 ? def.convite : def.passos[passo - 1]?.fala || null;

  return {
    chave,
    def,
    passo,
    emTour: passo !== null,
    /* No convite ela não pega o clique: a pessoa precisa abrir o painel. */
    livreParaClicar: passo === null || passo === 0,
    fala,
    ancora,
    iniciar,
    avancar,
    parar,
  };
}
