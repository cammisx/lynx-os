import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Tira o acesso de alguém ao sistema de verdade:
//  - sai de todas as modelos (o vínculo com o ID de centavos some);
//  - o registro de chatter e a ficha de cadastro são apagados;
//  - os turnos futuros são cancelados COM motivo, para o histórico de ponto
//    continuar contando a história;
//  - o convite pendente, se ainda existir, é cancelado;
//  - por último, o usuário é apagado (é isso que retira a pessoa da lista de
//    usuários do app no painel do Base44).
//
// Roda com service role e só aceita admin. Ninguém se apaga por aqui.

const PAGE = 500;
const TZ = 'America/Sao_Paulo';

const lista = (resultado: any) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const paginado = async (entidade: any, query: any = {}, sort = 'created_date') => {
  const saida: any[] = [];
  let skip = 0;
  while (true) {
    const lote = await entidade.filter(query, sort, PAGE, skip);
    const itens = lista(lote);
    saida.push(...itens);
    if (itens.length < PAGE) break;
    skip += PAGE;
  }
  return saida;
};

const hoje = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date()
  );

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    const eu = await base44.auth.me().catch(() => null);
    if (!eu) {
      return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });
    }
    if (eu.role !== 'admin') {
      return Response.json({ ok: false, error: 'Apenas admin' }, { status: 403 });
    }

    const corpo = await req.json().catch(() => ({}));
    const usuarioId = String(corpo?.usuario_id || '').trim();
    const motivo = String(corpo?.motivo || '').trim();

    if (!usuarioId) {
      return Response.json({ ok: false, error: 'Informe quem vai perder o acesso' }, { status: 400 });
    }
    if (usuarioId === eu.id) {
      return Response.json({ ok: false, error: 'Você não pode remover o seu próprio acesso' }, { status: 400 });
    }
    if (!motivo) {
      return Response.json({ ok: false, error: 'Escreva o motivo da saída' }, { status: 400 });
    }

    const usuario = await base44.asServiceRole.entities.User.get(usuarioId).catch(() => null);
    if (!usuario?.id) {
      return Response.json({ ok: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    const resumo = {
      nome: usuario.nome_exibicao || usuario.full_name || usuario.email || '',
      email: usuario.email || '',
      modelos: 0,
      turnos_cancelados: 0,
      anexos_removidos: 0,
      convites: 0,
    };

    // 1. Sai das modelos.
    const modelos = await paginado(base44.asServiceRole.entities.Modelo, {});
    for (const modelo of modelos) {
      const atuais = Array.isArray(modelo?.chatters) ? modelo.chatters : [];
      if (!atuais.some((membro: any) => membro?.usuario_id === usuarioId)) continue;
      const proximos = atuais.filter((membro: any) => membro?.usuario_id !== usuarioId);
      await base44.asServiceRole.entities.Modelo.update(modelo.id, { chatters: proximos });
      resumo.modelos += 1;
    }

    // 2. Turnos futuros: cancelados com motivo, sem apagar histórico.
    const turnos = await paginado(base44.asServiceRole.entities.Shift, { usuario_id: usuarioId }, '-inicio');
    const agora = Date.now();
    const data = hoje();
    for (const turno of turnos) {
      if (!turno?.inicio) continue;
      const fim = new Date(turno.fim || turno.inicio).getTime();
      if (!(fim >= agora)) continue;
      const status = String(turno.status || '');
      if (status === 'cancelado' || status === 'concluido') continue;
      const cancelamentos = Array.isArray(turno.cancelamentos) ? turno.cancelamentos : [];
      await base44.asServiceRole.entities.Shift.update(turno.id, {
        status: 'cancelado',
        cancelamentos: [
          ...cancelamentos,
          {
            data,
            motivo,
            cancelado_em: new Date().toISOString(),
          },
        ],
      });
      resumo.turnos_cancelados += 1;
    }

    // 3. Chatter, ficha e anexos.
    const chatters = lista(
      await base44.asServiceRole.entities.Chatter.filter({ usuario_id: usuarioId }, 'created_date', 10)
    );
    for (const chatter of chatters) {
      await base44.asServiceRole.entities.Chatter.delete(chatter.id).catch(() => null);
    }

    const fichas = lista(
      await base44.asServiceRole.entities.FichaChatter.filter({ usuario_id: usuarioId }, 'created_date', 10)
    );
    for (const ficha of fichas) {
      const anexos = [
        ...(Array.isArray(ficha.documentos) ? ficha.documentos : []),
        ...(Array.isArray(ficha.contratos) ? ficha.contratos : []),
      ].filter((arquivo: any) => arquivo?.file_uri);
      resumo.anexos_removidos += anexos.length;
      await base44.asServiceRole.entities.FichaChatter.delete(ficha.id).catch(() => null);
    }

    // 4. Convite pendente do mesmo e-mail.
    const email = String(usuario.email || '').toLowerCase();
    if (email) {
      const convites = (await paginado(base44.asServiceRole.entities.ConviteChatter, {})).filter(
        (convite: any) =>
          String(convite?.email || '').toLowerCase() === email &&
          (convite?.status === 'pendente' || convite?.status === 'aplicando')
      );
      for (const convite of convites) {
        await base44.asServiceRole.entities.ConviteChatter.update(convite.id, {
          status: 'cancelado',
          cancelado_motivo: motivo,
        });
        resumo.convites += 1;
      }
    }

    // 5. O usuário em si.
    let apagado = true;
    try {
      await base44.asServiceRole.entities.User.delete(usuarioId);
    } catch (falha: any) {
      apagado = false;
      console.warn('[removerAcessoUsuario] apagar usuário', falha?.message || falha);
    }

    return Response.json({ ok: true, apagado, resumo });
  } catch (erro: any) {
    return Response.json(
      { ok: false, error: String(erro?.message || erro || 'Falha ao remover o acesso') },
      { status: 500 }
    );
  }
});
