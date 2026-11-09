/**
 * O fio do passeio das notificações.
 *
 * Igual ao passeio da mesa em espírito, diferente no jeito de andar: aqui a
 * pessoa mexe na tela de verdade (troca a aba, fecha a janela, clica no sino,
 * abre o aviso). Por isso o passo ou sai no clique (quando ela está só
 * explicando) ou sai quando o elemento esperado aparece (quando quem age é a
 * pessoa) — e, nesse segundo caso, o clique da tela fica livre para ela.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PASSEIO_AVISOS,
  SELETOR_AVISOS,
  avisoDoPasseioAgora,
  executarAcaoDeAvisos,
  falaDoPasso,
} from '@/lib/pixieAvisos';
import {
  destacarArea,
  destacarSeletor,
  limparDestaque,
  seguirAlvo,
} from '@/lib/destaquePreferencias';

const INTERVALO = 240;

export default function useTourAvisos({ aoTerminar, aoPrepararAviso } = {}) {
  const [passo, setPasso] = useState(null);
  /* Passo em que ela espera a pessoa agir: o clique da tela fica livre. */
  const [esperando, setEsperando] = useState(false);
  /* A moldura do passo, para ela parar do lado. */
  const [caixa, setCaixa] = useState(null);
  /* O que aconteceu quando o aviso abriu: { comDialogo, tipo }. */
  const [aberta, setAberta] = useState(null);
  const terminar = useRef(aoTerminar);
  /* Quem escolhe (ou cria) o aviso que ela vai abrir: o tutorial, que tem o
     usuário da sessão. Fica em ref para não depender da ordem dos efeitos. */
  const preparar = useRef(aoPrepararAviso);

  useEffect(() => {
    terminar.current = aoTerminar;
  }, [aoTerminar]);

  useEffect(() => {
    preparar.current = aoPrepararAviso;
  }, [aoPrepararAviso]);

  const parar = useCallback(() => {
    setPasso(null);
    setEsperando(false);
    setCaixa(null);
    setAberta(null);
    limparDestaque();
  }, []);

  useEffect(() => {
    if (passo === null) return undefined;

    /* Passou do último: encerra e devolve o controle para quem chamou. */
    if (passo >= PASSEIO_AVISOS.length) {
      setPasso(null);
      setEsperando(false);
      setCaixa(null);
      limparDestaque();
      terminar.current?.();
      return undefined;
    }

    const atual = PASSEIO_AVISOS[passo];
    if (atual.acao === 'garantirAviso') preparar.current?.();
    else if (atual.acao) executarAcaoDeAvisos(atual.acao);

    const alvo = typeof atual.alvo === 'function' ? atual.alvo() : atual.alvo;

    /* A moldura: bloco das Configurações ou elemento solto na tela. */
    if (atual.area) destacarArea(atual.area);
    else if (alvo) destacarSeletor(alvo);
    else limparDestaque();

    /* A caixa dela acompanha o alvo o tempo todo: sino, painel, linha do aviso
       ou bloco das Configurações, mesmo com o painel abrindo animando. */
    const pararDeSeguir = seguirAlvo({ area: atual.area, seletor: alvo }, (box) => {
      if (box) setCaixa(box);
    });

    /* Passo de espera: sai quando o elemento aparece (ou quando o tempo do
       passo acaba, no aviso que não abre janela). */
    let relogio = null;
    if (atual.espera) {
      const inicio = Date.now();
      setEsperando(true);
      relogio = setInterval(() => {
        const achou = Boolean(document.querySelector(atual.espera));
        const estourou = Boolean(atual.esperaMaxima) && Date.now() - inicio >= atual.esperaMaxima;
        if (!achou && !estourou) return;
        clearInterval(relogio);
        setEsperando(false);
        setAberta({
          comDialogo: achou && atual.espera === SELETOR_AVISOS.dialogo,
          tipo: avisoDoPasseioAgora()?.tipo || null,
        });
        setPasso((atualPasso) => (atualPasso === passo ? passo + 1 : atualPasso));
      }, INTERVALO);
    } else {
      setEsperando(false);
    }

    return () => {
      pararDeSeguir();
      if (relogio) clearInterval(relogio);
    };
  }, [passo]);

  /* Sai da tela (ou do tutorial) sem deixar moldura acesa. */
  useEffect(() => () => limparDestaque(), []);

  return {
    passo,
    emTour: passo !== null,
    esperando,
    fala: passo === null ? null : falaDoPasso(passo, aberta),
    caixa,
    iniciar: () => setPasso(0),
    avancar: () => {
      if (esperando) return;
      setPasso((atual) => (atual === null ? null : atual + 1));
    },
    parar,
  };
}
