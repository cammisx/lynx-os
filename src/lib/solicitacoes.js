import { emitNotificationsChanged } from '@/lib/desktopEvents';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

/**
 * Avisa todos os admins sobre uma solicitação pendente do chatter
 * (mimo/venda, folga, ajuste de ponto). Sem dedupe: cada pedido é único.
 */
export default async function notificarAdminsSolicitacao(base44, { titulo, mensagem, tipo, extra = {} }) {
  const admins = asList(await base44.entities.User.filter({ role: 'admin' }, { limit: 50 })).filter(
    (admin) => admin?.id
  );
  if (!admins.length) return [];

  const criadas = await Promise.all(
    admins.map((admin) =>
      base44.entities.Notificacao.create({
        usuario_id: admin.id,
        titulo,
        mensagem,
        tipo,
        status: 'pendente',
        lida: false,
        criado_por_automacao: false,
        ...extra,
      })
    )
  );
  emitNotificationsChanged();
  return criadas;
}
