import { useEffect, useState } from 'react';
import GuiaPixie from '@/components/tutorial/GuiaPixie';
import { assinarChamadoPixie, assinarPasseioMesa } from '@/lib/pixie';
import {
  SAUDACAO,
  SEM_TUTORIAL,
  falaDoElemento,
  falaDoPonto,
} from '@/lib/pixieTutoriais';
import useTourMesa from '@/lib/useTourMesa';

/**
 * A Pixie chamada pelo menu do botão direito, em qualquer lugar do sistema.
 *
 * Se o lugar clicado já tem tutorial escrito, ela chega falando dele. Se não
 * tem, ela se apresenta e espera a pessoa apontar o que quer saber. Depois de
 * responder, fica um tempo na tela e sai sozinha (Esc também dispensa).
 *
 * O passeio da área de trabalho mora aqui também: o menu da mesa pede
 * "Passeio pela área de trabalho" e ela conta os mesmos passos do tutorial,
 * abrindo o menu e a janela de Configurações. Aí o clique é o "continua" e o
 * Esc encerra o passeio.
 *
 * No tutorial (rota /tutorial) ela não entra: lá quem responde é o roteiro,
 * que já está com ela na tela.
 */

const TEMPO_COM_TUTORIAL = 9000;
const TEMPO_ESPERANDO = 25000;
const TEMPO_SAINDO = 500;

export default function PixieAjuda() {
  /* { fala, apontando } enquanto ela está na tela. */
  const [estado, setEstado] = useState(null);
  const [saindo, setSaindo] = useState(false);
  const tour = useTourMesa();

  useEffect(
    () =>
      assinarChamadoPixie(({ x, y, alvo }) => {
        const conhecida = alvo ? falaDoElemento(alvo) : falaDoPonto(x, y);
        setSaindo(false);
        setEstado(
          conhecida
            ? { fala: conhecida, apontando: false }
            : { fala: SAUDACAO, apontando: true }
        );
      }),
    []
  );

  /* O passeio da mesa pedido pelo menu: ela larga a fala curta e conduz. */
  useEffect(
    () =>
      assinarPasseioMesa(() => {
        setEstado(null);
        setSaindo(false);
        tour.iniciar();
      }),
    []
  );

  /* Cada fala tem seu tempo: esperando ela pode ficar mais. No passeio quem
     manda é o passo, não o relógio da fala curta. */
  useEffect(() => {
    if (!estado || tour.emTour) return undefined;
    const t = setTimeout(
      () => setSaindo(true),
      estado.apontando ? TEMPO_ESPERANDO : TEMPO_COM_TUTORIAL
    );
    return () => clearTimeout(t);
  }, [estado, tour.emTour]);

  useEffect(() => {
    if (!saindo) return undefined;
    const t = setTimeout(() => {
      setEstado(null);
      setSaindo(false);
    }, TEMPO_SAINDO);
    return () => clearTimeout(t);
  }, [saindo]);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key !== 'Escape') return;
      if (tour.emTour) tour.parar();
      else if (estado) setSaindo(true);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [estado, tour]);

  const fala = tour.emTour ? tour.fala : estado?.fala;
  if (!fala) return null;

  return (
    <div
      style={{
        opacity: tour.emTour || !saindo ? 1 : 0,
        transition: `opacity ${TEMPO_SAINDO}ms ease`,
      }}
    >
      <GuiaPixie
        texto={fala}
        capturarClique={tour.emTour || (Boolean(estado?.apontando) && !saindo)}
        aoClique={(evento) => {
          if (tour.emTour) {
            tour.avancar();
            return;
          }
          const resposta =
            falaDoPonto(evento?.clientX ?? 0, evento?.clientY ?? 0) || SEM_TUTORIAL;
          setEstado({ fala: resposta, apontando: false });
        }}
      />
    </div>
  );
}
