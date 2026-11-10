import { useCallback, useEffect, useState } from 'react';
import GuiaPixie from '@/components/tutorial/GuiaPixie';
import MenuFlutuante from '@/components/desktop/MenuFlutuante';
import { assinarChamadoPixie, limparPixieEmEspera } from '@/lib/pixie';
import {
  AGRADECER_E_DESPEDIR,
  CHAMADO_PARA_PERGUNTAR,
  SAUDACAO,
  SEM_TUTORIAL,
  SOBRE_PIXIE,
  alvoDoPonto,
} from '@/lib/pixieTutoriais';
import {
  abrirMenuIniciar,
  chaveDoPasseio,
  passeioDe,
  resumoDoElemento,
  resumoDoPasseio,
  resumoDoPonto,
} from '@/lib/pixiePasseios';
import useCliqueEmPasseio from '@/lib/useCliqueEmPasseio';
import usePasseioGuiado from '@/lib/usePasseioGuiado';

/**
 * A Pixie em qualquer lugar do sistema, fora do tutorial.
 *
 * Parada, ela fica flutuando na tela sem balão e sem pegar o clique: a mesa é
 * da pessoa. De lá ela só sai por "Agradecer e se despedir".
 *
 * O botão direito dá o resumo de uma frase do lugar: é para saber o que é, não
 * para aprender a usar. O passeio inteiro (brilha o ícone, espera abrir e
 * explica passo por passo) só começa pelo menu dela, em "Perguntar", quando a
 * pessoa clica no ícone, na janela ou no widget que quer conhecer.
 */

const TEMPO_COM_TUTORIAL = 9000;
const TEMPO_ESPERANDO = 25000;
/* Tempo para ler a despedida antes de ela sair. */
const TEMPO_DA_DESPEDIDA = 2600;

