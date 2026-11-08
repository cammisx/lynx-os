import { useCallback, useEffect, useRef, useState } from 'react';
import '@/theme.css';
import DesktopBackground from '@/components/DesktopBackground';
import DesktopWidgets from '@/components/desktop/DesktopWidgets';
import Taskbar from '@/components/Taskbar';
import ChattersWindow from '@/components/ChattersWindow';
import ModelosWindow from '@/components/ModelosWindow';
import TurnosWindow from '@/components/TurnosWindow';
import FinanceiroWindow from '@/components/FinanceiroWindow';
import ConfiguracoesWindow from '@/components/ConfiguracoesWindow';
import PlaybookWindow from '@/components/PlaybookWindow';
import { JanelaContext } from '@/components/desktop/JanelaContext';
import ConfirmarFechar from '@/components/desktop/ConfirmarFechar';
import { janelaPorId } from '@/lib/janelas';
import { SEPARADOR, useMenuContexto } from '@/components/desktop/MenuContexto';
import { AVISO_ABA_CONFIG, pedirAbaConfig } from '@/lib/configAba';
import useJanelas from '@/hooks/useJanelas';
import { useAuth } from '@/lib/AuthContext';
import { salvarBarraTarefas, salvarPerfil, usePerfil } from '@/lib/perfilUsuario';
import { MODO_CLARO, MODO_ESCURO, TEMA_PADRAO, aplicarTema } from '@/lib/temas';
import { ChatProvider } from '@/components/chat/ChatProvider';
import ChatSidebar from '@/components/chat/ChatSidebar';
import useFecharTurnosEsquecidos from '@/hooks/useFecharTurnosEsquecidos';
import useAvisarTurnosPendentes from '@/hooks/useAvisarTurnosPendentes';
import useVersaoPublicada from '@/hooks/useVersaoPublicada';
import { sincronizarAdminsUmaVez } from '@/lib/admins';

/* Cada janela do menu iniciar é um componente; o id é o mesmo da taskbar. */
const COMPONENTES = {
  chatters: ChattersWindow,
  modelos: ModelosWindow,
  turnos: TurnosWindow,
  financeiro: FinanceiroWindow,
  config: ConfiguracoesWindow,
  playbook: PlaybookWindow,
};

export default function Dashboard() {
  const { user } = useAuth();
  // Carrega o perfil (tema, nome, foto, fundo) antes de tudo aparecer na tela.
  const perfil = usePerfil(user);

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
  const irParaConfig = (aba) => {
    pedirAbaConfig(aba);
    janelas.abrir('config');
    window.dispatchEvent(new CustomEvent(AVISO_ABA_CONFIG, { detail: aba }));
  };

  itensDesktop.current = [
    { id: 'preferencias', rotulo: 'Preferências', acao: () => irParaConfig('preferencias') },
    {
      id: 'modo',
      rotulo: perfil.modo === MODO_CLARO ? 'Mudar para o modo escuro' : 'Mudar para o modo claro',
      acao: () => salvarPerfil(user, { modo: perfil.modo === MODO_CLARO ? MODO_ESCURO : MODO_CLARO }),
    },
    SEPARADOR,
    { id: 'abrir-chatters', rotulo: 'Abrir Chatters', acao: () => janelas.abrir('chatters') },
    { id: 'abrir-turnos', rotulo: 'Abrir Turnos', acao: () => janelas.abrir('turnos') },
    { id: 'abrir-financeiro', rotulo: 'Abrir Financeiro', acao: () => janelas.abrir('financeiro') },
    SEPARADOR,
    { id: 'abrir-playbook', rotulo: 'Abrir Playbook', acao: () => janelas.abrir('playbook') },
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
        if (!alvo.closest?.('[data-desktop]')) return null;
        /* Barra de tarefas e chat têm vida própria. */
        if (alvo.closest('.taskbar, .chat-painel')) return null;
        return itensDesktop.current;
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
        imagem={perfil.fundoUrl}
        estatico={perfil.fundoEstatico}
        semLinhas={perfil.fundoModo === 'sem'}
      />
      <ChatProvider>
        <DesktopWidgets />
        <Taskbar
          onOpenApp={janelas.abrir}
          itens={janelas.itens}
          janelaAtiva={janelas.ativa}
          onAlternarJanela={janelas.alternar}
          onFixarJanela={janelas.fixar}
          onAbrirJanela={janelas.abrir}
          onFecharJanela={pedirFechar}
          onMoverJanela={janelas.mover}
        />
        <ChatSidebar />
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