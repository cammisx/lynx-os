import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '@/theme.css';
import DesktopBackground from '@/components/DesktopBackground';
import DesktopPet from '@/components/desktop/DesktopPet';
import DesktopWidgets from '@/components/desktop/DesktopWidgets';
import DestaquePreferencias from '@/components/tutorial/DestaquePreferencias';
import DesenhosFixados from '@/components/desktop/DesenhosFixados';
import Taskbar from '@/components/Taskbar';
import ChattersWindow from '@/components/ChattersWindow';
import ModelosWindow from '@/components/ModelosWindow';
import TurnosWindow from '@/components/TurnosWindow';
import FinanceiroWindow from '@/components/FinanceiroWindow';
import ConfiguracoesWindow from '@/components/ConfiguracoesWindow';
import PlaybookWindow from '@/components/PlaybookWindow';
import ConteudoWindow from '@/components/ConteudoWindow';
import EstrategiasWindow from '@/components/EstrategiasWindow';
import PaintWindow from '@/components/PaintWindow';
import JogosWindow from '@/components/JogosWindow';
import { JanelaContext } from '@/components/desktop/JanelaContext';
import ConfirmarFechar from '@/components/desktop/ConfirmarFechar';
import { janelaPorId } from '@/lib/janelas';
import { tutorialPixieDesktopVisto } from '@/lib/pixie';
import { SEPARADOR, useMenuContexto } from '@/components/desktop/MenuContexto';
import { abrirConfigNaAba, registrarAbridorConfig } from '@/lib/configAba';
import useJanelas from '@/hooks/useJanelas';
import { useAuth } from '@/lib/AuthContext';
import { salvarBarraTarefas, salvarPerfil, usePerfil } from '@/lib/perfilUsuario';
import { useDesempenho } from '@/lib/desempenho';
import { MODO_CLARO, MODO_ESCURO, TEMA_PADRAO, aplicarTema } from '@/lib/temas';
import { ChatProvider } from '@/components/chat/ChatProvider';
import ChatSidebar from '@/components/chat/ChatSidebar';
import useFecharTurnosEsquecidos from '@/hooks/useFecharTurnosEsquecidos';
import usePresencaApp from '@/hooks/usePresencaApp';
import useAvisarTurnosPendentes from '@/hooks/useAvisarTurnosPendentes';
import useVersaoPublicada from '@/hooks/useVersaoPublicada';
import { sincronizarAdminsUmaVez } from '@/lib/admins';
import useAplicarConvite from '@/hooks/useAplicarConvite';
import { useIsMobile, MOBILE_BREAKPOINT } from '@/hooks/use-mobile';
import MobileShell from '@/components/mobile/MobileShell';
import TutorialRoteiro from '@/components/tutorial/TutorialRoteiro';
import PixieAjuda from '@/components/tutorial/PixieAjuda';

/* Cada janela do menu iniciar é um componente; o id é o mesmo da taskbar. */
const COMPONENTES = {
  chatters: ChattersWindow,
  modelos: ModelosWindow,
  turnos: TurnosWindow,
  financeiro: FinanceiroWindow,
  config: ConfiguracoesWindow,
  playbook: PlaybookWindow,
  estrategias: EstrategiasWindow,
  conteudo: ConteudoWindow,
  paint: PaintWindow,
  jogos: JogosWindow,
};

/* `tutorial` liga a rota /tutorial: o mesmo desktop de sempre, com a pixie
   passeando por cima para guiar quem está entrando agora. */