export default function PixieAjuda() {
  /* { fala, apontando } enquanto ela tem um balão na tela. */
  const [estado, setEstado] = useState(null);
  const [menu, setMenu] = useState(null);
  /* Flutuando em silêncio: é como ela vive na mesa. */
  const [descansando, setDescansando] = useState(true);
  /* Quando a pessoa clica nela em vez de apontar um lugar: ela se explica. */
  const [sobre, setSobre] = useState(null);
  /* Falando a despedida, a caminho de sair da tela. */
  const [saindo, setSaindo] = useState(false);
  /* Agradecimento: ela gira e solta corações antes de sair. */
  const [comemorando, setComemorando] = useState(false);

  const irParaEspera = useCallback(() => {
    setEstado(null);
    setSaindo(false);
    setDescansando(true);
  }, []);

  /* O passeio em curso (widget, relógio, chat, Iniciar). */
  const passeio = usePasseioGuiado({ aoTerminar: irParaEspera });

  const parar = useCallback(() => {
    passeio.parar();
    setEstado(null);
    setSobre(null);
    setSaindo(false);
    setComemorando(false);
  }, [passeio]);

  /* Um passeio começa sempre daqui: ela limpa a fala antiga, marca a chave e,
     se o painel ainda não está aberto, abre pelo próprio alvo (o clique da
     pessoa já foi consumido pela camada dela). */
  const abrirPasseio = useCallback(
    (chave, elemento) => {
      const def = passeioDe(chave);
      if (!def) return false;
      setEstado(null);
      setSobre(null);
      setMenu(null);
      setSaindo(false);
      setDescansando(false);
      const jaAberto = def.aberto ? document.querySelector(def.aberto) : null;
      passeio.iniciar(chave);
      if (!jaAberto) elemento?.click?.();
      return true;
    },
    [passeio]
  );


  /* As páginas do Iniciar abrem por cima da camada dela: o clique nelas não
     chega no balão, chega neste ouvido. */
  const escolherPagina = useCallback(
    (chave, item) => {
      if (chave === 'iniciar') {
        setEstado({ fala: resumoDoPasseio('iniciar'), apontando: true });
        return;
      }
      abrirPasseio(chave, item);
    },
    [abrirPasseio]
  );

  /* Chamada pelo botão direito: só o resumo do lugar, ou a saudação quando ele
     ainda não tem texto. */
  useEffect(
    () =>
      assinarChamadoPixie(({ x, y, alvo }) => {
        parar();
        setMenu(null);
        setDescansando(false);
        const conhecida = alvo ? resumoDoElemento(alvo) : resumoDoPonto(x, y);
        setEstado(
          conhecida ? { fala: conhecida, apontando: false } : { fala: SAUDACAO, apontando: true }
        );
      }),
    [parar]
  );

  /* Cada fala tem seu tempo: esperando ela pode ficar mais. Terminada a fala
     ela não some, entra em espera. */
  useEffect(() => {
    if (!estado || descansando || sobre !== null || saindo || passeio.emTour) return undefined;
    const t = setTimeout(() => {
      setEstado(null);
      setDescansando(true);
    }, estado.apontando ? TEMPO_ESPERANDO : TEMPO_COM_TUTORIAL);
    return () => clearTimeout(t);
  }, [estado, descansando, sobre, saindo, passeio.emTour]);

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
      /* O Esc fecha o menu, depois o passeio, depois o balão. Ela continua
         flutuando. */
      if (menu) {
        setMenu(null);
        return;
      }
      if (passeio.emTour) {
        passeio.parar();
        irParaEspera();
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
  }, [menu, passeio, sobre, estado, saindo, irParaEspera]);

  /* Esperando um lugar, ela também escuta os cliques que passam por cima. */
  useCliqueEmPasseio(Boolean(estado?.apontando) && !saindo && !passeio.emTour, escolherPagina);

  const naTela = passeio.emTour || descansando || sobre !== null || Boolean(estado);
  if (!naTela) return null;

  const fala = passeio.emTour
    ? passeio.fala
    : descansando
      ? null
      : sobre !== null
        ? SOBRE_PIXIE[sobre]
        : estado?.fala || null;

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

  /* Explica o lugar em que a pessoa clicou: com passeio escrito, começa o
     passeio; sem, dá o resumo. */
  const explicarLugar = (x, y) => {
    const alvo = alvoDoPonto(x, y);
    /* O Iniciar é a porta das páginas: ele abre o menu e fica no resumo, porque
       o passeio que interessa é o da página escolhida ali dentro. */
    const itemDaPagina = alvo?.closest?.('[data-menu-iniciar] [data-passeio]');
    const chave = itemDaPagina
      ? itemDaPagina.getAttribute('data-passeio')
      : chaveDoPasseio(alvo);
    if (chave === 'iniciar') {
      abrirMenuIniciar();
      setEstado({ fala: resumoDoPasseio('iniciar'), apontando: true });
      return;
    }
    if (chave && abrirPasseio(chave, alvo)) return;
    setEstado({ fala: resumoDoElemento(alvo) || SEM_TUTORIAL, apontando: false });
  };


  const itensDoMenu = [
    {
      id: 'perguntar',
      rotulo: 'Perguntar',
      acao: () => {
        setMenu(null);
        parar();
        setDescansando(false);
        setEstado({ fala: CHAMADO_PARA_PERGUNTAR, apontando: true });
      },
    },
    { separador: true },
    {
      id: 'despedir',
      rotulo: 'Agradecer e se despedir',
      acao: () => {
        setMenu(null);
        parar();
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
        livre
        ancora={passeio.emTour ? passeio.ancora : null}
        comemorando={comemorando}
        capturarClique={
          passeio.emTour ? !passeio.livreParaClicar : sobre !== null || (Boolean(estado?.apontando) && !saindo)
        }
        aoClique={(evento, naPixie) => {
          const x = evento?.clientX ?? 0;
          const y = evento?.clientY ?? 0;

          /* No passeio o clique é o "continua"; no convite a tela é da pessoa,
             que precisa abrir o painel. */
          if (passeio.emTour) {
            if (!passeio.livreParaClicar) passeio.avancar();
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
