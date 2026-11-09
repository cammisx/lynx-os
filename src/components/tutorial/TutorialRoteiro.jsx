import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GuiaPixie from '@/components/tutorial/GuiaPixie';
import MenuFlutuante from '@/components/desktop/MenuFlutuante';
import { useAuth } from '@/lib/AuthContext';
import { salvarPerfil } from '@/lib/perfilUsuario';
import {
  assinarChamadoPixie,
  marcarPixieEmEspera,
  salvarTutorialPixieVisto,
} from '@/lib/pixie';
import {
  AGRADECER_E_DESPEDIR,
  CHAMADO_PARA_PERGUNTAR,
  SOBRE_PIXIE,
  SEM_TUTORIAL,
  alvoDoPonto,
  falaDoElemento,
  falaDoPonto,
  lugarDoElemento,
} from '@/lib/pixieTutoriais';
import useTourMesa from '@/lib/useTourMesa';
import useTourAvisos from '@/lib/useTourAvisos';
import { definirAvisoDoPasseio } from '@/lib/pixieAvisos';
import { garantirAvisoDoPasseio } from '@/lib/notificacoes';
import { base44 } from '@/api/base44Client';
import { posicaoAoRedorDaArea } from '@/lib/destaquePreferencias';

/**
 * O roteiro do tutorial da rota /tutorial.
 *
 * Quem cuida da animação é o GuiaPixie; aqui mora só a conversa. Cada passo é
 * um pedaço do texto dela mais uma regra de como sair dele:
 *
 * 1. boasVindas - ela só aparece. Um clique em qualquer lugar da tela segue.
 * 2. nome - ela pergunta como deve chamar a pessoa e abre o campo dentro do
 *    balão. Só sai quando a pessoa escreve e envia; aí o nome vai para o
 *    perfil (User.nome_exibicao), que é o nome usado no resto do sistema.
 * 3. apresentacao - ela se apresenta. Um clique em qualquer lugar segue.
 * 4. atalho - ela ensina o clique direito. Por enquanto é o fim do roteiro.
 *
 * Nos passos que saem com um clique, a tela inteira vira o botão (o clique não
 * cai no desktop). No passo do nome não: a pessoa precisa do campo livre.
 *
 * O clique direito nela abre o menu dela: "Perguntar" (ela espera a pessoa
 * apontar um lugar da tela e comenta o que é), "Agradecer" e "Se despedir"
 * (as duas fecham ela e a pessoa fica na mesa).
 *
 * No último passo, clicar na área de trabalho começa o passeio da mesa
 * (TOUR_MESA): ela explica o desktop, abre o menu do botão direito com
 * Preferências em destaque, abre a janela de Configurações e conta o que dá
 * para personalizar. Cada passo sai com um clique ou sozinho depois de um
 * tempo, para ninguém ficar preso.
 *
 * Terminado o passeio, a última fala some no clique ou sozinha em 4s e ela
 * fica só flutuando, sem balão e sem pegar o clique (a mesa volta a ser da
 * pessoa). A conversa só volta pelo menu dela: "Perguntar" pede um lugar novo
 * para explicar, "Agradecer" e "Se despedir" a levam embora.
 */

const FALAS = {
  boasVindas: 'Boas vindas à Lynx',
  nome: 'Como devo te chamar?',
  apresentacao: 'Me chamo Pixie e estou aqui pra te ajudar a utilizar esse novo sistema!',
  atalho:
    'Sempre que você precisar, pode me chamar clicando com o botão direito do mouse em qualquer lugar!',
};

/* Quais passos terminam com um clique em qualquer lugar da tela. */
const SAI_NO_CLIQUE = ['boasVindas', 'apresentacao'];

const PROXIMO = {
  boasVindas: 'nome',
  apresentacao: 'atalho',
};

const ESPERA_DA_DESPEDIDA = 2600; // tempo para ler a despedida antes de sair

/* Depois dela, o sistema é da pessoa: a rota inicial, com a mesa à vontade. */
const ROTA_DEPOIS = '/';

