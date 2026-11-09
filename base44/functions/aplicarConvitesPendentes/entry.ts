import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Fecha o ciclo do convite: quando a pessoa convidada cria a conta, esta
// rotina transforma o convite pendente em realidade (chatter, modelos com os
// IDs escolhidos e os turnos) e apaga o convite da fila.
//
// Chamada em dois momentos:
//  - a própria pessoa, no primeiro login, com o corpo vazio (só o convite dela);
//  - um admin, ao abrir a janela de Chatters, que varre todos os pendentes.
//
// Roda com service role porque RLS esconde Modelo e User de quem não é admin.

const PAGE = 500;

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

const mail = (valor: any) => String(valor || '').trim().toLowerCase();

const nomeDe = (usuario: any) =>
  usuario?.nome_exibicao || usuario?.full_name || usuario?.email || '';

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    const eu = await base44.auth.me().catch(() => null);
    if (!eu) {
      return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });
    }

    const corpo = await req.json().catch(() => ({}));
    const admin = eu.role === 'admin';
    const querTodos = admin && corpo?.todos !== false;
    const alvo = admin && querTodos ? '' : mail(eu.email);

    if (!alvo && !querTodos) {
      return Response.json({ ok: false, error: 'Apenas admin' }, { status: 403 });
    }

    const pendentes = (await paginado(base44.asServiceRole.entities.ConviteChatter, {
      status: 'pendente',
    })).filter((convite: any) => (querTodos ? true : mail(convite.email) === alvo));

    const aplicados: any[] = [];
    const esperando: string[] = [];

    for (const convite of pendentes) {
      const email = mail(convite.email);
      if (!email) continue;

      const achados = lista(await base44.asServiceRole.entities.User.filter({ email }, 'created_date', 5));
      const usuario = achados[0];
      if (!usuario?.id) {
        // A conta ainda não existe: o convite continua na fila.
        esperando.push(email);
        continue;
      }

      // Marca em andamento antes de criar nada, para dois cliques não duplicarem turnos.
      await base44.asServiceRole.entities.ConviteChatter.update(convite.id, { status: 'aplicando' });

      const nomeConvite = String(convite.nome || '').trim();
      const nome = nomeConvite || nomeDe(usuario);
      const erros: string[] = [];

      try {
        const patch: any = {};
        if (!usuario.nome_exibicao && nome) patch.nome_exibicao = nome;
        if (convite.cargo === 'admin' && usuario.role !== 'admin') patch.role = 'admin';
        if (Object.keys(patch).length) {
          await base44.asServiceRole.entities.User.update(usuario.id, patch);
        }

        const vinculos = Array.isArray(convite.modelos) ? convite.modelos : [];
        for (const vinculo of vinculos) {
          if (!vinculo?.modelo_id) continue;
          const modelo = await base44.asServiceRole.entities.Modelo.get(vinculo.modelo_id).catch(() => null);
          if (!modelo?.id) continue;
          const atuais = Array.isArray(modelo.chatters) ? modelo.chatters : [];
          if (atuais.some((membro: any) => membro?.usuario_id === usuario.id)) continue;
          const identificador = String(vinculo.identificador || '').trim();
          const ocupados = new Set(atuais.map((membro: any) => String(membro?.identificador || '')));
          await base44.asServiceRole.entities.Modelo.update(modelo.id, {
            chatters: [
              ...atuais,
              {
                usuario_id: usuario.id,
                usuario_nome: nome,
                identificador: identificador && !ocupados.has(identificador) ? identificador : '',
              },
            ],
          });
        }

        const chatterExistente = lista(
          await base44.asServiceRole.entities.Chatter.filter({ usuario_id: usuario.id }, 'created_date', 5)
        )[0];
        if (!chatterExistente) {
          await base44.asServiceRole.entities.Chatter.create({
            usuario_id: usuario.id,
            usuario_email: email,
            nome_exibicao: nome,
            comissao: 0,
            ativo: true,
          });
        }

        const turnosDoConvite = Array.isArray(convite.turnos) ? convite.turnos : [];
        for (const turno of turnosDoConvite) {
          if (!turno?.inicio || !turno?.fim) continue;
          const dias = Array.isArray(turno.dias_semana)
            ? turno.dias_semana.map(Number).filter((dia: number) => dia >= 0 && dia <= 6)
            : [];
          await base44.asServiceRole.entities.Shift.create({
            usuario_id: usuario.id,
            usuario_nome: nome,
            modelo_id: turno.modelo_id || '',
            modelo_nome: turno.modelo_nome || '',
            inicio: turno.inicio,
            fim: turno.fim,
            dias_semana: dias,
            repetir_ate: dias.length && turno.repetir_ate ? turno.repetir_ate : null,
            aceite: 'pendente',
            status: 'agendado',
          });
        }

        await base44.asServiceRole.entities.ConviteChatter.update(convite.id, {
          status: 'aplicado',
          aplicado_em: new Date().toISOString(),
          erro: erros.join(' | '),
        });
        aplicados.push({
          email,
          nome,
          cargo: convite.cargo || 'user',
          modelos: vinculos.length,
          turnos: turnosDoConvite.length,
        });
      } catch (falha: any) {
        const mensagem = String(falha?.message || falha || 'Falha ao aplicar convite');
        await base44.asServiceRole.entities.ConviteChatter.update(convite.id, {
          status: 'pendente',
          erro: mensagem,
        }).catch(() => null);
        erros.push(mensagem);
      }
    }

    return Response.json({ ok: true, aplicados: aplicados.length, detalhes: aplicados, esperando });
  } catch (erro: any) {
    return Response.json(
      { ok: false, error: String(erro?.message || erro || 'Falha ao aplicar convites') },
      { status: 500 }
    );
  }
});
