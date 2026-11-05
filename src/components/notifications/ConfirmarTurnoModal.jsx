import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { emitShiftsChanged } from '@/lib/desktopEvents';
import { daysLabel, sortDays } from '@/lib/shiftRepeat';
import { nextOccurrence } from '@/lib/aceite';
import { buildTurnoRecusadoMessage, notificarAdmins } from '@/lib/notificacoes';

const pad = (value) => String(value).padStart(2, '0');

const momentLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} às ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const hintStyle = {
  fontSize: 10,
  color: 'var(--c2)',
  opacity: 0.7,
  lineHeight: 1.4,
};

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11 }}>
      <span style={{ color: 'var(--c2)' }}>{label}</span>
      <span style={{ color: 'var(--c3)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

const baseButton = {
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  fontSize: 11,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};

export default function ConfirmarTurnoModal({ notification, chatterNome, onClose, onSaved }) {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [motivo, setMotivo] = useState('');
  const [recusando, setRecusando] = useState(false);
  const [saving, setSaving] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let active = true;
    base44.entities.Shift.get(notification.shift_id)
      .then((result) => {
        if (active) setShift(result || null);
      })
      .catch(() => {
        if (active) setShift(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [notification.shift_id]);

  const finalizarNotificacao = async (resposta) => {
    await base44.entities.Notificacao.update(notification.id, {
      status: 'resolvida',
      lida: true,
      resposta,
    });
  };

  const aceitar = async () => {
    if (!shift || saving) return;
    setSaving('aceitar');
    setErro('');
    try {
      const salvo = await base44.entities.Shift.update(shift.id, {
        aceite: 'aceito',
        aceite_em: new Date().toISOString(),
      });
      if (salvo && salvo.aceite !== 'aceito') {
        throw new Error(
          'O campo de aceite ainda não existe no banco. Publique o app para sincronizar o schema.'
        );
      }
      await finalizarNotificacao('aceito');
      emitShiftsChanged();
      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      setErro(error?.message || 'Não consegui salvar a confirmação.');
    } finally {
      setSaving(null);
    }
  };

  const recusar = async () => {
    if (!shift || saving) return;
    setSaving('recusar');
    setErro('');
    try {
      const motivoLimpo = motivo.trim();
      const salvo = await base44.entities.Shift.update(shift.id, {
        aceite: 'recusado',
        aceite_em: new Date().toISOString(),
        motivo_recusa: motivoLimpo,
      });
      if (salvo && salvo.aceite !== 'recusado') {
        throw new Error(
          'O campo de aceite ainda não existe no banco. Publique o app para sincronizar o schema.'
        );
      }
      await finalizarNotificacao(motivoLimpo ? `recusado: ${motivoLimpo}` : 'recusado');

      await notificarAdmins(base44, {
        titulo: 'Turno recusado',
        mensagem: buildTurnoRecusadoMessage(shift, chatterNome, motivoLimpo, nextOccurrence(shift)),
        tipo: 'turno_recusado',
        shift_id: shift.id,
        ocorrencia_data: '',
        modelo_id: shift.modelo_id || '',
      });

      emitShiftsChanged();
      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      setErro(error?.message || 'Não consegui salvar a recusa.');
    } finally {
      setSaving(null);
    }
  };

  const proxima = shift ? nextOccurrence(shift) : null;
  const dias = sortDays(shift?.dias_semana);

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
          width: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--c8) 72%, transparent)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          border:
            '1px solid color-mix(in srgb, white 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
          boxShadow: '0 16px 56px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-main)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c3)' }}>
            Confirmar turno
          </span>
          <span style={hintStyle}>
            Você precisa aceitar ou recusar este turno para o admin saber que está de acordo.
          </span>
        </div>

        {loading && <span style={{ fontSize: 11, color: 'var(--c2)' }}>Carregando turno…</span>}

        {!loading && !shift && (
          <span style={{ fontSize: 11, color: 'var(--c2)' }}>
            Este turno não existe mais. A notificação será dispensada.
          </span>
        )}

        {shift && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <InfoRow label="Modelo" value={shift.modelo_nome || '—'} />
            <InfoRow
              label="Dias"
              value={dias.length ? daysLabel(dias) : `Único em ${momentLabel(shift.inicio)}`}
            />
            <InfoRow
              label="Horário"
              value={`${momentLabel(shift.inicio).split(' às ')[1]} – ${
                momentLabel(shift.fim).split(' às ')[1]
              }`}
            />
            <InfoRow
              label="Repetição"
              value={shift.repetir_ate ? `Semanal até ${momentLabel(shift.repetir_ate)}` : dias.length ? 'Semanal, sem prazo' : 'Turno único'}
            />
            {proxima && (
              <InfoRow label="Próximo turno" value={momentLabel(new Date(proxima.start))} />
            )}
          </div>
        )}

        {recusando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Motivo da recusa (opcional)"
              maxLength={280}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 64,
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
              }}
            />
            <span style={hintStyle}>O admin recebe este motivo junto com o aviso de recusa.</span>
          </div>
        )}

        {erro && (
          <span style={{ fontSize: 11, color: '#ff6b6b', lineHeight: 1.4 }}>{erro}</span>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {!shift && (
            <button
              type="button"
              onClick={async () => {
                await finalizarNotificacao('turno removido');
                if (onSaved) await onSaved();
                onClose();
              }}
              style={{
                ...baseButton,
                background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
                color: 'var(--c1)',
                fontWeight: 700,
              }}
            >
              Entendi
            </button>
          )}

          {shift && !recusando && (
            <>
              <button
                type="button"
                onClick={() => setRecusando(true)}
                disabled={Boolean(saving)}
                style={{
                  ...baseButton,
                  background: 'color-mix(in srgb, #ff6b6b 16%, transparent)',
                  border: '1px solid color-mix(in srgb, #ff6b6b 45%, transparent)',
                  color: '#ff6b6b',
                  fontWeight: 700,
                }}
              >
                Recusar
              </button>
              <button
                type="button"
                onClick={aceitar}
                disabled={Boolean(saving)}
                style={{
                  ...baseButton,
                  background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
                  color: 'var(--c1)',
                  fontWeight: 700,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving === 'aceitar' ? 'Salvando…' : 'Aceitar'}
              </button>
            </>
          )}

          {shift && recusando && (
            <>
              <button
                type="button"
                onClick={() => setRecusando(false)}
                style={{
                  ...baseButton,
                  background: 'transparent',
                  border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
                  color: 'var(--c2)',
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={recusar}
                disabled={Boolean(saving)}
                style={{
                  ...baseButton,
                  background: 'color-mix(in srgb, #ff6b6b 16%, transparent)',
                  border: '1px solid color-mix(in srgb, #ff6b6b 45%, transparent)',
                  color: '#ff6b6b',
                  fontWeight: 700,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving === 'recusar' ? 'Enviando…' : 'Confirmar recusa'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
