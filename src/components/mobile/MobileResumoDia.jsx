import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { expandShift } from '@/lib/shiftRepeat';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const horaCurta = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const inicioDoDia = () => {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  return data;
};

const fimDoDia = () => {
  const data = new Date();
  data.setHours(23, 59, 59, 999);
  return data;
};

/**
 * Resumo do dia na home do celular: qual turno está acontecendo agora (ou o
 * próximo de hoje) e quantas pendências estão abertas para essa pessoa.
 */
export default function MobileResumoDia({ user, onAbrirTurnos }) {
  const [turno, setTurno] = useState(undefined);
  const [pendencias, setPendencias] = useState(0);

  useEffect(() => {
    const usuarioId = user?.id;
    if (!usuarioId) return;
    let ativo = true;

    const comeco = inicioDoDia();
    const termino = fimDoDia();

    /* Turnos avulsos e séries semanais vêm em duas consultas, como no relógio,
       e as séries são expandidas para hoje antes de escolher qual mostrar. */
    Promise.all([
      base44.entities.Shift.filter({
        usuario_id: usuarioId,
        inicio: { $lt: termino.toISOString() },
        fim: { $gt: comeco.toISOString() },
      }),
      base44.entities.Shift.filter({
        usuario_id: usuarioId,
        dias_semana: { $exists: true },
        inicio: { $lt: termino.toISOString() },
      }),
    ])
      .then(([avulsos, series]) => {
        if (!ativo) return;
        const agora = Date.now();
        const ocorrencias = [];

        asList(avulsos)
          .filter((item) => item.status !== 'recusado')
          .forEach((item) => {
            const start = new Date(item.inicio).getTime();
            const end = new Date(item.fim).getTime();
            if (Number.isNaN(start) || Number.isNaN(end)) return;
            ocorrencias.push({ shift: item, start, end });
          });

        asList(series)
          .filter((item) => item.status !== 'recusado')
          .forEach((item) => {
            expandShift(item, comeco.getTime(), termino.getTime() + 1).forEach((ocorrencia) => {
              ocorrencias.push({ shift: item, start: ocorrencia.start, end: ocorrencia.end });
            });
          });

        const ordenadas = ocorrencias.sort((a, b) => a.start - b.start);
        const emAndamento = ordenadas.find((item) => item.start <= agora && item.end >= agora);
        const proximo = ordenadas.find((item) => item.start > agora);

        setTurno(
          emAndamento
            ? { emAndamento: true, inicio: emAndamento.start, fim: emAndamento.end, shift: emAndamento.shift }
            : proximo
              ? { emAndamento: false, inicio: proximo.start, fim: proximo.end, shift: proximo.shift }
              : null
        );
      })
      .catch(() => ativo && setTurno(null));

    base44.entities.Notificacao.filter({ usuario_id: usuarioId, status: 'pendente' })
      .then((resultado) => ativo && setPendencias(asList(resultado).length))
      .catch(() => ativo && setPendencias(0));

    return () => {
      ativo = false;
    };
  }, [user?.id]);

  const emAndamento = Boolean(turno?.emAndamento);

  return (
    <button
      type="button"
      onClick={onAbrirTurnos}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        padding: '12px 14px',
        borderRadius: 16,
        border: '1px solid color-mix(in srgb, var(--c1) 20%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
        color: 'var(--c3)',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c2)' }}>
        Resumo do dia
      </span>

      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            flexShrink: 0,
            background: emAndamento ? 'var(--c16)' : 'color-mix(in srgb, var(--c2) 55%, transparent)',
          }}
        />
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>
          {turno === undefined
            ? 'Conferindo seus turnos…'
            : turno
              ? `${emAndamento ? 'Em turno' : 'Próximo turno'}: ${horaCurta(turno.inicio)} – ${horaCurta(
                  turno.fim
                )} · ${turno.shift?.modelo_nome || 'sem modelo'}`
              : 'Nenhum turno hoje'}
        </span>
      </span>

      <span style={{ fontSize: 11.5, color: pendencias ? 'var(--aviso)' : 'var(--c2)' }}>
        {pendencias ? `${pendencias} pendência${pendencias > 1 ? 's' : ''} esperando você` : 'Nada pendente'}
      </span>
    </button>
  );
}
