/* Service worker do LynxOS.
 *
 * Serve para uma coisa só: mostrar a notificação do sistema no celular. No
 * computador o navegador deixa criar a notificação direto da página, mas no
 * Android (e no iPhone com o site na Tela de Início) quem mostra é o service
 * worker, então o aviso precisa passar por aqui.
 *
 * O clique na notificação reusa a aba que já está aberta e avisa o sistema
 * para abrir a conversa certa. Também deixa o gancho de push pronto para o
 * dia em que as mensagens passarem a chegar com o app fechado.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('push', (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch (erro) {
    dados = { corpo: evento.data ? evento.data.text() : '' };
  }
  const titulo = dados.titulo || 'LynxOS';
  const corpo = dados.corpo || 'Você tem uma novidade.';
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      tag: dados.tag || 'lynx-chat',
      data: { tag: dados.tag || 'lynx-chat', url: dados.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const dados = evento.notification.data || {};
  const chave = dados.tag || 'lynx-chat';

  evento.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const cliente of clientes) {
        try {
          cliente.postMessage({ tipo: 'lynx-notificacao-clique', tag: chave });
          if ('focus' in cliente) await cliente.focus();
          return;
        } catch (erro) {
          // segue para o próximo
        }
      }
      try {
        await self.clients.openWindow(dados.url || '/');
      } catch (erro) {
        // sem janela disponível
      }
    })()
  );
});
