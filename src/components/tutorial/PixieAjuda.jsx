import { useCallback, useEffect, useState } from 'react';
import GuiaPixie from '@/components/tutorial/GuiaPixie';
import MenuFlutuante from '@/components/desktop/MenuFlutuante';
import {
  assinarChamadoPixie,
  limparPixieEmEspera,
  pixieEmEspera,
} from '@/lib/pixie';
import {
  AGRADECER_E_DESPEDIR,
  CHAMADO_PARA_PERGUNTAR,
  SAUDACAO,
  SEM_TUTORIAL,
  SOBRE_PIXIE,
  alvoDoPonto,
  falaDoElemento,
  falaDoPonto,
  lugarDoElemento,
} from '@/lib/pixieTutoriais';

/**
 * A Pixie chamada pelo menu do botão direito, em qualquer lugar do sistema.
 *
 * Se o lugar clicado já tem tutorial escrito, ela chega falando dele. Na mesa
 * (depois do tutorial) ela também só pergunta o que a pessoa precisa: o
 * passeio da área de trabalho acontece uma vez, no tutorial.
 *
 * Sem nada escrito, ela se apresenta e espera a pessoa apontar o que quer
 * saber. Terminada a fala (ou no Esc), o balão sai mas ela continua flutuando:
 * a tela volta a ser da pessoa e ela só reage ao clique nela (a apresentação
 * dela mesma) e ao botão direito nela (o menu). Quem tira ela da tela é
 * "Agradecer e se despedir".
 *
 * No tutorial (rota /tutorial) ela não entra: lá quem responde é o roteiro.
 */

const TEMPO_COM_TUTORIAL = 9000;
const TEMPO_ESPERANDO = 25000;
/* Tempo para ler a despedida antes de ela sair. */
const TEMPO_DA_DESPEDIDA = 2600;

export default function PixieAjuda() {
  /* { fala, apontando } enquanto ela tem um balão na tela. */
  const [estado, setEstado] = useState(null);
  const [menu, setMenu] = useState(null);
  /* Flutuando em silêncio: sem balão e sem pegar a tela. */
  const [descansando, setDescansando] = useState(() => pixieEmEspera());
  /* Quando a pessoa clica nela em vez de apontar um lugar: ela se explica. */
  const [sobre, setSobre] = useState(null);
  /* Falando a despedida, a caminho de sair da tela. */
  const [saindo, setSaindo] = useState(false);
  /* Agradecimento: ela gira e solta corações antes de sair. */
  const [comemorando, setComemorando] = useState(false);

  useEffect(
    () =>
      assinarChamadoPixie(({ x, y, alvo }) => {
        const conhecida = alvo ? falaDoElemento(alvo) : falaDoPonto(x, y);
        const lugar = alvo ? lugarDoElemento(alvo) : lugarDoElemento(alvoDoPonto(x, y));
        setMenu(null);
        setSobre(null);
        setSaindo(false);
        setDescansando(false);
        /* A mesa é só um lugar como outro qualquer aqui: o passeio inteiro é
           do tutorial, e não volta. */
        setEstado(
          conhecida && lugar !== 'mesa'
            ? { fala: conhecida, apontando: false }
            : { fala: SAUDACAO, apontando: true }
        );
      }),
    []
  );

  /* Parada em silêncio: ela fica na tela e só reage aos cliques nela. */
  const irParaEspera = useCallback(() => {
    setEstado(null);
    setSaindo(false);
    setDescansando(true);
  }, []);

  /* Cada fala tem seu tempo: esperando ela pode ficar mais. Terminada a fala
     ela não some, entra em espera. */
  useEffect(() => {
    if (!estado || descansando || sobre !== null || saindo) return undefined;
    const t = setTimeout(
      () => {
        setEstado(null);
        setDescansando(true);
      },
      estado.apontando ? TEMPO_ESPERANDO : TEMPO_COM_TUTORIAL
    );
    return () => clearTimeout(t);
  }, [estado, descansando, sobre, saindo]);

  /* A despedida é o único caminho que tira ela da tela. */
  useEffect(() => {
    if (!saindo) return undefined;
    const t = setTimeout(() => {
      setEstado(null);
      setSaindo(false);
      setComemorando(false);
      setDescansando(false);
      limparPixieEmEspera();
    }, TEMPO_DA_DESPEDIDA);
    return () => clearTimeout(t);
  }, [saindo]);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key !== 'Escape') return;
      /* O Esc fecha o menu, depois o balão. Ela continua flutuando. */
      if (menu) {
        setMenu(null);
        return;
      }
      if (sobre !== null) {
        setSobre(null);
        irParaEspera();
        return;
      }
      if (estado && !saindo) irParaEspera();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [estado, menu, sobre, saindo, irParaEspera]);

  const naTela = descansando || sobre !== null || Boolean(estado);
  if (!naTela) return null;

  const fala = descansando
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

  /* Explica o lugar em que a pessoa clicou. */
  const explicarLugar = (x, y) => {
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
      id: 'despedir',
      rotulo: 'Agradecer e se despedir',
      acao: () => {
        setMenu(null);
        setSobre(null);
        setDescansando(false);
        setEstado({ fala: AGRADECER_E_DESPEDIR, apontando: false });
        setComemorando(true);
        setSaindo(true);
      },
    },
  ];

  return (
    <>
      <GuiaPixie
        texto={fala}
        esconderBalao={!fala}
        comemorando={comemorando}
        capturarClique={sobre !== null || (Boolean(estado?.apontando) && !saindo)}
        aoClique={(evento, naPixie) => {
          const x = evento?.clientX ?? 0;
          const y = evento?.clientY ?? 0;
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
