import { emitNotificationsChanged } from '@/lib/desktopEvents';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

/**
 * A entidade User não aceita filter() no SDK ("not available for the User entity;
 * use the app users endpoints"), então listamos e filtramos no cliente.
 */
export const listarAdmins = async (base44) => {
  const usuarios = asList(await base44.entities.User.list());
  return usuarios.filter((usuario) => usuario?.id && usuario.role === 'admin');
};

/**
 * Avisa todos os admins sobre uma solicitação pendente do chatter
 * (mimo/venda, folga, ajuste de ponto). Sem dedupe: cada pedido é único.
 *
 * A criação passa pela função notificarAdmins porque o chatter não tem
 * permissão de listar a entidade User; se a função não estiver disponível,
 * cai no caminho antigo (que só funciona para admin).
 */
export default async function notificarAdminsSolicitacao(base44, { titulo, mensagem, tipo, extra = {} }) {
  try {
    const resposta = await base44.functions.invoke('notificarAdmins', {
      titulo,
      mensagem,
      tipo,
      extra,
    });
    const corpo = resposta?.data || resposta;
    if (corpo?.ok) {
      emitNotificationsChanged();
      return corpo.criadas || [];
    }
    if (corpo?.error) throw new Error(corpo.error);
  } catch (error) {
    console.warn('[notificarAdmins] função indisponível, tentando no cliente', error);
  }

  let admins = [];
  try {
    admins = await listarAdmins(base44);
  } catch (error) {
    console.warn('[notificarAdmins] sem permissão para listar admins', error);
    throw new Error('Não consegui avisar os administradores agora. Tente de novo em instantes.');
  }
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
