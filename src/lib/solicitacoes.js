import { emitNotificationsChanged } from '@/lib/desktopEvents';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

/**
 * A entidade User só pode ser listada por admin, então isso é o melhor
 * esforço: quando o próprio admin dispara a solicitação, dá pra criar
 * uma notificação por admin.
 */
export const listarAdmins = async (base44) => {
  const usuarios = asList(await base44.entities.User.list());
  return usuarios.filter((usuario) => usuario?.id && usuario.role === 'admin');
};

const criarNoCliente = async (base44, admins, payload) => {
  const criadas = await Promise.all(
    admins.map((admin) =>
      base44.entities.Notificacao.create({ ...payload, usuario_id: admin.id })
    )
  );
  emitNotificationsChanged();
  return criadas;
};

/**
 * Avisa os admins sobre uma solicitação pendente do chatter
 * (mimo/venda, folga, ajuste de ponto). Sem dedupe: cada pedido é único.
 *
 * Ordem:
 * 0. se a função notificarAdmins responder, ela cria uma notificação por admin
 *    (roda com service role, então vale para chatter também);
 * 1. se quem pediu é admin, cria uma notificação por admin;
 * 2. senão cria uma notificação "sem dono", que o sino dos admins mostra.
 */
export default async function notificarAdminsSolicitacao(
  base44,
  { titulo, mensagem, tipo, extra = {}, solicitante = null }
) {
  const payload = {
    titulo,
    mensagem,
    tipo,
    status: 'pendente',
    lida: false,
    criado_por_automacao: false,
    solicitante_id: solicitante?.id || '',
    solicitante_nome: solicitante?.full_name || solicitante?.email || '',
    ...extra,
  };

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
  } catch (error) {
    // Função indisponível: segue pelo cliente.
  }

  let admins = [];
  try {
    admins = await listarAdmins(base44);
  } catch (error) {
    admins = [];
  }

  if (admins.length) {
    return criarNoCliente(base44, admins, payload);
  }

  // Chatter sem permissão de listar usuários: deixa a notificação sem dono.
  const criada = await base44.entities.Notificacao.create({ ...payload, usuario_id: '' });
  emitNotificationsChanged();
  return [criada];
}

/** Notificação sem dono é a solicitação que qualquer admin pode revisar. */
export const isSolicitacaoSemDono = (notificacao) =>
  !!notificacao && !notificacao.usuario_id && notificacao.status !== 'resolvida';
