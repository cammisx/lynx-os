import { useState } from 'react';
import { useChatPanel } from '@/components/chat/ChatProvider';
import MobileStatusBar from '@/components/mobile/MobileStatusBar';
import MobileDock from '@/components/mobile/MobileDock';
import MobileInicio from '@/components/mobile/MobileInicio';
import MobileChat from '@/components/mobile/MobileChat';
import ClockPanel from '@/components/ClockPanel';
import { nomeDe } from '@/lib/perfilLogica';

/**
 * Casca do sistema no celular.
 *
 * O desktop é janelas soltas sobre uma mesa; aqui é o jeito de celular: uma
 * tela por vez entre a barra de status e o dock. Só uma superfície fica
 * aberta, então abrir outra minimiza a anterior, sem empilhar telas.
 */
export default function MobileShell({ user, perfil, janelas }) {
  const chat = useChatPanel();
  const [relogio, setRelogio] = useState(false);
  const abertas = janelas.itens.filter((item) => item.aberta && !item.minimizada);
  const ativa = abertas.find((item) => item.id === janelas.ativa)?.id;
  const janelaAtiva = ativa || (abertas.length ? abertas[abertas.length - 1].id : null);
  const tela = chat.aberto ? 'chat' : janelaAtiva || 'inicio';

  const minimizarTodas = (exceto = null) => {
    abertas.forEach((item) => {
      if (item.id !== exceto) janelas.minimizar(item.id);
    });
  };

  const irParaInicio = () => {
    chat.fechar();
    minimizarTodas();
  };

  const abrirJanela = (id) => {
    chat.fechar();
    minimizarTodas(id);
    janelas.abrir(id);
  };

  const abrirChat = () => {
    minimizarTodas();
    chat.abrir();
  };

  const ir = (aba) => {
    if (aba === 'inicio') {
      irParaInicio();
      return;
    }
    if (aba === 'chat') {
      if (chat.aberto) irParaInicio();
      else abrirChat();
      return;
    }
    if (janelaAtiva === aba) irParaInicio();
    else abrirJanela(aba);
  };

  const abertos = [...abertas.map((item) => item.id), ...(chat.aberto ? ['chat'] : [])];

  return (
    <>
      <MobileStatusBar
        user={user}
        perfil={perfil}
        onPerfil={() => abrirJanela('config')}
        onAbrirChat={abrirChat}
        onRelogio={() => setRelogio(true)}
      />

      <main
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: 'calc(46px + env(safe-area-inset-top))',
          bottom: 'calc(58px + env(safe-area-inset-bottom))',
          overflow: 'hidden',
        }}
      >
        {tela === 'inicio' ? (
          <MobileInicio nome={nomeDe(perfil, user)} perfil={perfil} onAbrir={abrirJanela} />
        ) : null}
      </main>

      {chat.aberto ? <MobileChat onVoltar={irParaInicio} /> : null}

      <ClockPanel open={relogio} onClose={() => setRelogio(false)} notificacoes={[]} />

      <MobileDock
        atual={tela === 'inicio' ? 'inicio' : tela}
        abertos={abertos}
        naoLidas={chat.totalNaoLidas || 0}
        onIr={ir}
      />
    </>
  );
}
