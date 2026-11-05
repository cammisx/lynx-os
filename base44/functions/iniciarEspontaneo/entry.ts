import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Começa um turno espontâneo: a pessoa entra numa página que está livre.
//
// Regras:
// - só em modelo em que ela está atribuída;
// - a página precisa estar livre (ninguém com ponto aberto);
// - o turno espontâneo nasce como Shift normal com avulso: true, para bater
//   ponto, aparecer na janela Turnos e nos relatórios;
// - se duas pessoas clicarem juntas, a entrada mais antiga fica. Quem perdeu
//   tem o turno desfeito na hora e recebe o motivo na resposta.
//
// Payload: { modelo_id }

const TZ = 'America/Sao_Paulo';
const DAY_MS = 86400000;
const PAGE = 500;
const JANELA_DIAS = 7;
const REGISTRO_JANELA_MS = 48 * 60 * 60 * 1000;
const REGISTRO_ESQUECIDO_MS = 18 * 60 * 60 * 1000;
const FIM_PADRAO_MS = 8 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');
const lista = (resultado: any) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

export const wallClockInTz = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
};

export const tzOffsetMs = (utcMs: number) => {
  const wall = wallClockInTz(new Date(utcMs));
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - utcMs;
};

export const zonedToUtc = (dateKey: string, hours: number, minutes: number) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const guess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  return guess - tzOffsetMs(guess);
};

export const dateKeyInTz = (value: Date | number | string) => {
  const wall = wallClockInTz(new Date(value));
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
};

const keyPlusDays = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const base = new Date(Date.UTC(year, month - 1, day + days));
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
};

const weekdayOfKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const sortDays = (dias: any) => (Array.isArray(dias) ? dias.map(Number).sort((a, b) => a - b) : []);

const diasCancelados = (shift: any) =>
  new Set(
    (Array.isArray(shift?.cancelamentos) ? shift.cancelamentos : [])
      .map((item: any) => (typeof item === 'string' ? item : item?.data))
      .filter(Boolean)
  );

const ajustesPorDia = (shift: any) => {
  const mapa = new Map<string, { start: number; end: number }>();
  (Array.isArray(shift?.ajustes) ? shift.ajustes : []).forEach((item: any) => {
    if (!item?.data) return;
    const start = new Date(item.inicio).getTime();
    const end = new Date(item.fim).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return;
    mapa.set(String(item.data), { start, end });
  });
  return mapa;
};

