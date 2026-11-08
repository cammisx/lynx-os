import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Avisa quem ficou com o ponto aberto quando outra pessoa assume a mesma modelo.
//
// A saída não é mais cobrada no horário do fim: o turno fica aberto e o chatter
// encerra quando terminar. Quando alguém bate entrada naquela modelo, quem
// estava aberto ali antes recebe um aviso para registrar a saída real, em vez
// de ter o ponto fechado pelas costas.
//
// Payload: { modelo_id, usuario_id } onde usuario_id é quem acabou de entrar.

const PAGE = 500;

const asList = (resultado: any) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const horaCurta = (valor: any) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const diaCurto = (chave: any) => {
  const partes = String(chave || '').split('-');
  if (partes.length !== 3) return '';
  return `${partes[2]}/${partes[1]}`;
};

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const eu = await base44.auth.me().catch(() => null);
    if (!eu) return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });

    const corpo = await req.json().catch(() => ({}));
    const modeloId = String(corpo?.modelo_id || '');
    const entranteId = String(corpo?.usuario_id || eu.id);
    if (!modeloId) return Response.json({ ok: true, avisados: 0 });

    const entidades = base44.asServiceRole.entities;

    const shifts = asList(await entidades.Shift.filter({ modelo_id: modeloId }, '-inicio', 200));
    const ids = shifts.map((shift: any) => shift.id).filter(Boolean);
    if (!ids.length) return Response.json({ ok: true, avisados: 0 });

    const registros = asList(await entidades.RegistroPonto.filter({ shift_id: { $in: ids } }, '-timestamp', PAGE));

    /* Cada ocorrência é um turno num dia: entrada e saída vivem juntas. */
    const ocorrencias = new Map<string, any>();
    registros.forEach((registro: any) => {
      const shiftId = registro?.shift_id;
      const data = registro?.ocorrencia_data;
      if (!shiftId || !data) return;
      const chave = `${shiftId}|${data}`;
      const atual =
        ocorrencias.get(chave) ||
        {
          chave,
          shiftId,
          dateKey: data,
          usuarioId: registro.usuario_id || '',
          usuarioNome: registro.usuario_nome || '',
          modeloNome: registro.modelo_nome || '',
          entrada: null,
          saida: false,
        };
      if (registro.tipo === 'entrada' && !atual.entrada) atual.entrada = registro.timestamp;
      if (registro.tipo === 'entrada' && registro.usuario_id) {
        atual.usuarioId = registro.usuario_id;
        atual.usuarioNome = registro.usuario_nome || atual.usuarioNome;
      }
      if (registro.tipo === 'saida') atual.saida = true;
      ocorrencias.set(chave, atual);
    });

    const abertas = [...ocorrencias.values()].filter(
      (item) => item.entrada && !item.saida && item.usuarioId && item.usuarioId !== entranteId
    );

    const quemEntrou = eu.full_name || eu.email || 'Outro chatter';
    let avisados = 0;

    for (const item of abertas) {
      const existentes = asList(
        await entidades.Notificacao.filter(
          {
            shift_id: item.shiftId,
            ocorrencia_data: item.dateKey,
            tipo: 'saida_pendente',
          },
          { limit: 5 }
        ).catch(() => [])
      );
      if (existentes.some((notificacao: any) => notificacao.status !== 'resolvida')) continue;

      await entidades.Notificacao.create({
        usuario_id: item.usuarioId,
        titulo: 'Sua saída está pendente',
        mensagem: `${quemEntrou} assumiu ${item.modeloNome || 'a modelo'} às ${horaCurta(
          item.entrada
        )} do dia ${diaCurto(item.dateKey)}. Seu ponto desse turno continua aberto: informe o horário em que você saiu.`,
        tipo: 'saida_pendente',
        shift_id: item.shiftId,
        ocorrencia_data: item.dateKey,
        modelo_id: modeloId,
        modelo_nome: item.modeloNome || '',
        status: 'pendente',
        lida: false,
        criado_por_automacao: true,
      });
      avisados += 1;
    }

    return Response.json({ ok: true, avisados });
  } catch (erro: any) {
    return Response.json({ ok: false, error: String(erro?.message || erro) }, { status: 500 });
  }
});
