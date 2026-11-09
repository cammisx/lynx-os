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

/* São Paulo não tem horário de verão desde 2019: o fuso é fixo em UTC-3. */
const FUSO_HORAS = 3;

/** Ano, mês, dia e relógio de um instante, no fuso do app. */
const partesLocais = (valor: any) => {
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const mapa: any = {};
  for (const parte of formato.formatToParts(new Date(valor))) mapa[parte.type] = parte.value;
  return {
    ano: Number(mapa.year),
    mes: Number(mapa.month),
    dia: Number(mapa.day),
    hh: Number(mapa.hour) % 24,
    mm: Number(mapa.minute) % 60,
  };
};

const chaveDia = (dia: any) =>
  `${dia.ano}-${String(dia.mes).padStart(2, '0')}-${String(dia.dia).padStart(2, '0')}`;

const diaLocal = (valor: any) => {
  const partes = partesLocais(valor);
  return { ano: partes.ano, mes: partes.mes, dia: partes.dia };
};

/** Dia deslocado, com o dia da semana (0 = domingo). */
const somarDias = (dia: any, deslocamento: number) => {
  const base = new Date(Date.UTC(dia.ano, dia.mes - 1, dia.dia + deslocamento));
  return {
    ano: base.getUTCFullYear(),
    mes: base.getUTCMonth() + 1,
    dia: base.getUTCDate(),
    semana: base.getUTCDay(),
  };
};

/** Instante de um horário local (ano/mês/dia + hh:mm). */
const instanteLocal = (dia: any, hh: number, mm: number) =>
  Date.UTC(dia.ano, dia.mes - 1, dia.dia, hh + FUSO_HORAS, mm);

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
    /* Simulação: mostra o que sairia do lugar sem escrever nada. */
    const simular = corpo?.simular === true;

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

    const resumo: any = {
      turnos: [],
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
      if (!simular) {
        await base44.asServiceRole.entities.Modelo.update(modelo.id, { chatters: proximos });
      }
      resumo.modelos += 1;
    }

    // 2. Turnos: só o que ainda não terminou sai de cena, com motivo e sem
    //    apagar histórico. Turno recorrente tem `fim` só da primeira
    //    ocorrência, então cancelar as datas uma a uma (cancelamentos) e
    //    fechar a série em hoje é o que tira as semanas seguintes da agenda.
    const turnos = await paginado(base44.asServiceRole.entities.Shift, { usuario_id: usuarioId }, '-inicio');
    const agora = Date.now();
    const data = hoje();
    const hojeDia = diaLocal(agora);
    for (const turno of turnos) {
      if (!turno?.inicio) continue;
      const status = String(turno.status || '');
      if (status === 'cancelado' || status === 'concluido') continue;

      const dias = Array.isArray(turno.dias_semana)
        ? turno.dias_semana.map(Number).filter((dia: number) => dia >= 0 && dia <= 6)
        : [];
      const cancelamentos = Array.isArray(turno.cancelamentos) ? turno.cancelamentos : [];
      const jaCancelados = new Set(
        cancelamentos.map((item: any) => (typeof item === 'string' ? item : item?.data)).filter(Boolean)
      );
      const patch: any = {};
      let mudou = false;

      if (!dias.length) {
        // Turno único: mantém a regra de sempre, só o que não terminou.
        const fim = new Date(turno.fim || turno.inicio).getTime();
        if (!(fim >= agora)) continue;
        patch.status = 'cancelado';
        if (!jaCancelados.has(data)) {
          cancelamentos.push({ data, motivo, cancelado_em: new Date().toISOString() });
          patch.cancelamentos = cancelamentos;
        }
        mudou = true;
      } else {
        const inicioMs = new Date(turno.inicio).getTime();
        const relogio = partesLocais(turno.fim || turno.inicio);
        const limiteSerie = turno.repetir_ate ? String(turno.repetir_ate).slice(0, 10) : '';
        const inicioDia = diaLocal(inicioMs);

        // Hoje e ontem (turno que vira a madrugada) podem ainda não ter acabado.
        for (const deslocamento of [-1, 0]) {
          const dia = somarDias(hojeDia, deslocamento);
          const diaMs = instanteLocal(dia, 0, 0);
          if (diaMs < instanteLocal(inicioDia, 0, 0)) continue;
          if (limiteSerie && chaveDia(dia) > limiteSerie) continue;
          if (!dias.includes(dia.semana)) continue;
          const fimOcorrencia = instanteLocal(dia, relogio.hh, relogio.mm);
          if (!(fimOcorrencia >= agora)) continue;
          if (jaCancelados.has(chaveDia(dia))) continue;
          cancelamentos.push({ data: chaveDia(dia), motivo, cancelado_em: new Date().toISOString() });
          patch.cancelamentos = cancelamentos;
          jaCancelados.add(chaveDia(dia));
          mudou = true;
        }

        // Fecha a série: nada nasce depois de hoje, então as semanas seguintes
        // somem da agenda sem inventar cancelamento no futuro.
        if (!limiteSerie || limiteSerie > data) {
          patch.repetir_ate = data;
          mudou = true;
        }
      }

      if (!mudou) continue;
      resumo.turnos_cancelados += 1;
      if (simular) {
        resumo.turnos.push({ id: turno.id, inicio: turno.inicio, dias_semana: dias, mudanca: patch });
        continue;
      }
      await base44.asServiceRole.entities.Shift.update(turno.id, patch);
    }

    // 3. Chatter, ficha e anexos.
    const chatters = lista(
      await base44.asServiceRole.entities.Chatter.filter({ usuario_id: usuarioId }, 'created_date', 10)
    );
    for (const chatter of chatters) {
      if (simular) continue;
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
      if (simular) continue;
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
        resumo.convites += 1;
        if (simular) continue;
        await base44.asServiceRole.entities.ConviteChatter.update(convite.id, {
          status: 'cancelado',
          cancelado_motivo: motivo,
        });
      }
    }

    // 5. O usuário em si.
    let apagado = true;
    if (simular) {
      return Response.json({ ok: true, simulado: true, apagado: false, resumo });
    }
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