export const expandOccurrences = (shift: any, fromMs: number, toMs: number) => {
  const start = new Date(shift?.inicio);
  const end = new Date(shift?.fim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

  const cancelados = diasCancelados(shift);
  const ajustes = ajustesPorDia(shift);
  const dias = sortDays(shift.dias_semana);
  const inicioKey = dateKeyInTz(start);

  if (!dias.length) {
    const ajuste = ajustes.get(inicioKey);
    if (!ajuste && cancelados.has(inicioKey)) return [];
    const occStart = ajuste ? ajuste.start : start.getTime();
    const occEnd = ajuste ? ajuste.end : end.getTime();
    if (occEnd <= fromMs || occStart >= toMs) return [];
    return [{ shift, key: inicioKey, start: occStart, end: occEnd }];
  }

  const duration = end.getTime() - start.getTime();
  const wall = wallClockInTz(start);
  const limiteKey = shift?.repetir_ate ? String(shift.repetir_ate).slice(0, 10) : null;
  const ocorrencias: any[] = [];

  let cursorKey = dateKeyInTz(fromMs);
  if (cursorKey < inicioKey) cursorKey = inicioKey;

  for (let i = 0; i <= JANELA_DIAS + 1; i += 1) {
    const key = keyPlusDays(cursorKey, i);
    if (limiteKey && key > limiteKey) break;
    if (!dias.includes(weekdayOfKey(key))) continue;
    if (cancelados.has(key)) continue;

    const ajuste = ajustes.get(key);
    const occStart = ajuste ? ajuste.start : zonedToUtc(key, wall.hour, wall.minute);
    if (occStart === null) continue;
    const occEnd = ajuste ? ajuste.end : occStart + duration;
    if (occEnd <= fromMs || occStart >= toMs) continue;

    ocorrencias.push({ shift, key, start: occStart, end: occEnd });
  }

  return ocorrencias;
};

export const entradasAbertas = (registros: any[], now: number) => {
  const porChave = new Map<string, any>();

  const ordenados = [...(registros || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  ordenados.forEach((registro) => {
    if (!registro?.shift_id) return;
    const chave = `${registro.shift_id}|${registro.ocorrencia_data || ''}`;
    const item =
      porChave.get(chave) ||
      {
        chave,
        shiftId: registro.shift_id,
        modeloId: registro.modelo_id || '',
        modeloNome: registro.modelo_nome || '',
        usuarioId: registro.usuario_id || '',
        usuarioNome: registro.usuario_nome || '',
        entrada: null as number | null,
        saida: null as number | null,
      };

    const ts = new Date(registro.timestamp).getTime();
    if (!Number.isNaN(ts)) {
      if (registro.tipo === 'entrada') {
        item.entrada = ts;
        item.saida = null;
      } else if (registro.tipo === 'saida') {
        item.saida = ts;
      }
    }

    if (registro.usuario_id) item.usuarioId = registro.usuario_id;
    if (registro.usuario_nome) item.usuarioNome = registro.usuario_nome;
    if (registro.modelo_id) item.modeloId = registro.modelo_id;
    if (registro.modelo_nome) item.modeloNome = registro.modelo_nome;

    porChave.set(chave, item);
  });

  return [...porChave.values()].filter(
    (item) =>
      item.entrada !== null && item.saida === null && now - item.entrada <= REGISTRO_ESQUECIDO_MS
  );
};

export const turnosVigentes = (shifts: any[], modeloId: string, fromMs: number, toMs: number) =>
  (shifts || [])
    .filter((shift) => shift?.modelo_id === modeloId && !shift?.avulso)
    .filter((shift) => shift?.aceite !== 'recusado')
    .filter((shift) => shift?.status !== 'cancelado')
    .flatMap((shift) => expandOccurrences(shift, fromMs, toMs))
    .sort((a, b) => a.start - b.start);

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const modeloId = String(body?.modelo_id || '').trim();
    if (!modeloId) {
      return Response.json({ ok: false, error: 'modelo_id é obrigatório' }, { status: 400 });
    }

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

    const modelos = await fetchWhere('Modelo', { id: modeloId });
    const modelo = modelos[0];
    if (!modelo) {
      return Response.json({ ok: false, error: 'Modelo não encontrado' }, { status: 404 });
    }
    if (modelo.arquivada) {
      return Response.json({ ok: false, error: 'Modelo arquivada' }, { status: 409 });
    }

    const atribuida = (Array.isArray(modelo.chatters) ? modelo.chatters : []).some(
      (chatter: any) => chatter?.usuario_id === user.id
    );
    if (!atribuida) {
      return Response.json(
        { ok: false, error: 'Você não está atribuída nessa página' },
        { status: 403 }
      );
    }

    const now = Date.now();
    const [shifts, registros] = await Promise.all([
      fetchWhere('Shift', {}, 'inicio'),
      fetchWhere(
        'RegistroPonto',
        {
          modelo_id: modeloId,
          timestamp: { $gte: new Date(now - REGISTRO_JANELA_MS).toISOString() },
        },
        '-timestamp'
      ),
    ]);

    const ocupadas = entradasAbertas(registros, now).filter((item) => item.modeloId === modeloId);
    if (ocupadas.length) {
      const ocupante = ocupadas[0];
      const minha = ocupante.usuarioId === user.id;
      return Response.json(
        {
          ok: false,
          motivo: minha ? 'ja_na_pagina' : 'ocupada',
          ocupante: { usuario_id: ocupante.usuarioId, usuario_nome: ocupante.usuarioNome },
          error: minha
            ? 'Você já está com o ponto aberto nessa página'
            : `${ocupante.usuarioNome || 'Alguém'} está na página agora`,
        },
        { status: 409 }
      );
    }

    const ocorrencias = turnosVigentes(shifts, modeloId, now, now + JANELA_DIAS * DAY_MS);
    const proximo = ocorrencias.find((occ) => occ.start > now) || null;
    const fimPrevisto = proximo ? proximo.start : now + FIM_PADRAO_MS;
    const entradaIso = new Date(now).toISOString();
    const dateKey = dateKeyInTz(now);

    const shift = await base44.asServiceRole.entities.Shift.create({
      usuario_id: user.id,
      usuario_nome: user.full_name || user.email || '',
      modelo_id: modelo.id,
      modelo_nome: modelo.nome || '',
      pagina_nome: modelo.nome || '',
      inicio: entradaIso,
      fim: new Date(fimPrevisto).toISOString(),
      inicio_real: entradaIso,
      aceite: 'aceito',
      aceite_em: entradaIso,
      status: 'em_andamento',
      repeticao: 'nenhuma',
      avulso: true,
    });

    await base44.asServiceRole.entities.RegistroPonto.create({
      shift_id: shift.id,
      ocorrencia_data: dateKey,
      usuario_id: user.id,
      usuario_nome: user.full_name || user.email || '',
      modelo_id: modelo.id,
      modelo_nome: modelo.nome || '',
      tipo: 'entrada',
      timestamp: entradaIso,
    });

    // Desempate: se alguém entrou junto, a entrada mais antiga fica com a página.
    const conferencia = await fetchWhere(
      'RegistroPonto',
      {
        modelo_id: modeloId,
        timestamp: { $gte: new Date(now - 5 * 60 * 1000).toISOString() },
      },
      '-timestamp'
    );
    const concorrentes = entradasAbertas(conferencia, Date.now()).filter(
      (item) =>
        item.modeloId === modeloId &&
        item.usuarioId !== user.id &&
        item.entrada !== null &&
        item.entrada < now
    );

    if (concorrentes.length) {
      const vencedor = concorrentes[0];
      const desfecho = new Date().toISOString();
      await base44.asServiceRole.entities.RegistroPonto.create({
        shift_id: shift.id,
        ocorrencia_data: dateKey,
        usuario_id: user.id,
        usuario_nome: user.full_name || user.email || '',
        modelo_id: modelo.id,
        modelo_nome: modelo.nome || '',
        tipo: 'saida',
        timestamp: desfecho,
        automatico: true,
        justificativa: 'Entrada desfeita: outra pessoa entrou antes',
      });
      await base44.asServiceRole.entities.Shift.update(shift.id, {
        status: 'cancelado',
        fim_real: desfecho,
      });

      return Response.json(
        {
          ok: false,
          motivo: 'ocupada',
          ocupante: { usuario_id: vencedor.usuarioId, usuario_nome: vencedor.usuarioNome },
          error: `${vencedor.usuarioNome || 'Alguém'} entrou na página antes de você`,
        },
        { status: 409 }
      );
    }

    return Response.json({
      ok: true,
      shift_id: shift.id,
      entrada: entradaIso,
      fim_previsto: new Date(fimPrevisto).toISOString(),
      minutos_ate_proximo: proximo ? Math.max(0, Math.round((proximo.start - now) / 60000)) : null,
      proximo: proximo
        ? {
            shift_id: proximo.shift?.id || '',
            inicio: new Date(proximo.start).toISOString(),
            usuario_nome: proximo.shift?.usuario_nome || '',
          }
        : null,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
});
