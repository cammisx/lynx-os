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
const PRAZO_HORAS = 24;
const JANELA_DIAS = 30;

const AREA = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 62,
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

const SUGESTAO = {
  flex: 1,
  height: 30,
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  background: 'transparent',
  color: 'var(--c2)',
  fontSize: 11,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};

const ativoStyle = {
  border: '1px solid color-mix(in srgb, var(--c1) 55%, transparent)',
  background: 'color-mix(in srgb, var(--c1) 18%, transparent)',
  color: 'var(--c1)',
  fontWeight: 700,
};

const diaCurto = (ms) =>
  new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const horaDe = (ms) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

const diaLongo = (ms) =>
  new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function SolicitarFolgaModal({ usuario, onClose, onSaved }) {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [selecionada, setSelecionada] = useState('');
  const [tipo, setTipo] = useState('folga');
  const [ajuste, setAjuste] = useState('sair_antes');
  const [hora, setHora] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [ciente, setCiente] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!usuario?.id) return undefined;
    let ativo = true;
    base44.entities.Shift.filter({ usuario_id: usuario.id }, '-inicio', 200)
      .then((result) => {
        if (!ativo) return;
        const agora = Date.now();
        const lista = asList(result)
          .filter((shift) => !isRecusado(shift))
          .flatMap((shift) => expandShift(shift, agora, agora + JANELA_DIAS * DAY_MS))
          .filter((occurrence) => occurrence.start > agora)
          .sort((a, b) => a.start - b.start)
          .map((occurrence) => ({
            chave: `${occurrence.shift.id}|${localDateKey(occurrence.start)}`,
            shiftId: occurrence.shift.id,
            dateKey: localDateKey(occurrence.start),
            modeloId: occurrence.shift.modelo_id || '',
            modeloNome: occurrence.shift.modelo_nome || '',
            start: occurrence.start,
            end: occurrence.end,
          }));
        setOcorrencias(lista);
        setSelecionada((atual) => atual || lista[0]?.chave || '');
      })
      .catch(() => setOcorrencias([]))
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [usuario?.id]);

  const ocorrencia = useMemo(
    () => ocorrencias.find((item) => item.chave === selecionada) || null,
    [ocorrencias, selecionada]
  );

  const antecedenciaHoras = ocorrencia ? (ocorrencia.start - Date.now()) / 3600000 : 0;
  const foraDoPrazo = !!ocorrencia && antecedenciaHoras < PRAZO_HORAS;

  /** Horário escolhido combinado com o dia do turno (madrugada cai no dia seguinte). */
  const horarioFinal = useMemo(() => {
    if (!ocorrencia || !hora) return null;
    const base = new Date(ocorrencia.start);
    base.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
    let valor = base.getTime();
    if (valor <= ocorrencia.start) valor += DAY_MS;
    if (valor >= ocorrencia.end) return null;
    return valor;
  }, [ocorrencia, hora]);

  const erroHorario = (() => {
    if (tipo !== 'reducao' || !ocorrencia || !hora) return '';
    if (!horarioFinal) return 'Esse horário não está dentro do turno.';
    return '';
  })();

  const faltaMotivo = foraDoPrazo && motivo.trim().length < 3;
  const faltaCiente = foraDoPrazo && !ciente;
  const reducaoIncompleta = tipo === 'reducao' && (!hora || !!erroHorario);

  const podeEnviar =
    !!ocorrencia && !reducaoIncompleta && !faltaMotivo && !faltaCiente && !salvando;

  const enviar = async () => {
    if (!podeEnviar) return;
    setSalvando(true);
    setErro('');
    try {
      const criada = await base44.entities.SolicitacaoFolga.create({
        usuario_id: usuario?.id || '',
        usuario_nome: usuario?.full_name || usuario?.email || '',
        shift_id: ocorrencia.shiftId,
        modelo_id: ocorrencia.modeloId,
        modelo_nome: ocorrencia.modeloNome,
        ocorrencia_data: ocorrencia.dateKey,
        tipo,
        ajuste: tipo === 'reducao' ? ajuste : '',
        horario_solicitado: horarioFinal ? new Date(horarioFinal).toISOString() : '',
        turno_inicio: new Date(ocorrencia.start).toISOString(),
        turno_fim: new Date(ocorrencia.end).toISOString(),
        antecedencia_horas: Number(antecedenciaHoras.toFixed(1)),
        fora_do_prazo: foraDoPrazo,
        motivo: motivo.trim(),
        status: 'pendente',
      });

      const turnoTexto = `${ocorrencia.modeloNome || 'turno'} em ${diaLongo(
        ocorrencia.start
      )}, ${horaDe(ocorrencia.start)}–${horaDe(ocorrencia.end)}`;
      const pedido =
        tipo === 'folga'
          ? `folga no turno de ${turnoTexto}`
          : `redução no turno de ${turnoTexto} (${
              ajuste === 'sair_antes' ? 'sair' : 'entrar'
            } às ${horaDe(horarioFinal)})`;
      const prazo = foraDoPrazo
        ? ` Pedido fora do prazo (faltavam ${Math.max(0, Math.floor(antecedenciaHoras))}h).`
        : '';
      const motivoTexto = motivo.trim() ? ` Motivo: ${motivo.trim()}` : '';

      await notificarAdminsSolicitacao(base44, {
        titulo: tipo === 'folga' ? 'Pedido de folga' : 'Pedido de redução',
        mensagem: `${usuario?.full_name || usuario?.email || 'Chatter'} pediu ${pedido}.${prazo}${motivoTexto}`,
        tipo: 'folga_pendente',
        extra: { folga_id: criada?.id || '', shift_id: ocorrencia.shiftId, ocorrencia_data: ocorrencia.dateKey },
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
        aria-label="Solicitar folga ou redução"
        style={{
          width: 420,
          maxHeight: '88vh',
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
            flexShrink: 0,
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
            Folga ou redução de horário
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

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 11, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Turno</span>
            <select
              value={selecionada}
              onChange={(event) => setSelecionada(event.target.value)}
              style={{
                height: 32,
                borderRadius: 8,
                background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
                color: 'var(--c3)',
                fontSize: 12,
                padding: '0 8px',
                fontFamily: 'var(--font-main)',
                outline: 'none',
              }}
            >
              {ocorrencias.length === 0 && (
                <option value="">
                  {carregando ? 'Carregando…' : 'Você não tem turnos futuros'}
                </option>
              )}
              {ocorrencias.map((item) => (
                <option key={item.chave} value={item.chave}>
                  {`${diaCurto(item.start)} · ${horaDe(item.start)}–${horaDe(item.end)}${
                    item.modeloNome ? ` · ${item.modeloNome}` : ''
                  }`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>O que você precisa</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setTipo('folga')}
                style={{ ...SUGESTAO, ...(tipo === 'folga' ? ativoStyle : null) }}
              >
                Folga no turno
              </button>
              <button
                type="button"
                onClick={() => setTipo('reducao')}
                style={{ ...SUGESTAO, ...(tipo === 'reducao' ? ativoStyle : null) }}
              >
                Reduzir horário
              </button>
            </div>
          </div>

          {tipo === 'reducao' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={rotulo}>Como vai ser</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAjuste('sair_antes');
                      setHora(null);
                    }}
                    style={{ ...SUGESTAO, ...(ajuste === 'sair_antes' ? ativoStyle : null) }}
                  >
                    Vou sair antes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAjuste('entrar_depois');
                      setHora(null);
                    }}
                    style={{ ...SUGESTAO, ...(ajuste === 'entrar_depois' ? ativoStyle : null) }}
                  >
                    Vou entrar depois
                  </button>
                </div>
              </div>

              <DateTimePicker
                value={hora}
                onChange={setHora}
                mode="time"
                label={ajuste === 'sair_antes' ? 'Horário que vou sair' : 'Horário que vou entrar'}
              />

              {ocorrencia && (
                <span style={{ fontSize: 11, color: erroHorario ? '#ff6b6b' : 'var(--c2)' }}>
                  {erroHorario ||
                    `Turno das ${horaDe(ocorrencia.start)} às ${horaDe(ocorrencia.end)}.`}
                </span>
              )}
            </>
          )}

          {foraDoPrazo && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                padding: '9px 11px',
                borderRadius: 8,
                background: 'color-mix(in srgb, #e8b93b 12%, transparent)',
                border: '1px solid color-mix(in srgb, #e8b93b 40%, transparent)',
              }}
            >
              <span style={{ fontSize: 11, color: '#e8b93b', lineHeight: 1.45 }}>
                Pedido fora do prazo: faltam {Math.max(0, Math.floor(antecedenciaHoras))}h para o
                turno e o mínimo é {PRAZO_HORAS}h. Isso pode gerar falta.
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={rotulo}>Motivo</span>
                <textarea
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder="Por que está pedindo em cima da hora?"
                  maxLength={280}
                  style={AREA}
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 7,
                  fontSize: 11,
                  color: 'var(--c3)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={ciente}
                  onChange={(event) => setCiente(event.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--c1)' }}
                />
                Entendo que o pedido está fora do prazo e pode gerar falta.
              </label>
            </div>
          )}

          {!foraDoPrazo && ocorrencia && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.85 }}>
              Pedido dentro do prazo de {PRAZO_HORAS}h.
            </span>
          )}

          {erro && <span style={{ fontSize: 11, color: '#ff6b6b' }}>{erro}</span>}
        </div>

        <div
          style={{
            flexShrink: 0,
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
            {salvando ? 'Enviando…' : foraDoPrazo ? 'Confirmar e enviar' : 'Enviar pedido'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
