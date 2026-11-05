import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Cria a notificação de uma solicitação (venda, folga, ajuste de ponto)
// para todos os admins. Roda com service role porque o chatter não tem
// permissão de listar a entidade User.
//
// Payload: { titulo, mensagem, tipo, extra: { folga_id, ... } }

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const titulo = String(body?.titulo || '').trim();
    const mensagem = String(body?.mensagem || '').trim();
    const tipo = String(body?.tipo || '').trim();

    if (!titulo || !mensagem || !tipo) {
      return Response.json({ ok: false, error: 'titulo, mensagem e tipo são obrigatórios' }, { status: 400 });
    }

    const admins = lista(await base44.asServiceRole.entities.User.list()).filter(
      (item) => item?.id && item.role === 'admin'
    );

    if (!admins.length) {
      return Response.json({ ok: true, criadas: [], aviso: 'nenhum admin encontrado' });
    }

    const extra = limparExtra(body?.extra);
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
