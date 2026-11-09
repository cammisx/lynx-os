import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Fecha o ciclo do convite: no primeiro acesso da pessoa convidada, esta
// rotina vira o convite pendente em realidade (chatter, vínculos nas modelos,
// turnos como PEDIDO DE APROVAÇÃO e a notificação de cada turno) e fecha o
// convite. Só a sessão da própria pessoa aplica, porque os turnos precisam
// nascer do lado dela, com o aviso esperando para ser confirmado.
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

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const dois = (valor: number) => String(valor).padStart(2, '0');

const dataCurta = (valor: any) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return `${dois(data.getDate())}/${dois(data.getMonth() + 1)}`;
};

const horaCurta = (valor: any) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return `${dois(data.getHours())}:${dois(data.getMinutes())}`;
};

const fraseDias = (dias: number[]) => {
  const ordenados = [...dias].sort((a, b) => a - b);
  const nomes = ordenados.map((dia) => DIAS_CURTOS[dia]).filter(Boolean);
  if (nomes.length <= 1) return nomes.join('');
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
};

/** Mesmo texto que o app usa quando o admin cria um turno na mão. */
const mensagemNovoTurno = (turno: any, dias: number[]) => {
  const modelo = turno.modelo_nome ? `em ${turno.modelo_nome}` : 'em uma modelo';
  const horario = `das ${horaCurta(turno.inicio)} às ${horaCurta(turno.fim)}`;
  if (!dias.length) {
    return `Novo turno ${modelo}: ${dataCurta(turno.inicio)}, ${horario}.`;
  }
  const ate = turno.repetir_ate
    ? ` até ${dataCurta(`${String(turno.repetir_ate).slice(0, 10)}T12:00:00`)}`
    : '';
  return `Novo turno ${modelo}: ${fraseDias(dias)}, ${horario}, a partir de ${dataCurta(
    turno.inicio
  )}${ate}.`;
};

const nomeDe = (usuario: any) =>
  usuario?.nome_exibicao || usuario?.full_name || usuario?.email || '';

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    const eu = await base44.auth.me().catch(() => null);
    if (!eu) {
      return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });
    }

    const alvo = mail(eu.email);
    if (!alvo) {
      return Response.json({ ok: false, error: 'Conta sem e-mail' }, { status: 400 });
    }

    const pendentes = (await paginado(base44.asServiceRole.entities.ConviteChatter, {
      status: 'pendente',
    })).filter((convite: any) => mail(convite.email) === alvo);

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
          const criado = await base44.asServiceRole.entities.Shift.create({
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

          // O turno nasce como pedido: o aviso espera a pessoa entrar para aceitar.
          try {
            await base44.asServiceRole.entities.Notificacao.create({
              usuario_id: usuario.id,
              titulo: 'Novo turno',
              mensagem: mensagemNovoTurno(turno, dias),
              tipo: 'novo_shift',
              shift_id: criado?.id || '',
              status: 'pendente',
              lida: false,
              criado_por_automacao: false,
              modelo_id: turno.modelo_id || '',
              ocorrencia_data: '',
            });
          } catch (falhaAviso: any) {
            console.warn('[convite] sem notificação do turno', falhaAviso?.message || falhaAviso);
          }
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
