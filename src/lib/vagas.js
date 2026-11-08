import { expandShift } from '@/lib/shiftRepeat';

/**
 * Regras de agenda de uma modelo: quem pode ocupar qual horário e o que sobra
 * sem ninguém escalado.
 *
 * A regra da casa é uma só: uma modelo tem no máximo um chatter por horário.
 * O mesmo chatter pode estar em duas modelos ao mesmo tempo, então o choque é
 * sempre calculado dentro de uma modelo.
 */

const DAY_MS = 86400000;

/* Uma série semanal pode durar anos. Esta janela existe só para não varrer
   o infinito quando o turno não tem data final. */
const JANELA_BUSCA_MS = 400 * DAY_MS;

export const JANELA_24H = { inicio: 0, fim: 1440 };
export const DURACAO_MINIMA_VAGA_MS = 60 * 60 * 1000;

const numero = (valor) => {
  const data = new Date(valor).getTime();
  return Number.isFinite(data) ? data : null;
};

const minutosDe = (texto) => {
  const [hora, minuto] = String(texto || '').split(':').map(Number);
  if (!Number.isFinite(hora) || hora < 0 || hora > 23) return null;
  const min = Number.isFinite(minuto) ? Math.min(59, Math.max(0, minuto)) : 0;
  return hora * 60 + min;
};

/**
 * Área coberta pela modelo naquele dia da semana (0 = domingo).
 * Sem nada configurado, o dia inteiro vale como área dela.
 *
 * A janela fica no campo `janela_operacao` da modelo: uma lista de sete itens
 * { inicio: 'HH:MM', fim: 'HH:MM' }. Item vazio, inválido ou que atravessa a
 * meia-noite volta para 24h, porque uma janela que vira o dia partiria a
 * coluna da agenda em duas.
 */
export const janelaDoDia = (modelo, weekday) => {
  const lista = Array.isArray(modelo?.janela_operacao) ? modelo.janela_operacao : [];
  const item = lista[weekday];
  const inicio = minutosDe(item?.inicio);
  const fim = minutosDe(item?.fim);
  if (inicio === null || fim === null || fim <= inicio) return { ...JANELA_24H };
  return { inicio, fim };
};

const sobrepoe = (a, b) => a.start < b.end && b.start < a.end;

/** O que já está escalado, em milissegundos, dentro da janela pedida. */
export const intervalosOcupados = (shifts, janelaInicio, janelaFim) =>
  (shifts || [])
    .filter((shift) => shift && shift.aceite !== 'recusado')
    .flatMap((shift) => expandShift(shift, janelaInicio, janelaFim))
    .map((ocorrencia) => ({ start: ocorrencia.start, end: ocorrencia.end, shift: ocorrencia.shift }))
    .filter((item) => item.end > item.start);

/**
 * Choques entre o turno que está sendo salvo e o que já existe na mesma modelo.
 *
 * `candidato` é o turno do formulário (inicio/fim em ISO, dias_semana e
 * repetir_ate iguais aos que vão para o banco). `existentes` são os turnos da
 * modelo, inclusive séries. Devolve uma lista vazia quando o horário está livre.
 */
export function conflitosDeTurno({ candidato, existentes = [], ignorarId = '' }) {
  const inicio = numero(candidato?.inicio);
  const fim = numero(candidato?.fim);
  if (inicio === null || fim === null || fim <= inicio) return [];

  const limite = candidato.repetir_ate
    ? new Date(`${String(candidato.repetir_ate).slice(0, 10)}T23:59:59.999`).getTime()
    : inicio + JANELA_BUSCA_MS;

  /* Dois dias antes do início dão conta de turno que começa de madrugada e é
     comparado com a ocorrência do dia anterior. */
  const buscaInicio = inicio - 2 * DAY_MS;
  const buscaFim = Math.max(limite, fim) + DAY_MS;

  const minhas = expandShift({ ...candidato }, buscaInicio, buscaFim);
  const outras = (existentes || [])
    .filter((shift) => shift && shift.id !== ignorarId && shift.aceite !== 'recusado')
    .flatMap((shift) => expandShift(shift, buscaInicio, buscaFim));

  const choques = [];
  const vistos = new Set();

  minhas.forEach((minha) => {
    outras.forEach((outra) => {
      if (!sobrepoe(minha, outra)) return;
      const chave = `${outra.shift.id}|${outra.start}`;
      if (vistos.has(chave)) return;
      vistos.add(chave);
      choques.push({
        shiftId: outra.shift.id,
        usuarioId: outra.shift.usuario_id || '',
        usuarioNome: outra.shift.usuario_nome || '',
        inicio: outra.start,
        fim: outra.end,
        meuInicio: minha.start,
        meuFim: minha.end,
      });
    });
  });

  return choques.sort((a, b) => a.inicio - b.inicio);
}

const dataCurta = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const horaCurta = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/** Texto curto de cada choque, para o aviso no formulário e na notificação. */
export const descreverConflito = (choque) =>
  `${choque.usuarioNome || 'Alguém'} já está escalado em ${dataCurta(choque.inicio)} das ${horaCurta(
    choque.inicio
  )} às ${horaCurta(choque.fim)}`;

/**
 * Horários sem ninguém escalado, por dia, dentro da área da modelo.
 *
 * `dias` são as datas das colunas da agenda (o dia do calendário, não o turno).
 * Cada vaga já vem com `top` e `height` em porcentagem, prontos para desenhar.
 */
