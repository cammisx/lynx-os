import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import DateTimePicker from '@/components/DateTimePicker';
import { clockLabel } from '@/lib/ponto';
import { emitShiftsChanged } from '@/lib/desktopEvents';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const dateLabel = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 80,
  resize: 'vertical',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  color: 'var(--c3)',
  fontSize: 12,
  lineHeight: 1.45,
  padding: '8px 10px',
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11 }}>
      <span style={{ color: 'var(--c2)' }}>{label}</span>
      <span style={{ color: 'var(--c3)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function JustificativaModal({ notification, onClose, onSaved }) {
  const [registros, setRegistros] = useState([]);
  const [shift, setShift] = useState(null);
  const [resposta, setResposta] = useState('');
  const [hora, setHora] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      base44.entities.RegistroPonto.filter(
        { shift_id: notification.shift_id, ocorrencia_data: notification.ocorrencia_data },
        { sort: 'timestamp', limit: 50 }
      ),
      base44.entities.Shift.get(notification.shift_id).catch(() => null),
    ]).then(([registroResult, shiftResult]) => {
      if (!active) return;
      setRegistros(asList(registroResult));
      setShift(shiftResult);
    });
    return () => {
      active = false;
    };
  }, [notification.id, notification.shift_id, notification.ocorrencia_data]);

  const entrada = registros.find((registro) => registro.tipo === 'entrada');
  const saida = registros.find((registro) => registro.tipo === 'saida');
  const modeloNome = registros[0]?.modelo_nome || shift?.modelo_nome || '—';
  const podeEnviar = resposta.trim().length > 0 && !sending;

  const send = async () => {
    if (!podeEnviar) return;
    setSending(true);
    try {
      if (saida) {
        const patch = { justificativa: resposta.trim() };
        if (hora) {
          const [year, month, day] = String(notification.ocorrencia_data || '')
            .split('-')
            .map(Number);
          if (year && month && day) {
            const when = new Date(year, month - 1, day, hora.getHours(), hora.getMinutes(), 0, 0);
            patch.timestamp = when.toISOString();
          }
        }
        await base44.entities.RegistroPonto.update(saida.id, patch);
      }
      await base44.entities.Notificacao.update(notification.id, {
        status: 'resolvida',
        resposta: resposta.trim(),
      });
      emitShiftsChanged();
      if (onSaved) await onSaved();
      onClose();
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.28)',
      }}
    >
      <div
        style={{
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--c8) 72%, transparent)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          border: '1px solid color-mix(in srgb, white 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
          boxShadow: '0 16px 56px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-main)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c3)' }}>
          Saída não registrada
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <InfoRow label="Modelo" value={modeloNome} />
          <InfoRow label="Data" value={dateLabel(notification.ocorrencia_data)} />
          <InfoRow label="Entrada registrada" value={clockLabel(entrada?.timestamp)} />
          <InfoRow label="Saída encerrada" value={clockLabel(saida?.timestamp)} />
          <InfoRow label="Fim previsto" value={clockLabel(shift?.fim)} />
        </div>

        <textarea
          value={resposta}
          onChange={(event) => setResposta(event.target.value)}
          placeholder="O que houve?"
          style={inputStyle}
        />

        <DateTimePicker
          value={hora}
          onChange={setHora}
          mode="time"
          label="Corrigir horário de saída (opcional)"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            className="md-btn"
            onClick={onClose}
            style={{
              height: 30,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
              background: 'transparent',
              color: 'var(--c2)',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!podeEnviar}
            style={{
              height: 30,
              padding: '0 14px',
              borderRadius: 8,
              background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
              color: 'var(--c1)',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-main)',
              cursor: podeEnviar ? 'pointer' : 'default',
              opacity: podeEnviar ? 1 : 0.5,
            }}
          >
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}