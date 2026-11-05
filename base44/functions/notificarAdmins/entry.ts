import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Cria a notificação de uma solicitação (venda, folga, ajuste de ponto, turno)
// para todos os admins. Roda com service role porque o chatter não tem
// permissão de listar a entidade User.
//
// Payload: { tipo, mensagem, extra: { venda_id, folga_id, ... } }
//
// O título e o tipo são decididos aqui: o cliente não escreve o texto oficial
// nem escolhe um tipo de sistema. A solicitação referenciada precisa existir e
// ser do próprio chamador (admin pode avisar em nome de outros).

const TIPOS: Record<string, string> = {
  venda_pendente: 'Venda aguardando',
  folga_pendente: 'Pedido de folga',
  folga_automatica: 'Folga aprovada automaticamente',
  ajuste_ponto_pendente: 'Ajuste de ponto',
  ajuste_ponto_aplicado: 'Ponto corrigido',
  turno_pendente: 'Turno sem confirmação',
  turno_recusado: 'Turno recusado',
};

const CAMPOS_EXTRA = [
  'shift_id',
  'venda_id',
  'venda_ids',
  'folga_id',
  'ajuste_ponto_id',
  'solicitacao_id',
  'ocorrencia_data',
  'modelo_id',
  'modelo_nome',
  'turno_inicio',
  'turno_fim',
];

const limparExtra = (extra) => {
  const saida = {};
  if (!extra || typeof extra !== 'object') return saida;
  CAMPOS_EXTRA.forEach((campo) => {
    const valor = extra[campo];
    if (valor === undefined || valor === null || valor === '') return;
    saida[campo] = typeof valor === 'string' ? valor : String(valor);
  });
  return saida;
};

const lista = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const limparMensagem = (valor) =>
  String(valor || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);

const pegar = async (base44, entidade, id) => {
  if (!id) return null;
  return await base44.asServiceRole.entities[entidade]
    .get(id)
    .catch((error) => (error?.status === 404 ? null : Promise.reject(error)));
};

/** A solicitação avisada tem que existir e ser do próprio chamador. */
const ehDoChamador = async (base44, user, tipo, extra) => {
  if (user.role === 'admin') return true;

  if (tipo === 'venda_pendente') {
    const ids = String(extra.venda_ids || extra.venda_id || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!ids.length) return false;
    const vendas = lista(
      await base44.asServiceRole.entities.VendaMimo.filter(
        { id: { $in: ids } },
        { limit: ids.length }
      )
    );
    return vendas.length === ids.length && vendas.every((venda) => venda.usuario_id === user.id);
  }

  if (tipo === 'folga_pendente' || tipo === 'folga_automatica') {
    const folga = await pegar(base44, 'SolicitacaoFolga', extra.folga_id);
    return Boolean(folga) && folga.usuario_id === user.id;
  }

  if (tipo === 'ajuste_ponto_pendente' || tipo === 'ajuste_ponto_aplicado') {
    const ajuste = await pegar(base44, 'AjustePonto', extra.ajuste_ponto_id);
    return Boolean(ajuste) && ajuste.usuario_id === user.id;
  }

  const shift = await pegar(base44, 'Shift', extra.shift_id);
  return Boolean(shift) && shift.usuario_id === user.id;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch((error) =>
      error?.status === 401 ? null : Promise.reject(error)
    );
    if (!user) {
      return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const tipo = String(body?.tipo || '').trim();
    const titulo = TIPOS[tipo];

    if (!titulo) {
      return Response.json(
        { ok: false, error: 'tipo de solicitação inválido' },
        { status: 400 }
      );
    }

    const extra = limparExtra(body?.extra);
    const mensagem = limparMensagem(body?.mensagem) || titulo;

    if (!(await ehDoChamador(base44, user, tipo, extra))) {
      return Response.json({ ok: false, error: 'Sem permissão' }, { status: 403 });
    }

    // Para quem não é admin, um aviso por minuto por tipo: evita inundar o
    // painel dos admins. Admin é quem dispara os avisos em lote (turnos
    // pendentes), então não entra no limite.
    if (user.role !== 'admin') {
      const recentes = lista(
        await base44.asServiceRole.entities.Notificacao.filter(
          {
            solicitante_id: user.id,
            tipo,
            created_date: { $gte: new Date(Date.now() - 60 * 1000).toISOString() },
          },
          { limit: 1 }
        )
      );
      if (recentes.length) {
        return Response.json({ ok: true, criadas: [], aviso: 'aviso repetido ignorado' });
      }
    }

    const admins = lista(await base44.asServiceRole.entities.User.list()).filter(
      (item) => item?.id && item.role === 'admin'
    );

    if (!admins.length) {
      return Response.json({ ok: true, criadas: [], aviso: 'nenhum admin encontrado' });
    }

    const criadas = [];

    for (const admin of admins) {
      const notificacao = await base44.asServiceRole.entities.Notificacao.create({
        usuario_id: admin.id,
        titulo,
        mensagem,
        tipo,
        status: 'pendente',
        lida: false,
        criado_por_automacao: false,
        solicitante_id: user.id,
        solicitante_nome: user.full_name || user.email || '',
        ...extra,
      });
      criadas.push(notificacao);
    }

    return Response.json({ ok: true, criadas, total: criadas.length });
  } catch (error) {
    console.error('[notificarAdmins]', error);
    return Response.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
});