export default function TutorialRoteiro() {
  const { user } = useAuth();
  const navegar = useNavigate();
  const [passo, setPasso] = useState('boasVindas');
  const [nome, setNome] = useState(() => user?.nome_exibicao || '');
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState(null);
  const [apontando, setApontando] = useState(false);
  const [menu, setMenu] = useState(null);
  const [saida, setSaida] = useState(null);
  /* O passeio da mesa é o mesmo fio da ajuda do sistema. */
  /* Terminada a explicação, o balão sai (no clique ou sozinho) e ela fica só
     flutuando na tela, até alguém chamar pelo menu dela. */
  const [descansando, setDescansando] = useState(false);
  /* O passeio das notificações vem depois do das Preferências, na mesma
     janela de Configurações. Quem termina o primeiro começa o segundo. */
  /* O aviso que o passeio vai abrir: o de resposta que já existe (quem foi
     convidado com turno marcado chega com o dele), ou um de boas-vindas criado
     na hora, para conta sem nenhum. */
  const prepararAviso = useCallback(async () => {
    const aviso = await garantirAvisoDoPasseio(base44, user);
    definirAvisoDoPasseio(aviso);
  }, [user]);

  const avisos = useTourAvisos({
    /* Terminada a explicação inteira, a pessoa cai no Início e ela fica
       flutuando em silêncio até alguém chamar. */
    aoTerminar: () => {
      salvarTutorialPixieVisto();
      marcarPixieEmEspera();
      navegar(ROTA_DEPOIS, { replace: true });
    },
    aoPrepararAviso: prepararAviso,
  });
  const tour = useTourMesa({
    aoTerminar: () => avisos.iniciar(),
  });

  const [encerrado, setEncerrado] = useState(false);
  /* Quando a pessoa clica nela em vez de apontar um lugar: ela se explica. */
  const [sobre, setSobre] = useState(null);
  /* Agradecimento: ela gira e solta corações antes de sair. */
  const [comemorando, setComemorando] = useState(false);
  const campoRef = useRef(null);

  /* O campo do nome ganha o foco sozinho quando aparece. */
  useEffect(() => {
    if (passo !== 'nome') return undefined;
    const t = setTimeout(() => campoRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [passo]);

  /* Chamada pelo botão direito de algum menu: se o lugar já tem tutorial, ela
     fala dele; se não, se apresenta e espera a pessoa apontar. */
  useEffect(
    () =>
      assinarChamadoPixie(({ x, y, alvo }) => {
        const conhecida = alvo ? falaDoElemento(alvo) : falaDoPonto(x, y);
        const lugar = alvo ? lugarDoElemento(alvo) : lugarDoElemento(alvoDoPonto(x, y));
        setDescansando(false);
        /* A mesa não tem fala curta: chamada ali, ela conta a área de
           trabalho inteira (o mesmo passeio do primeiro acesso). */
        if (lugar === 'mesa') {
          setResposta(null);
          setApontando(false);
          tour.iniciar();
          return;
        }
        setApontando(!conhecida);
        setResposta(conhecida || null);
      }),
    []
  );

  /* Terminada a fala de saída, ela sai da tela e a pessoa cai na mesa. */
  useEffect(() => {
    if (!saida) return undefined;
    const t = setTimeout(() => {
      setEncerrado(true);
      navegar(ROTA_DEPOIS, { replace: true });
    }, ESPERA_DA_DESPEDIDA);
    return () => clearTimeout(t);
  }, [saida, navegar]);

  const fala = useMemo(() => {
    if (saida) return saida;
    if (descansando) return null;
    if (avisos.emTour) return avisos.fala || FALAS[passo];
    if (tour.emTour) return tour.fala || FALAS[passo];
    if (sobre !== null) return SOBRE_PIXIE[sobre];
    if (resposta) return resposta;
    if (apontando) return CHAMADO_PARA_PERGUNTAR;
    return FALAS[passo];
  }, [saida, descansando, avisos, tour, sobre, resposta, apontando, passo]);

  /* O clique na tela: aponta o lugar, fecha uma resposta antiga ou segue o
     roteiro. O menu aberto não deixa o clique vazar para cá. */
  const aoCliqueNaTela = (evento, naPixie = false) => {
    if (saida) return;
    /* Flutuando em silêncio: só o clique nela reage, abrindo o menu dela. */
    if (descansando) {
      setMenu({ x: evento?.clientX ?? 0, y: evento?.clientY ?? 0 });
      return;
    }

    const x = evento?.clientX ?? 0;
    const y = evento?.clientY ?? 0;

    /* Ela falando dela mesma: o clique nela passa a fala, o clique na tela
       explica o lugar que a pessoa apontou. */
    if (sobre !== null) {
      if (naPixie) {
        if (sobre + 1 < SOBRE_PIXIE.length) {
          setSobre(sobre + 1);
          return;
        }
        setSobre(null);
        setApontando(true);
        return;
      }
      setSobre(null);
      if (lugarDoElemento(alvoDoPonto(x, y)) === 'mesa') {
        setResposta(null);
        tour.iniciar();
        return;
      }
      setResposta(falaDoPonto(x, y) || SEM_TUTORIAL);
      return;
    }

    /* No passeio das notificações o clique é o "continua" só quando ela está
       explicando: nos passos de espera quem age é a pessoa. */
    if (avisos.emTour) {
      if (!avisos.esperando) avisos.avancar();
      return;
    }
    /* No passeio da mesa o clique é o "continua". */
    if (tour.emTour) {
      tour.avancar();
      return;
    }
    if (apontando) {
      setApontando(false);
      /* Apontou a mesa: a explicação dela é o passeio inteiro. */
      if (lugarDoElemento(alvoDoPonto(x, y)) === 'mesa') {
        setResposta(null);
        tour.iniciar();
        return;
      }
      setResposta(falaDoPonto(x, y) || SEM_TUTORIAL);
      return;
    }
    if (resposta) {
      setResposta(null);
      return;
    }
    /* No último passo do roteiro ela já está explicando: um clique normal
       vira "me conta o que é isso aqui" em vez de não fazer nada. Na área de
       trabalho, o clique começa o passeio (ela abre menu e janela junto). */
    if (passo === 'atalho') {
      /* Clicou nela: ela fala dela mesma (o menu continua no botão direito). */
      if (naPixie) {
        setResposta(null);
        setSobre(0);
        return;
      }
      if (lugarDoElemento(alvoDoPonto(x, y)) === 'mesa') {
        setResposta(null);
        setApontando(false);
        tour.iniciar();
        return;
      }
      setResposta(falaDoPonto(x, y) || SEM_TUTORIAL);
      return;
    }
    const proximo = PROXIMO[passo];
    if (proximo) setPasso(proximo);
  };

  /* Durante um passeio, quem manda na captura é o passeio: no das
     notificações existem passos em que quem age é a pessoa (abrir o sino,
     abrir o aviso) e aí a tela tem de ficar livre. Era o `passo === 'atalho'`
     do roteiro que deixava a camada ligada e engolia esses cliques. */
  const capturarClique =
    !encerrado &&
    !saida &&
    !descansando &&
    !menu &&
    (avisos.emTour
      ? !avisos.esperando
      : tour.emTour ||
        apontando ||
        sobre !== null ||
        Boolean(resposta) ||
        passo === 'atalho' ||
        SAI_NO_CLIQUE.includes(passo));

  const enviarNome = async (evento) => {
    evento.preventDefault();
    const limpo = nome.trim();
    if (!limpo || enviando) return;

    setEnviando(true);
    try {
      await salvarPerfil(user, { nomeExibicao: limpo });
    } catch (erro) {
      /* Sem rede o roteiro não trava: o nome fica na tela e a conversa segue. */
      console.warn('[Tutorial] não deu para salvar o nome:', erro?.message || erro);
    }
    setEnviando(false);
    setPasso('apresentacao');
  };

  /* Ela sai da tela: fala a frase, some e a pessoa fica na mesa. */
  const sair = (fala) => {
    setMenu(null);
    setDescansando(false);
    setApontando(false);
    setResposta(null);
    setSobre(null);
    tour.parar();
    avisos.parar();
    salvarTutorialPixieVisto();
    setSaida(fala);
  };

  const itensDoMenu = [
    {
      id: 'perguntar',
      rotulo: 'Perguntar',
      acao: () => {
        setDescansando(false);
        setResposta(null);
        setApontando(true);
      },
    },
    { separador: true },
    {
      id: 'despedir',
      rotulo: 'Agradecer e se despedir',
      acao: () => {
        /* Agradecida, ela gira e solta corações antes de sair. */
        setComemorando(true);
        sair(AGRADECER_E_DESPEDIR);
      },
    },
  ];

  if (encerrado) return null;

  return (
    <>
      <GuiaPixie
        texto={fala}
        esconderBalao={!fala}
        capturarClique={capturarClique}
        comemorando={comemorando}
        /* No passeio das Preferências ela vai para o lado do bloco em destaque. */
        ancora={
          avisos.caixa
            ? posicaoAoRedorDaArea(avisos.caixa)
            : tour.destaque
              ? posicaoAoRedorDaArea(tour.destaque.caixa)
              : null
        }
        aoClique={aoCliqueNaTela}
        aoMenu={({ x, y }) => setMenu({ x, y })}
      >
        {passo === 'nome' && !saida && !resposta && !apontando ? (
          <form
            onSubmit={enviarNome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              pointerEvents: 'auto',
            }}
          >
            <input
              ref={campoRef}
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Seu nome"
              maxLength={24}
              aria-label="Como devo te chamar?"
              style={{
                flex: 1,
                minWidth: 0,
                width: 148,
                padding: '6px 10px',
                borderRadius: 9,
                fontSize: 12,
                letterSpacing: '0.01em',
                color: 'var(--c3)',
                fontFamily: 'var(--font-main)',
                textAlign: 'center',
                background: 'color-mix(in srgb, var(--c8) 70%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c1) 34%, transparent)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!nome.trim() || enviando}
              aria-label="Enviar nome"
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 9,
                cursor: nome.trim() && !enviando ? 'pointer' : 'default',
                opacity: nome.trim() && !enviando ? 1 : 0.4,
                color: 'var(--c1)',
                background: 'color-mix(in srgb, var(--c1) 18%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
                transition: 'opacity 0.15s, background 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 12h14M12 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        ) : null}
      </GuiaPixie>

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
