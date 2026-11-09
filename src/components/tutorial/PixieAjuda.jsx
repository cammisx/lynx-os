import { useEffect, useState } from 'react';
import GuiaPixie from '@/components/tutorial/GuiaPixie';
import MenuFlutuante from '@/components/desktop/MenuFlutuante';
import { assinarChamadoPixie } from '@/lib/pixie';
import {
  AGRADECIMENTO,
  CHAMADO_PARA_PERGUNTAR,
  DESPEDIDA,
  SAUDACAO,
  SEM_TUTORIAL,
  SOBRE_PIXIE,
  alvoDoPonto,
  falaDoElemento,
  falaDoPonto,
  lugarDoElemento,
} from '@/lib/pixieTutoriais';
import useTourMesa from '@/lib/useTourMesa';

/**
 * A Pixie chamada pelo menu do botão direito, em qualquer lugar do sistema.
 *
 * Se o lugar clicado já tem tutorial escrito, ela chega falando dele. Na mesa
 * ela conta a explicação inteira (o mesmo passeio do primeiro acesso: abre o
 * menu com Preferências em destaque e a janela de Configurações junto). Se não
 * tem nada escrito, ela se apresenta e espera a pessoa apontar o que quer
 * saber.
 *
 * Terminada a explicação, o balão sai e ela fica só flutuando: a tela age como
 * se ela não estivesse ali, e ela só reage ao clique nela mesma, que abre o
 * menu dela (Perguntar, Agradecer, Se despedir).
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
  const [menu, setMenu] = useState(null);
  /* Terminada a explicação, ela fica por aí sem balão e sem pegar a tela. */
  const [descansando, setDescansando] = useState(false);
  /* Quando a pessoa clica nela em vez de apontar um lugar: ela se explica. */
  const [sobre, setSobre] = useState(null);
  const tour = useTourMesa({
    aoTerminar: () => {
      setEstado(null);
      setSaindo(false);
      setDescansando(true);
    },
  });

  useEffect(
    () =>
      assinarChamadoPixie(({ x, y, alvo }) => {
        const conhecida = alvo ? falaDoElemento(alvo) : falaDoPonto(x, y);
        const lugar = alvo ? lugarDoElemento(alvo) : lugarDoElemento(alvoDoPonto(x, y));
        setMenu(null);
        setDescansando(false);
        setSobre(null);
        setSaindo(false);

        /* A mesa não tem fala curta: chamada ali, ela conta a área de
           trabalho inteira, como no primeiro acesso. */
        if (lugar === 'mesa') {
          setEstado(null);
          tour.iniciar();
          return;
        }
        setEstado(
          conhecida
            ? { fala: conhecida, apontando: false }
            : { fala: SAUDACAO, apontando: true }
        );
      }),
    []
  );

  /* Cada fala tem seu tempo: esperando ela pode ficar mais. No passeio e no
     descanso quem manda é o passo (ou a pessoa), não esse relógio. */
  useEffect(() => {
    if (!estado || tour.emTour || descansando || sobre !== null) return undefined;
    const t = setTimeout(
      () => setSaindo(true),
      estado.apontando ? TEMPO_ESPERANDO : TEMPO_COM_TUTORIAL
    );
    return () => clearTimeout(t);
  }, [estado, tour.emTour, descansando, sobre]);

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
      else if (sobre !== null) setSobre(null);
      else if (descansando) setDescansando(false);
      else if (estado) setSaindo(true);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [estado, descansando, sobre, tour]);

  const naTela = tour.emTour || descansando || sobre !== null || Boolean(estado);
  if (!naTela) return null;

  const fala = tour.emTour
    ? tour.fala
    : descansando
      ? null
      : sobre !== null
        ? SOBRE_PIXIE[sobre]
        : estado?.fala;

  /* Próxima fala sobre ela mesma; na última, volta a perguntar o que a pessoa
     precisa. */
  const avancarSobre = () => {
    if (sobre + 1 < SOBRE_PIXIE.length) {
      setSobre(sobre + 1);
      return;
    }
    setSobre(null);
    setEstado({ fala: SAUDACAO, apontando: true });
  };

  /* Explica o lugar em que a pessoa clicou (ou a área de trabalho inteira). */
  const explicarLugar = (x, y) => {
    if (lugarDoElemento(alvoDoPonto(x, y)) === 'mesa') {
      setEstado(null);
      tour.iniciar();
      return;
    }
    setEstado({ fala: falaDoPonto(x, y) || SEM_TUTORIAL, apontando: false });
  };

  const itensDoMenu = [
    {
      id: 'perguntar',
      rotulo: 'Perguntar',
      acao: () => {
        setMenu(null);
        setDescansando(false);
        setSobre(null);
        setSaindo(false);
        setEstado({ fala: CHAMADO_PARA_PERGUNTAR, apontando: true });
      },
    },
    { separador: true },
    {
      id: 'agradecer',
      rotulo: 'Agradecer',
      acao: () => {
        setMenu(null);
        setDescansando(false);
        setEstado({ fala: AGRADECIMENTO, apontando: false });
      },
    },
    {
      id: 'despedir',
      rotulo: 'Se despedir',
      acao: () => {
        setMenu(null);
        setDescansando(false);
        setEstado({ fala: DESPEDIDA, apontando: false });
      },
    },
  ];

  return (
    <>
      <div
        style={{
          opacity: saindo && !tour.emTour && !descansando ? 0 : 1,
          transition: `opacity ${TEMPO_SAINDO}ms ease`,
        }}
      >
        <GuiaPixie
          texto={fala}
          esconderBalao={!fala}
          capturarClique={
            tour.emTour || sobre !== null || (Boolean(estado?.apontando) && !saindo)
          }
          aoClique={(evento, naPixie) => {
            const x = evento?.clientX ?? 0;
            const y = evento?.clientY ?? 0;
            if (tour.emTour) {
              tour.avancar();
              return;
            }
            /* Falando dela mesma: o clique nela passa a fala, o clique na tela
               volta a explicar o que a pessoa apontou. */
            if (sobre !== null) {
              if (naPixie) {
                avancarSobre();
                return;
              }
              setSobre(null);
              explicarLugar(x, y);
              return;
            }
            /* Clique nela: em qualquer estado ela se explica (o menu dela
               continua no botão direito). */
            if (naPixie) {
              setEstado(null);
              setMenu(null);
              setDescansando(false);
              setSobre(0);
              return;
            }
            /* Sem espera (já explicou o lugar, ou está em silêncio): o clique
               na tela é o menu de antes. */
            if (descansando || !estado?.apontando) {
              setMenu({ x, y });
              return;
            }
            explicarLugar(x, y);
          }}
          aoMenu={({ x, y }) => setMenu({ x, y })}
        />
      </div>

      {menu ? (
        <MenuFlutuante
          x={menu.x}
          y={menu.y}
          itens={itensDoMenu}
          onFechar={() => setMenu(null)}
        />
      ) : null}
    </>
  );
}