export function janelasVagas({
  shifts = [],
  dias = [],
  modelo = null,
  minimoMs = DURACAO_MINIMA_VAGA_MS,
} = {}) {
  if (!dias.length) return [];
  const primeiro = dias[0].getTime();
  const ultimo = dias[dias.length - 1].getTime() + DAY_MS;
  const ocupados = intervalosOcupados(shifts, primeiro - DAY_MS, ultimo + DAY_MS);

  return dias.map((dia) => {
    const dayStart = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate()).getTime();
    const dayEnd = dayStart + DAY_MS;
    const janela = janelaDoDia(modelo, dia.getDay());
    const limiteInicio = dayStart + janela.inicio * 60000;
    const limiteFim = dayStart + janela.fim * 60000;

    const doDia = ocupados
      .map((item) => ({ start: Math.max(item.start, dayStart), end: Math.min(item.end, dayEnd) }))
      .filter((item) => item.end > item.start)
      .sort((a, b) => a.start - b.start);

    const vagas = [];
    let cursor = limiteInicio;
    doDia.forEach((item) => {
      if (item.start > cursor) {
        vagas.push({ start: cursor, end: Math.min(item.start, limiteFim) });
      }
      cursor = Math.max(cursor, item.end);
    });
    if (cursor < limiteFim) vagas.push({ start: cursor, end: limiteFim });

    return vagas
      .filter((vaga) => vaga.end - vaga.start >= minimoMs)
      .map((vaga) => ({
        start: vaga.start,
        end: vaga.end,
        top: ((vaga.start - dayStart) / DAY_MS) * 100,
        height: ((vaga.end - vaga.start) / DAY_MS) * 100,
      }));
  });
}

const asLista = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

/**
 * Turno que o próprio chatter cria ao cobrir um horário vago.
 *
 * Mesma conferência do formulário: uma modelo, um chatter por horário. Como o
 * banco não tem trava, depois de criar o turno a gente reconfere: se alguém
 * criou o mesmo horário antes, quem chegou segundo apaga o próprio turno.
 */
export async function criarVagaCobertura(base44, { modelo, usuario, inicio, fim }) {
  const modeloId = modelo?.id || '';
  const candidato = {
    modelo_id: modeloId,
    usuario_id: usuario?.id || '',
    inicio: new Date(inicio).toISOString(),
    fim: new Date(fim).toISOString(),
  };

  const agenda = async () => {
    if (!modeloId) return [];
    try {
      return asLista(await base44.entities.Shift.filter({ modelo_id: modeloId }, '-inicio', 500));
    } catch (erro) {
      console.warn('[Vagas] agenda da modelo', erro);
      return [];
    }
  };

  const antes = await agenda();
  const choques = conflitosDeTurno({ candidato, existentes: antes });
  if (choques.length) {
    throw new Error(
      `${choques[0].usuarioNome || 'Outra pessoa'} já está escalado nesse horário nesta modelo.`
    );
  }

  const turno = await base44.entities.Shift.create({
    usuario_id: usuario?.id || '',
    usuario_nome: usuario?.full_name || usuario?.email || '',
    modelo_id: modeloId,
    modelo_nome: modelo?.nome || '',
    pagina_nome: modelo?.nome || '',
    inicio: candidato.inicio,
    fim: candidato.fim,
    status: 'agendado',
    aceite: 'aceito',
    aceite_em: new Date().toISOString(),
    repeticao: 'nenhuma',
    avulso: true,
  });

  const depos = await agenda();
  const rivais = conflitosDeTurno({
    candidato,
    existentes: depos.filter((item) => item.id !== turno.id),
  })
    .map((choque) => depos.find((item) => item.id === choque.shiftId))
    .filter(Boolean);

  const perdeu = rivais.some(
    (rival) =>
      new Date(rival.created_date || 0).getTime() < new Date(turno.created_date || 0).getTime()
  );
  if (perdeu) {
    await base44.entities.Shift.delete(turno.id).catch((erro) =>
      console.warn('[Vagas] desfazer', erro)
    );
    throw new Error(`${rivais[0]?.usuario_nome || 'Outra pessoa'} pegou esse horário antes de você.`);
  }

  return turno;
}

/** Avisa os admins que um horário vago foi coberto por conta própria. */
export async function avisarAdminsDaCobertura(base44, { modelo, usuario, inicio, fim }) {
  try {
    const admins = asLista(await base44.entities.User.filter({ role: 'admin' }, '-created_date', 50));
    const quando = `${dataCurta(inicio)} ${horaCurta(inicio)} — ${horaCurta(fim)}`;
    await Promise.all(
      admins.map((admin) =>
        base44.entities.Notificacao.create({
          usuario_id: admin.id,
          titulo: 'Horário vago coberto',
          mensagem: `${usuario?.full_name || usuario?.email || 'Um chatter'} se escalou em ${
            modelo?.nome || 'uma modelo'
          }, ${quando}.`,
          tipo: 'vaga_coberta',
          status: 'pendente',
          lida: false,
          criado_por_automacao: true,
          modelo_id: modelo?.id || '',
          modelo_nome: modelo?.nome || '',
          turno_inicio: new Date(inicio).toISOString(),
          turno_fim: new Date(fim).toISOString(),
        })
      )
    );
  } catch (erro) {
    console.warn('[Vagas] aviso aos admins', erro);
  }
}