export default function Dashboard({ tutorial = false }) {
  const { user, isLoadingAuth } = useAuth();
  /* Abaixo de 768px o sistema vira o modo celular: uma tela por vez. */
  const telaPequena = useIsMobile();
  const navegar = useNavigate();
  // Carrega o perfil (tema, nome, foto, fundo) antes de tudo aparecer na tela.
  const perfil = usePerfil(user);
  /* O que está desligado no modo leve deste aparelho. */
  const leve = useDesempenho();
  // Convite pendente vira cargo, modelos e turnos no primeiro acesso.
  useAplicarConvite(user);

  /* Quem ainda não passou pelo tutorial cai nele no primeiro acesso e, depois
     de terminar, não volta mais (a marca fica na conta, então vale em
     qualquer aparelho; o navegador guarda uma cópia de reserva).
     No celular não: lá não tem botão direito nem a Pixie na tela. */
  useEffect(() => {
    /* Enquanto a conta não chegou, o campo do User ainda não pode responder:
       decidir agora mandaria de volta quem já viu o tutorial. */
    if (isLoadingAuth || !user) return;
    /* O tamanho da tela é lido do navegador, e não do primeiro render do
       useIsMobile: ele começa respondendo "desktop" e por isso mandava o
       celular para o /tutorial antes de saber que era celular. */
    const celular = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
    /* No celular não tem tutorial: nem botão direito, nem Pixie na tela. */
    if (tutorial) {
      if (celular) navegar('/', { replace: true });
      return;
    }
    if (celular) return;
    if (!tutorialPixieDesktopVisto(user)) navegar('/tutorial', { replace: true });
  }, [tutorial, telaPequena, navegar, user, isLoadingAuth]);

  /* Ordem dos ícones da barra: entra pelo perfil e volta para ele quando muda. */
  const salvarBarra = useCallback(
    ({ ordem, fixadas }) => {
      salvarBarraTarefas(user, { ordem, fixadas });
    },
    [user]
  );

  const janelas = useJanelas({
    ordemInicial: perfil.barraOrdem,
    fixadasIniciais: perfil.barraFixadas,
    aoMudar: salvarBarra,
  });
  /* Janela esperando confirmação: só entra aqui quando tem alteração não salva. */
  const [fechando, setFechando] = useState(null);

  const pedirFechar = (id) => {
    if (janelas.sujas[id]) setFechando(id);
    else janelas.fechar(id);
  };

  // Admin recém-chegado entra em todas as modelos assim que o app abre.
  useEffect(() => {
    if (user?.role !== 'admin') return;
    sincronizarAdminsUmaVez();
  }, [user?.id, user?.role]);

  usePresencaApp();
  useFecharTurnosEsquecidos();
  useAvisarTurnosPendentes();
  useVersaoPublicada();

  useEffect(() => {
    const root = document.documentElement;
    // O tema do perfil manda; o padrão é só o ponto de partida.
    if (!root.getAttribute('data-theme')) aplicarTema(TEMA_PADRAO);
    document.body.classList.add('is-desktop-shell');
    return () => document.body.classList.remove('is-desktop-shell');
  }, []);

  /* Clique direito na área de trabalho: atalhos e ajustes rápidos. */
  const { registrar } = useMenuContexto();
  const itensDesktop = useRef([]);
  const janelasAbertas = janelas.itens.filter((item) => item.aberta);
  const abrirJanelaConfig = janelas.abrir;
  useEffect(() => registrarAbridorConfig(() => abrirJanelaConfig('config')), [abrirJanelaConfig]);
  const irParaConfig = (aba) => abrirConfigNaAba(aba);

  /* Atalhos de janela no clique direito: o chatter só leva Playbook e
     Conteúdo, as mesmas que ele enxerga no celular. Chatters, Turnos e
     Financeiro são de admin. */
  const admin = user?.role === 'admin';
  const atalhosJanelas = admin
    ? [
        { id: 'abrir-chatters', rotulo: 'Abrir Chatters', acao: () => janelas.abrir('chatters') },
        { id: 'abrir-turnos', rotulo: 'Abrir Turnos', acao: () => janelas.abrir('turnos') },
        {
          id: 'abrir-financeiro',
          rotulo: 'Abrir Financeiro',
          acao: () => janelas.abrir('financeiro'),
        },
        { id: 'abrir-playbook', rotulo: 'Abrir Playbook', acao: () => janelas.abrir('playbook') },
        { id: 'abrir-conteudo', rotulo: 'Abrir Conteúdo', acao: () => janelas.abrir('conteudo') },
        { id: 'abrir-jogos', rotulo: 'Abrir Jogos', acao: () => janelas.abrir('jogos') },
      ]
    : [
        { id: 'abrir-playbook', rotulo: 'Abrir Playbook', acao: () => janelas.abrir('playbook') },
        { id: 'abrir-conteudo', rotulo: 'Abrir Conteúdo', acao: () => janelas.abrir('conteudo') },
        { id: 'abrir-jogos', rotulo: 'Abrir Jogos', acao: () => janelas.abrir('jogos') },
      ];

  itensDesktop.current = [
    { id: 'preferencias', rotulo: 'Preferências', acao: () => irParaConfig('preferencias') },
    {
      id: 'modo',
      rotulo: perfil.modo === MODO_CLARO ? 'Mudar para o modo escuro' : 'Mudar para o modo claro',
      acao: () => salvarPerfil(user, { modo: perfil.modo === MODO_CLARO ? MODO_ESCURO : MODO_CLARO }),
    },
    SEPARADOR,
    ...atalhosJanelas,
    SEPARADOR,
    {
      id: 'fechar-todas',
      rotulo: `Fechar todas as janelas${janelasAbertas.length ? ` (${janelasAbertas.length})` : ''}`,
      perigo: true,
      desabilitado: !janelasAbertas.length,
      acao: () => janelasAbertas.forEach((item) => janelas.fechar(item.id)),
    },
  ];

  useEffect(
    () =>
      registrar((alvo) => {
        /* Barra de tarefas e chat têm vida própria. */
        if (alvo.closest('.taskbar, .chat-painel')) return null;
        /* As janelas moram num portal fora do desktop, mas os atalhos da mesa
           (Preferências, abrir janelas, fechar todas) valem dentro delas. */
        if (alvo.closest('[data-desktop]') || alvo.closest('[data-janela]')) {
          return itensDesktop.current;
        }
        return null;
      }),
    [registrar]
  );

  return (
    <div
      data-desktop="true"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--c8)',
      }}
    >
      <DesktopBackground
        imagem={leve.includes('fundo') ? '' : perfil.fundoUrl}
        estatico={perfil.fundoEstatico || leve.includes('animacao')}
        semLinhas={perfil.fundoModo === 'sem' || leve.includes('animacao')}
      />
      {telaPequena || leve.includes('pet') ? null : (
        <DesktopPet
          pet={perfil.pet}
          cor={perfil.petCor}
          nome={perfil.petNome}
          admin={user?.role === 'admin'}
          onTrocarPet={(id) => salvarPerfil(user, { pet: id })}
          onTrocarCor={(id) => salvarPerfil(user, { petCor: id })}
          onNomear={(valor) => salvarPerfil(user, { petNome: valor })}
        />
      )}
      <ChatProvider proximaCamada={janelas.proximaCamada}>
        {telaPequena ? (
          <MobileShell user={user} perfil={perfil} janelas={janelas} />
        ) : (
          <>
            <DesenhosFixados />
            <DesktopWidgets />
            {/* A moldura que a Pixie usa no passeio das Preferências. */}
            <DestaquePreferencias />
            <Taskbar
              onOpenApp={janelas.abrir}
              proximaCamada={janelas.proximaCamada}
              itens={janelas.itens}
              janelaAtiva={janelas.ativa}
              onAlternarJanela={janelas.alternar}
              onFixarJanela={janelas.fixar}
              onAbrirJanela={janelas.abrir}
              onFecharJanela={pedirFechar}
              onMoverJanela={janelas.mover}
            />
            <ChatSidebar />
          </>
        )}
      </ChatProvider>

      {/* A ordem da barra é fixa; quem manda na frente é a camada (z) de cada uma. */}
      {janelas.itens
        .filter((item) => item.aberta)
        .map((item) => {
          const Componente = COMPONENTES[item.id];
          if (!Componente) return null;
          return (
            <JanelaContext.Provider
              key={item.id}
              value={{
                id: item.id,
                zIndex: 8000 + item.z,
                oculta: item.minimizada,
                onMinimize: () => janelas.minimizar(item.id),
                onFocus: () => janelas.focar(item.id),
                marcarSujo: janelas.marcarSujo,
              }}
            >
              <Componente onClose={() => pedirFechar(item.id)} />
            </JanelaContext.Provider>
          );
        })}

      {tutorial && !telaPequena ? <TutorialRoteiro /> : null}
      {/* Fora do tutorial ela só aparece quando é chamada pelo botão direito. */}
      {!tutorial && !telaPequena ? <PixieAjuda /> : null}

      {fechando ? (
        <ConfirmarFechar
          titulo={janelaPorId(fechando)?.titulo}
          onCancelar={() => setFechando(null)}
          onConfirmar={() => {
            janelas.fechar(fechando);
            setFechando(null);
          }}
        />
      ) : null}
    </div>
  );
}