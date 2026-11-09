import { useEffect, useMemo, useRef, useState } from 'react';
import GuiaPixie from '@/components/tutorial/GuiaPixie';
import MenuFlutuante from '@/components/desktop/MenuFlutuante';
import { useAuth } from '@/lib/AuthContext';
import { salvarPerfil } from '@/lib/perfilUsuario';
import { assinarChamadoPixie } from '@/lib/pixie';
import { SEM_TUTORIAL, falaDoElemento, falaDoPonto } from '@/lib/pixieTutoriais';

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
 * apontar um lugar da tela e comenta o que é) e "Pular tutorial" (ela se
 * despede e sai da tela).
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

const CHAMADO_PARA_PERGUNTAR = 'Sobre o que você quer saber? Clique no lugar.';
const DESPEDIDA = 'Ok, se precisar, é só me chamar com o botão direito!';
const ESPERA_DA_DESPEDIDA = 2600; // tempo para ler a despedida antes de sair

export default function TutorialRoteiro() {
  const { user } = useAuth();
  const [passo, setPasso] = useState('boasVindas');
  const [nome, setNome] = useState(() => user?.nome_exibicao || '');
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState(null);
  const [apontando, setApontando] = useState(false);
  const [menu, setMenu] = useState(null);
  const [saindo, setSaindo] = useState(false);
  const [encerrado, setEncerrado] = useState(false);
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
        setApontando(!conhecida);
        setResposta(conhecida || null);
      }),
    []
  );

  /* Depois da despedida ela sai da tela. */
  useEffect(() => {
    if (!saindo) return undefined;
    const t = setTimeout(() => setEncerrado(true), ESPERA_DA_DESPEDIDA);
    return () => clearTimeout(t);
  }, [saindo]);

  const fala = useMemo(() => {
    if (saindo) return DESPEDIDA;
    if (resposta) return resposta;
    if (apontando) return CHAMADO_PARA_PERGUNTAR;
    return FALAS[passo];
  }, [saindo, resposta, apontando, passo]);

  /* O clique na tela: aponta o lugar, fecha uma resposta antiga ou segue o
     roteiro. O menu aberto não deixa o clique vazar para cá. */
  const aoCliqueNaTela = (evento) => {
    if (saindo) return;

    if (apontando) {
      const apontado =
        falaDoPonto(evento?.clientX ?? 0, evento?.clientY ?? 0) || SEM_TUTORIAL;
      setApontando(false);
      setResposta(apontado);
      return;
    }
    if (resposta) {
      setResposta(null);
      return;
    }
    const proximo = PROXIMO[passo];
    if (proximo) setPasso(proximo);
  };

  const capturarClique =
    !encerrado && !saindo && !menu && (apontando || Boolean(resposta) || SAI_NO_CLIQUE.includes(passo));

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

  const itensDoMenu = [
    {
      id: 'perguntar',
      rotulo: 'Perguntar',
      acao: () => {
        setResposta(null);
        setApontando(true);
      },
    },
    { separador: true },
    { id: 'pular', rotulo: 'Pular tutorial', acao: () => setSaindo(true) },
  ];

  if (encerrado) return null;

  return (
    <>
      <GuiaPixie
        texto={fala}
        capturarClique={capturarClique}
        aoClique={aoCliqueNaTela}
        aoMenu={({ x, y }) => setMenu({ x, y })}
      >
        {passo === 'nome' && !saindo && !resposta && !apontando ? (
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
