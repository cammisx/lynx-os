import { useCallback, useEffect, useRef, useState } from 'react';
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
  falaDoElemento,
  falaDoPonto,
  lugarDoElemento,
} from '@/lib/pixieTutoriais';
import {
  brilharElemento,
  passeioDoWidget,
  posicaoPertoDe,
  widgetDoElemento,
} from '@/lib/pixieWidgets';

/**
 * A Pixie em qualquer lugar do sistema, fora do tutorial.
 *
 * Parada, ela fica flutuando na tela sem balão e sem pegar o clique: a mesa é
 * da pessoa. De lá ela só sai por "Agradecer e se despedir".
 *
 * Chamada pelo menu do botão direito, ela responde conforme o lugar: ícone e
 * janela têm texto próprio, outros lugares mostram a saudação e esperam um
 * clique. Nos widgets do desktop (Turno, Páginas) ela conduz um passeio: brilha
 * o ícone e pede os dois cliques, espera o painel abrir, vai para o lado dele e
 * explica o que tem dentro, pedaço por pedaço.
 */

const TEMPO_COM_TUTORIAL = 9000;
const TEMPO_ESPERANDO = 25000;
/* Tempo para ler a despedida antes de ela sair. */
const TEMPO_DA_DESPEDIDA = 2600;
/* Depois de abrir o painel, um clique perdido não pode pular a primeira fala. */
const TRAVA_DO_PASSO = 500;

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
  /* Passeio de um widget: { chave, passo }. Passo 0 é o convite a abrir. */
  const [passeio, setPasseio] = useState(null);
  /* O ponto da tela onde ela fica durante o passeio. */
  const [ancora, setAncora] = useState(null);
  const travaRef = useRef(0);

  const parar = useCallback(() => {
    setPasseio(null);
    setEstado(null);
    setSobre(null);
    setSaindo(false);
    setComemorando(false);
  }, []);

  /* Chamada pelo botão direito: widget, lugar com texto ou saudação. */
  useEffect(
    () =>
      assinarChamadoPixie(({ x, y, alvo }) => {
        const chaveDoWidget = widgetDoElemento(alvo);
        const doWidget = passeioDoWidget(chaveDoWidget);
        parar();
        setMenu(null);
        setDescansando(false);

        if (doWidget) {
          travaRef.current = Date.now() + TRAVA_DO_PASSO;
          setPasseio({ chave: chaveDoWidget, passo: 0 });
          return;
        }

        const conhecida = alvo ? falaDoElemento(alvo) : falaDoPonto(x, y);
        const lugar = alvo ? lugarDoElemento(alvo) : lugarDoElemento(alvoDoPonto(x, y));
        /* A mesa é só um lugar como outro qualquer aqui: o passeio da área de
           trabalho é do tutorial, e não volta. */
        setEstado(
          conhecida && lugar !== 'mesa'
            ? { fala: conhecida, apontando: false }
            : { fala: SAUDACAO, apontando: true }
        );
      }),
    [parar]
  );

  /* O passeio: brilha o alvo e leva ela para perto dele. */
  useEffect(() => {
    if (!passeio) {
      setAncora(null);
      return undefined;
    }
    const def = passeioDoWidget(passeio.chave);
    if (!def) return undefined;

    const abrindo = passeio.passo === 0;
    brilharElemento(def.icone, abrindo);

    const medir = () => {
      const ponto = abrindo
        ? posicaoPertoDe(def.icone, { folga: 46 })
        : posicaoPertoDe(def.painel, { lado: 'esquerda', folga: 56 });
      if (ponto) setAncora(ponto);
    };
    medir();
    /* A janela pode ter mudado de tamanho no mesmo instante: mede de novo. */
    const t = setTimeout(medir, 260);

    return () => {
      clearTimeout(t);
      brilharElemento(def.icone, false);
    };
  }, [passeio]);

  /* Com o painel aberto, o convite já cumpriu o papel: começa a explicação. */
  useEffect(() => {
    if (!passeio || passeio.passo !== 0) return undefined;
    const def = passeioDoWidget(passeio.chave);
    if (!def) return undefined;

    const relogio = setInterval(() => {
      if (!document.querySelector(def.painel)) return;
      travaRef.current = Date.now() + TRAVA_DO_PASSO;
      setPasseio((atual) => (atual && atual.passo === 0 ? { ...atual, passo: 1 } : atual));
    }, 240);
    return () => clearInterval(relogio);
  }, [passeio]);

  /* Parada em silêncio: ela fica na tela e só reage aos cliques nela. */
  const irParaEspera = useCallback(() => {
    setPasseio(null);
    setEstado(null);
    setSaindo(false);
    setDescansando(true);
  }, []);

  /* Cada fala tem seu tempo: esperando ela pode ficar mais. Terminada a fala
     ela não some, entra em espera. */
  useEffect(() => {
    if (!estado || descansando || sobre !== null || saindo || passeio) return undefined;
    const t = setTimeout(() => {
      setEstado(null);
      setDescansando(true);
    }, estado.apontando ? TEMPO_ESPERANDO : TEMPO_COM_TUTORIAL);
    return () => clearTimeout(t);
  }, [estado, descansando, sobre, saindo, passeio]);

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

  /* Avança a fala do passeio; no fim ela volta a flutuar livre. */
  const avancarPasseio = useCallback(() => {
    if (!passeio) return;
    if (Date.now() < travaRef.current) return;
    const def = passeioDoWidget(passeio.chave);
    const proximo = passeio.passo + 1;
    if (!def || proximo > def.passos.length) {
      irParaEspera();
      return;
    }
    travaRef.current = Date.now() + 320;
    setPasseio({ chave: passeio.chave, passo: proximo });
  }, [passeio, irParaEspera]);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key !== 'Escape') return;
      /* O Esc fecha o menu, depois o passeio, depois o balão. Ela continua
         flutuando. */
      if (menu) {
        setMenu(null);
        return;
      }
      if (passeio) {
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

  const naTela = Boolean(passeio) || descansando || sobre !== null || Boolean(estado);
  if (!naTela) return null;

  const defDoPasseio = passeio ? passeioDoWidget(passeio.chave) : null;
  const falaDoPasseio = defDoPasseio
    ? passeio.passo === 0
      ? defDoPasseio.abertura
      : defDoPasseio.passos[passeio.passo - 1] || null
    : null;

  const fala = defDoPasseio
    ? falaDoPasseio
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

  /* Explica o lugar em que a pessoa clicou (ou começa o passeio do widget). */
  const explicarLugar = (x, y) => {
    const chave = widgetDoElemento(alvoDoPonto(x, y));
    if (passeioDoWidget(chave)) {
      travaRef.current = Date.now() + TRAVA_DO_PASSO;
      setPasseio({ chave, passo: 0 });
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
        ancora={ancora}
        comemorando={comemorando}
        capturarClique={
          passeio
            ? passeio.passo > 0
            : sobre !== null || (Boolean(estado?.apontando) && !saindo)
        }
        aoClique={(evento, naPixie) => {
          const x = evento?.clientX ?? 0;
          const y = evento?.clientY ?? 0;

          /* No passeio o clique é o "continua". */
          if (passeio) {
            avancarPasseio();
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
