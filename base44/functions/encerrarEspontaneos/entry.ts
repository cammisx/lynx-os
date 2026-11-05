import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Encerra turnos espontâneos abertos numa página quando o turno programado
// começa de verdade: ou seja, no instante em que alguém bate a entrada.
//
// Chamada depois de qualquer entrada registrada no modelo. O turno que acabou
// de receber a entrada vai em `shift_id` e nunca é encerrado por aqui.
//
// Payload: { modelo_id, shift_id, momento? }

const PAGE = 500;
const TZ = 'America/Sao_Paulo';

const pad = (value: number) => String(value).padStart(2, '0');
const lista = (resultado: any) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const timeLabel = (value: Date | number | string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(value));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return `${pad(Number(map.hour) % 24)}:${map.minute}`;
};

/** Devolve a entrada ainda aberta da ocorrência, se houver. */
const ocorrenciaAberta = (registros: any[]) => {
  const porChave = new Map<string, any>();

  [...(registros || [])]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .forEach((registro) => {
      if (!registro?.shift_id) return;
      const chave = `${registro.shift_id}|${registro.ocorrencia_data || ''}`;
      const item =
        porChave.get(chave) ||
        {
          chave,
          shiftId: registro.shift_id,
          dateKey: registro.ocorrencia_data || '',
          usuarioId: registro.usuario_id || '',
          usuarioNome: registro.usuario_nome || '',
          modeloId: registro.modelo_id || '',
          modeloNome: registro.modelo_nome || '',
          entrada: null as number | null,
          saida: null as number | null,
          pausaAberta: false,
        };

      const ts = new Date(registro.timestamp).getTime();
      if (!Number.isNaN(ts)) {
        if (registro.tipo === 'entrada') {
          item.entrada = ts;
          item.saida = null;
        } else if (registro.tipo === 'saida') {
          item.saida = ts;
        } else if (registro.tipo === 'pausa') {
          item.pausaAberta = true;
        } else if (registro.tipo === 'retorno') {
          item.pausaAberta = false;
        }
      }

      if (registro.usuario_id) item.usuarioId = registro.usuario_id;
      if (registro.usuario_nome) item.usuarioNome = registro.usuario_nome;
      if (registro.modelo_id) item.modeloId = registro.modelo_id;
      if (registro.modelo_nome) item.modeloNome = registro.modelo_nome;

      porChave.set(chave, item);
    });

  return [...porChave.values()].find((item) => item.entrada !== null && item.saida === null) || null;
};

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const modeloId = String(body?.modelo_id || '').trim();
    const shiftId = String(body?.shift_id || '').trim();
    const agora = Date.now();
    const momento = body?.momento ? new Date(body.momento).getTime() : agora;
    // Carimbo de horário forjado não entra no ponto de ninguém: só vale se
    // estiver perto de agora.
    const fechamento = new Date(
      Number.isNaN(momento) || Math.abs(momento - agora) > 10 * 60 * 1000 ? agora : momento
    ).toISOString();

    const fetchWhere = async (entity: string, query: any, sort = '-created_date') => {
      const out: any[] = [];
      let skip = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities[entity].filter(query, sort, PAGE, skip);
        const items = lista(batch);
        out.push(...items);
        if (items.length < PAGE) break;
        skip += PAGE;
      }
      return out;
    };

    // Só quem acabou de bater a entrada no próprio turno (ou um admin) tira os
    // espontâneos do ar, e a varredura fica presa ao modelo do próprio turno.
    let escopoModelo = modeloId;
    if (user.role !== 'admin') {
      const proprio = shiftId
        ? await base44.asServiceRole.entities.Shift.get(shiftId).catch(() => null)
        : null;

      if (!proprio || proprio.usuario_id !== user.id) {
        return Response.json({ ok: false, error: 'Sem permissão' }, { status: 403 });
      }

      const entradas = await fetchWhere(
        'RegistroPonto',
        { shift_id: shiftId, usuario_id: user.id, tipo: 'entrada' },
        '-timestamp'
      );
      const quando = entradas[0] ? new Date(entradas[0].timestamp).getTime() : NaN;

      if (Number.isNaN(quando) || agora - quando > 15 * 60 * 1000) {
        return Response.json({ ok: false, error: 'Sem permissão' }, { status: 403 });
      }

      escopoModelo = proprio.modelo_id || '';
      if (!escopoModelo) {
        return Response.json({ ok: true, encerrados: [], erros: [] });
      }
    }

    const avulsos = (await fetchWhere('Shift', { avulso: true, status: 'em_andamento' })).filter(
      (shift) => shift?.id && shift.id !== shiftId
    );

    const alvos = escopoModelo
      ? avulsos.filter((shift) => shift.modelo_id === escopoModelo)
      : avulsos;
    const encerrados: any[] = [];
    const erros: any[] = [];

    for (const shift of alvos) {
      try {
        const registros = await fetchWhere('RegistroPonto', { shift_id: shift.id }, '-timestamp');
        const aberta = ocorrenciaAberta(registros);
        if (!aberta) continue;

        await base44.asServiceRole.entities.RegistroPonto.create({
          shift_id: shift.id,
          ocorrencia_data: aberta.dateKey,
          usuario_id: aberta.usuarioId || shift.usuario_id,
          usuario_nome: aberta.usuarioNome || shift.usuario_nome || '',
          modelo_id: shift.modelo_id || '',
          modelo_nome: shift.modelo_nome || '',
          tipo: 'saida',
          timestamp: fechamento,
          automatico: true,
          justificativa: 'Turno programado começou',
        });

        await base44.asServiceRole.entities.Shift.update(shift.id, {
          status: 'concluido',
          fim_real: fechamento,
        });

        const modeloNome = shift.modelo_nome || aberta.modeloNome || 'página';
        const jaAvisado = lista(
          await base44.asServiceRole.entities.Notificacao.filter(
            { shift_id: shift.id, tipo: 'turno_espontaneo_encerrado' },
            { limit: 1 }
          )
        );

        if (!jaAvisado.length) {
          await base44.asServiceRole.entities.Notificacao.create({
            usuario_id: shift.usuario_id,
            titulo: 'Turno espontâneo encerrado',
            mensagem: `${user.full_name || 'O turno programado'} entrou em ${modeloNome} às ${timeLabel(
              fechamento
            )}, então seu turno espontâneo foi encerrado automaticamente.`,
            tipo: 'turno_espontaneo_encerrado',
            shift_id: shift.id,
            modelo_id: shift.modelo_id || '',
            modelo_nome: modeloNome,
            ocorrencia_data: aberta.dateKey,
            criado_por_automacao: true,
          });
        }

        encerrados.push({
          shift_id: shift.id,
          usuario_id: shift.usuario_id,
          usuario_nome: shift.usuario_nome || '',
          entrada: aberta.entrada ? new Date(aberta.entrada).toISOString() : null,
          saida: fechamento,
        });
      } catch (error: any) {
        erros.push({ shift_id: shift.id, error: error?.message || String(error) });
      }
    }

    return Response.json({ ok: true, encerrados, erros });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
});