import { useEffect } from 'react';
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
import useJanelas from '@/hooks/useJanelas';
import { useAuth } from '@/lib/AuthContext';
import { usePerfil } from '@/lib/perfilUsuario';
import { TEMA_PADRAO, aplicarTema } from '@/lib/temas';
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
  const janelas = useJanelas();
  const { user } = useAuth();
  // Carrega o perfil (tema, nome, foto, fundo) antes de tudo aparecer na tela.
  const perfil = usePerfil(user);

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

  return (
    <div
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
          janelas={janelas.janelas}
          janelaAtiva={janelas.ativa}
          onAlternarJanela={janelas.alternar}
        />
        <ChatSidebar />
      </ChatProvider>

      {/* A ordem da lista é o empilhamento: a última aberta fica na frente. */}
      {janelas.janelas.map((janela, indice) => {
        const Componente = COMPONENTES[janela.id];
        if (!Componente) return null;
        return (
          <JanelaContext.Provider
            key={janela.id}
            value={{
              zIndex: 8000 + indice,
              oculta: janela.minimizada,
              onMinimize: () => janelas.minimizar(janela.id),
              onFocus: () => janelas.abrir(janela.id),
            }}
          >
            <Componente onClose={() => janelas.fechar(janela.id)} />
          </JanelaContext.Provider>
        );
      })}
    </div>
  );
}