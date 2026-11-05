import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import DateTimePicker from '@/components/DateTimePicker';
import { CloseIcon, CoffeeIcon } from '@/components/icons';
import { expandShift } from '@/lib/shiftRepeat';
import { isRecusado } from '@/lib/aceite';
import { localDateKey } from '@/lib/ponto';
import notificarAdminsSolicitacao from '@/lib/solicitacoes';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);
const DAY_MS = 86400000;

const AREA = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 70,
  resize: 'vertical',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  color: 'var(--c3)',
  fontSize: 12,
  lineHeight: 1.5,
  padding: '8px 10px',
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

const BOTAO = {
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};

const rotulo = {
  fontSize: 10,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

const dataLonga = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function SolicitarFolgaModal({ usuario, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [meusShifts, setMeusShifts] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!usuario?.id) return undefined;
    let ativo = true;
    base44.entities.Shift.filter({ usuario_id: usuario.id }, '-inicio', 200)
      .then((result) => {
        if (ativo) setMeusShifts(asList(result).filter((shift) => !isRecusado(shift)));
      })
      .catch(() => setMeusShifts([]));
    return () => {
      ativo = false;
    };
  }, [usuario?.id]);

  // Quantos turnos caem no dia pedido, pra pessoa saber o tamanho do buraco.
  const turnosNoDia = useMemo(() => {
    if (!data) return [];
    const inicio = new Date(data);
    inicio.setHours(0, 0, 0, 0);
    const ate = inicio.getTime() + DAY_MS;
    return meusShifts.flatMap((shift) => expandShift(shift, inicio.getTime(), ate));
  }, [data, meusShifts]);

  const podeEnviar = !!data && motivo.trim().length >= 3 && !salvando;

  const enviar = async () => {
    if (!podeEnviar) return;
    setSalvando(true);
    setErro('');
    try {
      const chave = localDateKey(data);
      const criada = await base44.entities.SolicitacaoFolga.create({
        usuario_id: usuario?.id || '',
        usuario_nome: usuario?.full_name || usuario?.email || '',
        data: chave,
        turnos_no_dia: turnosNoDia.length,
        motivo: motivo.trim(),
        status: 'pendente',
      });

      await notificarAdminsSolicitacao(base44, {
        titulo: 'Pedido de folga',
        mensagem: `${usuario?.full_name || usuario?.email || 'Chatter'} pediu folga em ${dataLonga(
          data
        )}${turnosNoDia.length ? ` (${turnosNoDia.length} turno(s) no dia)` : ''}. Motivo: ${motivo.trim()}`,
        tipo: 'folga_pendente',
        extra: { folga_id: criada?.id || '' },
      });

      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      const mensagem = String(error?.message || '');
      setErro(
        /not found|does not exist|schema/i.test(mensagem)
          ? 'A entidade SolicitacaoFolga ainda não existe no app. Publique para sincronizar.'
          : mensagem || 'Não consegui registrar o pedido.'
      );
    } finally {
      setSalvando(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.32)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Solicitar folga"
        style={{
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--c8) 62%, transparent)',
          backdropFilter: 'blur(22px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
          border:
            '1px solid color-mix(in srgb, white 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
          boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-main)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '0 8px 0 14px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--c1)',
            }}
          >
            <CoffeeIcon size={14} />
            Solicitar folga
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="clk-nav-btn"
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={13} />
          </button>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Dia da folga</span>
            <DateTimePicker value={data} onChange={setData} mode="date" label="Escolher dia" />
          </div>

          {data && (
            <span style={{ fontSize: 11, color: 'var(--c2)' }}>
              {turnosNoDia.length
                ? `Você tem ${turnosNoDia.length} turno(s) nesse dia.`
                : 'Você não tem turno nesse dia.'}
            </span>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Motivo</span>
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Por que precisa dessa folga?"
              maxLength={400}
              style={AREA}
            />
          </div>

          {erro && <span style={{ fontSize: 11, color: '#ff6b6b' }}>{erro}</span>}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '10px 14px',
            borderTop: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              ...BOTAO,
              border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
              background: 'transparent',
              color: 'var(--c2)',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={!podeEnviar}
            className="md-btn"
            style={{
              ...BOTAO,
              border: 'none',
              background: podeEnviar ? 'var(--c1)' : 'color-mix(in srgb, var(--c2) 22%, transparent)',
              color: podeEnviar ? 'var(--c8)' : 'var(--c2)',
              cursor: podeEnviar ? 'pointer' : 'default',
              opacity: salvando ? 0.6 : 1,
            }}
          >
            {salvando ? 'Enviando…' : 'Pedir folga'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
