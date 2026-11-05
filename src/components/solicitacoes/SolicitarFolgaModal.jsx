import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import { base44 } from '@/api/base44Client';
import DateTimePicker from '@/components/DateTimePicker';
import GlassSelect from '@/components/GlassSelect';
import { CloseIcon, CoffeeIcon } from '@/components/icons';
import { expandShift } from '@/lib/shiftRepeat';
import { isRecusado } from '@/lib/aceite';
import { localDateKey } from '@/lib/ponto';
import notificarAdminsSolicitacao from '@/lib/solicitacoes';
import { aplicarFolgaAprovada } from '@/lib/folgas';

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
  new Date(ms).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

/** Junta o dia do turno com o horário escolhido, virando o dia quando precisa. */
const combinar = (diaBase, hora, ancora) => {
  if (!hora) return null;
  const base = new Date(diaBase);
  base.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
  let valor = base.getTime();
  if (valor < ancora) valor += DAY_MS;
  return valor;
};

export default function SolicitarFolgaModal({ usuario, onClose, onSaved }) {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [selecionada, setSelecionada] = useState('');
  const [tipo, setTipo] = useState('folga');
  const [entrada, setEntrada] = useState(null);
  const [saida, setSaida] = useState(null);
  const [motivo, setMotivo] = useState('');
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

  // Ao trocar de turno, os campos de horário começam iguais aos do turno.
  useEffect(() => {
    if (!ocorrencia) return;
    setEntrada(new Date(ocorrencia.start));
    setSaida(new Date(ocorrencia.end));
  }, [ocorrencia?.chave]);

  const antecedenciaHoras = ocorrencia ? (ocorrencia.start - Date.now()) / 3600000 : 0;
  const foraDoPrazo = !!ocorrencia && antecedenciaHoras < PRAZO_HORAS;

  // Entrada: mesma data do turno; se o horário for menor que o início, cai na madrugada seguinte.
  const entradaFinal = useMemo(() => {
    if (!ocorrencia || !entrada) return null;
    const valor = combinar(ocorrencia.start, entrada, ocorrencia.start);
    if (valor === null || valor >= ocorrencia.end) return null;
    return valor;
  }, [ocorrencia, entrada]);

  // Saída: sempre depois da entrada e nunca depois do fim do turno.
  const saidaFinal = useMemo(() => {
    if (!ocorrencia || !saida || !entradaFinal) return null;
    const valor = combinar(ocorrencia.start, saida, entradaFinal + 1);
    if (valor === null || valor > ocorrencia.end) return null;
    return valor;
  }, [ocorrencia, saida, entradaFinal]);

  const erroHorario = (() => {
    if (tipo !== 'reducao' || !ocorrencia) return '';
    if (!entradaFinal) return 'A entrada precisa ser dentro do turno.';
    if (!saidaFinal) return 'A saída precisa ser depois da entrada e dentro do turno.';
    if (entradaFinal === ocorrencia.start && saidaFinal === ocorrencia.end) {
      return 'Altere pelo menos um dos horários.';
    }
    return '';
  })();

  const reducaoIncompleta = tipo === 'reducao' && !!erroHorario;
  const faltaJustificativa = foraDoPrazo && motivo.trim().length < 3;
  const podeEnviar = !!ocorrencia && !reducaoIncompleta && !faltaJustificativa && !salvando;

  const enviar = async () => {
    if (!podeEnviar) return;
    setSalvando(true);
    setErro('');
    try {
      const registro = {
        usuario_id: usuario?.id || '',
        usuario_nome: usuario?.full_name || usuario?.email || '',
        shift_id: ocorrencia.shiftId,
        modelo_id: ocorrencia.modeloId,
        modelo_nome: ocorrencia.modeloNome,
        ocorrencia_data: ocorrencia.dateKey,
        tipo,
        entrada_solicitada:
          tipo === 'reducao' && entradaFinal ? new Date(entradaFinal).toISOString() : '',
        saida_solicitada:
          tipo === 'reducao' && saidaFinal ? new Date(saidaFinal).toISOString() : '',
        turno_inicio: new Date(ocorrencia.start).toISOString(),
        turno_fim: new Date(ocorrencia.end).toISOString(),
        antecedencia_horas: Number(antecedenciaHoras.toFixed(1)),
        fora_do_prazo: foraDoPrazo,
        motivo: motivo.trim(),
        status: 'pendente',
      };

      const criada = await base44.entities.SolicitacaoFolga.create(registro);
      const registroCompleto = { ...registro, id: criada?.id || '' };

      // Fora do prazo continua passando pela revisão do admin.
      // Dentro do prazo o pedido já entra aplicado na grade.
      let aprovadaNaHora = false;
      if (!foraDoPrazo) {
        try {
          await aplicarFolgaAprovada(base44, registroCompleto);
          await base44.entities.SolicitacaoFolga.update(criada.id, {
            status: 'aprovada',
            revisado_por: 'automático',
            revisado_em: new Date().toISOString(),
          });
          aprovadaNaHora = true;
        } catch (error) {
          console.warn('[Folga] aprovação automática indisponível', error);
        }
      }

      if (!aprovadaNaHora) {
        const turnoTexto = `${ocorrencia.modeloNome || 'turno'} em ${diaLongo(
          ocorrencia.start
        )}, ${horaDe(ocorrencia.start)}–${horaDe(ocorrencia.end)}`;
        const pedido =
          tipo === 'folga'
            ? `folga no turno de ${turnoTexto}`
            : `redução no turno de ${turnoTexto}, ficando ${horaDe(entradaFinal)}–${horaDe(saidaFinal)}`;
        const prazo = foraDoPrazo
          ? ` Pedido fora do prazo (faltavam ${Math.max(0, Math.floor(antecedenciaHoras))}h).`
          : '';
        const motivoTexto = motivo.trim() ? ` Motivo: ${motivo.trim()}` : '';

        await notificarAdminsSolicitacao(base44, {
          titulo: tipo === 'folga' ? 'Pedido de folga' : 'Pedido de redução',
          mensagem: `${usuario?.full_name || usuario?.email || 'Chatter'} pediu ${pedido}.${prazo}${motivoTexto}`,
          tipo: 'folga_pendente',
          extra: {
            folga_id: criada?.id || '',
            shift_id: ocorrencia.shiftId,
            ocorrencia_data: ocorrencia.dateKey,
          },
          solicitante: usuario,
        });
      }

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
        style={MODAL_CAIXA}
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

        <div
          style={{
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
            overflowY: 'auto',
          }}
          className="glass-scroll"
        >
          <GlassSelect
            label="Turno"
            value={selecionada}
            onChange={setSelecionada}
            placeholder={carregando ? 'Carregando…' : 'Você não tem turnos futuros'}
            options={ocorrencias.map((item) => ({
              value: item.chave,
              label: `${diaCurto(item.start)} · ${horaDe(item.start)}–${horaDe(item.end)}${
                item.modeloNome ? ` · ${item.modeloNome}` : ''
              }`,
            }))}
          />

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
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <DateTimePicker
                    value={entrada}
                    onChange={setEntrada}
                    mode="time"
                    label="Entrada"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <DateTimePicker value={saida} onChange={setSaida} mode="time" label="Saída" />
                </div>
              </div>
              <span style={{ fontSize: 11, color: erroHorario ? '#ff6b6b' : 'var(--c2)' }}>
                {erroHorario ||
                  (ocorrencia
                    ? `Turno das ${horaDe(ocorrencia.start)} às ${horaDe(ocorrencia.end)}.`
                    : '')}
              </span>
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
                <span style={rotulo}>Justificativa</span>
                <textarea
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder=""
                  maxLength={280}
                  style={{
                    ...AREA,
                    ...(faltaJustificativa
                      ? { border: '1px solid color-mix(in srgb, #e8b93b 55%, transparent)' }
                      : null),
                  }}
                />
                {faltaJustificativa && (
                  <span style={{ fontSize: 10.5, color: '#e8b93b' }}>
                    A justificativa é obrigatória para pedidos com menos de {PRAZO_HORAS}h.
                  </span>
                )}
              </div>
            </div>
          )}

          {!foraDoPrazo && ocorrencia && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.85 }}>
              Dentro do prazo de {PRAZO_HORAS}h: aplicado automaticamente, sem revisão.
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
              background: podeEnviar
                ? 'var(--c1)'
                : 'color-mix(in srgb, var(--c2) 22%, transparent)',
              color: podeEnviar ? 'var(--c8)' : 'var(--c2)',
              cursor: podeEnviar ? 'pointer' : 'default',
              opacity: salvando ? 0.6 : 1,
            }}
          >
            {salvando ? 'Enviando…' : 'Enviar pedido'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
