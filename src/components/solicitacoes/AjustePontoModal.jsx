import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import { base44 } from '@/api/base44Client';
import DateTimePicker from '@/components/DateTimePicker';
import GlassSelect from '@/components/GlassSelect';
import { CloseIcon, SlidersIcon } from '@/components/icons';
import { expandShift } from '@/lib/shiftRepeat';
import { isRecusado } from '@/lib/aceite';
import { clockLabel, localDateKey } from '@/lib/ponto';
import notificarAdminsSolicitacao from '@/lib/solicitacoes';
import aplicarAjustePonto from '@/lib/ajustePonto';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);
const DAY_MS = 86400000;
const DIAS_PARA_TRAS = 14;
const DIAS_PARA_FRENTE = 1;
// Entrada antecipada: turno que ainda vai começar também entra na lista.
const MARGEM_ENTRADA = 2 * 3600000;

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

const diaCurto = (ms) =>
  new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const horaDe = (ms) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Junta data escolhida + horário escolhido num Date. */
const juntar = (dia, hora) => {
  if (!dia || !hora) return null;
  const base = new Date(dia);
  base.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
  return base;
};

export default function AjustePontoModal({ usuario, onClose, onSaved }) {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [selecionada, setSelecionada] = useState('');
  const [registros, setRegistros] = useState([]);
  const [entrada, setEntrada] = useState(null);
  const [saida, setSaida] = useState(null);
  const [pausas, setPausas] = useState([]);
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
        const inicio = agora - DIAS_PARA_TRAS * DAY_MS;
        const fim = agora + DIAS_PARA_FRENTE * DAY_MS;
        const lista = asList(result)
          .filter((shift) => !isRecusado(shift))
          .flatMap((shift) => expandShift(shift, inicio, fim))
          // Inclui o turno que está rolando agora e o que começa em até 2h
          // (entrada batida antes da hora).
          .filter((occurrence) => occurrence.start <= agora + MARGEM_ENTRADA)
          .sort((a, b) => {
            const aAgora = a.start <= agora && a.end > agora ? 1 : 0;
            const bAgora = b.start <= agora && b.end > agora ? 1 : 0;
            if (aAgora !== bAgora) return bAgora - aAgora;
            return b.start - a.start;
          })
          .map((occurrence) => ({
            chave: `${occurrence.shift.id}|${localDateKey(occurrence.start)}`,
            shiftId: occurrence.shift.id,
            dateKey: localDateKey(occurrence.start),
            modeloId: occurrence.shift.modelo_id || '',
            modeloNome: occurrence.shift.modelo_nome || '',
            start: occurrence.start,
            end: occurrence.end,
            andamento: occurrence.start <= agora && occurrence.end > agora,
            aSeguir: occurrence.start > agora,
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

  useEffect(() => {
    if (!ocorrencia) return undefined;
    let ativo = true;
    setRegistros([]);
    setEntrada(null);
    setSaida(null);
    setPausas([]);
    base44.entities.RegistroPonto.filter(
      { shift_id: ocorrencia.shiftId, ocorrencia_data: ocorrencia.dateKey },
      { sort: 'timestamp', limit: 50 }
    )
      .then((result) => {
        if (!ativo) return;
        const lista = asList(result);
        setRegistros(lista);
        const entradaAtual = lista.find((registro) => registro.tipo === 'entrada');
        const saidaAtual = [...lista].reverse().find((registro) => registro.tipo === 'saida');
        if (entradaAtual?.timestamp) setEntrada(new Date(entradaAtual.timestamp));
        if (saidaAtual?.timestamp) setSaida(new Date(saidaAtual.timestamp));

        // Cada pausa é seguida pelo retorno. Pausa sem retorno fica com fim vazio.
        const pares = [];
        let aberta = null;
        lista.forEach((registro) => {
          if (registro.tipo === 'pausa') {
            if (aberta) pares.push(aberta);
            aberta = {
              pausaId: registro.id,
              retornoId: '',
              inicio: registro.timestamp ? new Date(registro.timestamp) : null,
              fim: null,
              inicioOriginal: registro.timestamp ? new Date(registro.timestamp).getTime() : null,
              fimOriginal: null,
            };
          } else if (registro.tipo === 'retorno' && aberta) {
            aberta.retornoId = registro.id;
            aberta.fim = registro.timestamp ? new Date(registro.timestamp) : null;
            aberta.fimOriginal = registro.timestamp ? new Date(registro.timestamp).getTime() : null;
            pares.push(aberta);
            aberta = null;
          }
        });
        if (aberta) pares.push(aberta);
        setPausas(pares);
      })
      .catch(() => setRegistros([]));
    return () => {
      ativo = false;
    };
  }, [ocorrencia]);

  const entradaAtual = registros.find((registro) => registro.tipo === 'entrada');
  const saidaAtual = [...registros].reverse().find((registro) => registro.tipo === 'saida');

  const entradaFinal = entrada ? juntar(ocorrencia ? new Date(ocorrencia.start) : null, entrada) : null;
  // Turno que vira a noite: saída com horário menor que a entrada cai no dia seguinte.
  const saidaFinal = (() => {
    if (!saida || !ocorrencia) return null;
    const base = juntar(new Date(ocorrencia.start), saida);
    if (base && entradaFinal && base.getTime() <= entradaFinal.getTime()) {
      return new Date(base.getTime() + DAY_MS);
    }
    return base;
  })();

  // Pausa usa o mesmo dia do turno; se o horário vier antes do início, cai no dia seguinte.
  const inicioDaPausa = (item) => {
    if (!ocorrencia || !item?.inicio) return null;
    return juntar(new Date(ocorrencia.start), item.inicio);
  };

  const fimDaPausa = (item) => {
    if (!ocorrencia || !item?.fim) return null;
    const base = juntar(new Date(ocorrencia.start), item.fim);
    const inicio = inicioDaPausa(item);
    if (base && inicio && base.getTime() <= inicio.getTime()) {
      return new Date(base.getTime() + DAY_MS);
    }
    return base;
  };

  const pausaInvalida = pausas.some((item) => {
    if (!item.inicio) return true;
    const inicio = inicioDaPausa(item);
    const fim = fimDaPausa(item);
    if (item.fim && !fim) return true;
    if (inicio && fim && fim.getTime() <= inicio.getTime()) return true;
    return false;
  });

  const alterarPausa = (indice, campo, valor) => {
    setPausas((atual) =>
      atual.map((item, posicao) => (posicao === indice ? { ...item, [campo]: valor } : item))
    );
  };

  const pausaMudou = (item) => {
    const inicio = inicioDaPausa(item);
    const fim = fimDaPausa(item);
    if (item.inicio && !inicio) return true;
    if (item.fim && !fim) return true;
    if (inicio && (!item.inicioOriginal || inicio.getTime() !== item.inicioOriginal)) return true;
    if (fim && (!item.fimOriginal || fim.getTime() !== item.fimOriginal)) return true;
    return false;
  };

  const pausasMudaram = pausas.some(pausaMudou);

  const entradaMudou =
    !!entradaFinal &&
    (!entradaAtual || entradaFinal.getTime() !== new Date(entradaAtual.timestamp).getTime());
  const saidaMudou =
    !!saidaFinal &&
    (!saidaAtual || saidaFinal.getTime() !== new Date(saidaAtual.timestamp).getTime());

  const mudouAlgo = !!ocorrencia && (entradaMudou || saidaMudou || pausasMudaram);

  const podeEnviar =
    !!ocorrencia && !!mudouAlgo && !pausaInvalida && motivo.trim().length >= 3 && !salvando;

  // Qualquer turno listado aqui aplica a correção na hora, sem esperar o admin.
  const aplicarNaHora = !!ocorrencia;

  const enviar = async () => {
    if (!podeEnviar) return;
    setSalvando(true);
    setErro('');
    try {
      const criado = await base44.entities.AjustePonto.create({
        usuario_id: usuario?.id || '',
        usuario_nome: usuario?.full_name || usuario?.email || '',
        shift_id: ocorrencia.shiftId,
        modelo_id: ocorrencia.modeloId,
        modelo_nome: ocorrencia.modeloNome,
        ocorrencia_data: ocorrencia.dateKey,
        entrada_atual: entradaAtual?.timestamp || '',
        saida_atual: saidaAtual?.timestamp || '',
        entrada_solicitada: entradaFinal ? entradaFinal.toISOString() : '',
        saida_solicitada: saidaFinal ? saidaFinal.toISOString() : '',
        pausas_atuais: pausas.map((item) => ({
          pausa_id: item.pausaId,
          retorno_id: item.retornoId,
          inicio: item.inicioOriginal ? new Date(item.inicioOriginal).toISOString() : '',
          fim: item.fimOriginal ? new Date(item.fimOriginal).toISOString() : '',
        })),
        pausas_solicitadas: pausas.map((item) => ({
          pausa_id: item.pausaId,
          retorno_id: item.retornoId,
          inicio: inicioDaPausa(item) ? inicioDaPausa(item).toISOString() : '',
          fim: fimDaPausa(item) ? fimDaPausa(item).toISOString() : '',
        })),
        motivo: motivo.trim(),
        status: 'pendente',
      });

      // Turno em andamento: aplica agora e marca o pedido como aprovado.
      let aplicadoNaHora = false;
      if (aplicarNaHora) {
        try {
          await aplicarAjustePonto(base44, {
            ocorrencia,
            registros,
            entrada: entradaMudou ? entradaFinal : null,
            saida: saidaMudou ? saidaFinal : null,
            pausas: pausas.filter(pausaMudou).map((item) => ({
              pausaId: item.pausaId,
              retornoId: item.retornoId,
              inicio: inicioDaPausa(item),
              fim: fimDaPausa(item),
            })),
            usuario,
            fecharTurno: !!saidaFinal,
          });
          aplicadoNaHora = true;
          if (criado?.id) {
            await base44.entities.AjustePonto.update(criado.id, { status: 'aprovado' });
          }
        } catch (error) {
          console.warn('[AjustePonto] não consegui aplicar na hora', error);
        }
      }

      const pedacos = [];
      if (entradaFinal) pedacos.push(`entrada ${clockLabel(entradaFinal.toISOString())}`);
      if (saidaFinal) pedacos.push(`saída ${clockLabel(saidaFinal.toISOString())}`);
      pausas.forEach((item, indice) => {
        if (!pausaMudou(item)) return;
        const inicio = inicioDaPausa(item);
        const fim = fimDaPausa(item);
        if (!inicio) return;
        const de = `${clockLabel(
          item.inicioOriginal ? new Date(item.inicioOriginal).toISOString() : ''
        )}–${item.fimOriginal ? clockLabel(new Date(item.fimOriginal).toISOString()) : 'sem retorno'}`;
        const para = `${clockLabel(inicio.toISOString())}–${fim ? clockLabel(fim.toISOString()) : 'sem retorno'}`;
        pedacos.push(`pausa ${indice + 1} ${de} para ${para}`);
      });

      const quem = usuario?.full_name || usuario?.email || 'Chatter';
      const extra = {
        ajuste_ponto_id: criado?.id || '',
        shift_id: ocorrencia.shiftId,
        ocorrencia_data: ocorrencia.dateKey,
        modelo_id: ocorrencia.modeloId || '',
        modelo_nome: ocorrencia.modeloNome || '',
      };
      const detalhe = `${ocorrencia.modeloNome || 'um turno'} (${diaCurto(ocorrencia.start)}): ${
        pedacos.join(' e ') || 'sem horário novo'
      }. Motivo: ${motivo.trim()}`;

      if (aplicadoNaHora) {
        // Aviso informativo: já foi aplicado no turno em andamento.
        await notificarAdminsSolicitacao(base44, {
          titulo: 'Ponto corrigido na hora',
          mensagem: `${quem} corrigiu o turno em andamento de ${detalhe}`,
          tipo: 'ajuste_ponto_aplicado',
          extra,
          solicitante: usuario,
        });
      } else {
        await notificarAdminsSolicitacao(base44, {
          titulo: 'Ajuste de ponto',
          mensagem: `${quem} pediu ajuste em ${detalhe}`,
          tipo: 'ajuste_ponto_pendente',
          extra,
          solicitante: usuario,
        });
      }

      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      const mensagem = String(error?.message || '');
      setErro(
        /not found|does not exist|schema/i.test(mensagem)
          ? 'A entidade AjustePonto ainda não existe no app. Publique para sincronizar.'
          : mensagem || 'Não consegui registrar o ajuste.'
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
        aria-label="Ajuste de ponto"
        style={MODAL_CAIXA}
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
            <SlidersIcon size={14} />
            Ajuste de ponto
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
          className="glass-scroll"
          style={{
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          <GlassSelect
            label="Turno"
            value={selecionada}
            onChange={setSelecionada}
            placeholder={carregando ? 'Carregando…' : 'Nenhum turno nos últimos dias'}
            options={ocorrencias.map((item) => ({
              value: item.chave,
              label: `${diaCurto(item.start)} · ${horaDe(item.start)}–${horaDe(item.end)}${
                item.modeloNome ? ` · ${item.modeloNome}` : ''
              }${item.andamento ? ' · em andamento' : item.aSeguir ? ' · a seguir' : ''}`,
            }))}
          />

          {ocorrencia && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'color-mix(in srgb, var(--c1) 7%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c1) 16%, transparent)',
                fontSize: 11,
                color: 'var(--c2)',
              }}
            >
              <span>
                Entrada registrada:{' '}
                <span style={{ color: 'var(--c3)' }}>{clockLabel(entradaAtual?.timestamp)}</span>
              </span>
              <span>
                Saída registrada:{' '}
                <span style={{ color: 'var(--c3)' }}>
                  {saidaAtual?.timestamp ? clockLabel(saidaAtual.timestamp) : 'ainda não'}
                </span>
              </span>
              {ocorrencia?.andamento && (
                <span style={{ color: '#7bd88f' }}>
                  Turno em andamento: a correção entra na hora, sem passar pelo admin.
                </span>
              )}
              {ocorrencia?.aSeguir && (
                <span style={{ color: '#e8b93b' }}>
                  O turno ainda não começou. A correção também entra na hora, sem passar pelo admin.
                </span>
              )}
              {pausas.length > 0 && (
                <span>
                  Pausas:{' '}
                  <span style={{ color: 'var(--c3)' }}>
                    {pausas
                      .map((item) => {
                        const inicio = inicioDaPausa(item);
                        const fim = fimDaPausa(item);
                        return `${inicio ? clockLabel(inicio.toISOString()) : '--'}–${
                          fim ? clockLabel(fim.toISOString()) : 'aberta'
                        }`;
                      })
                      .join(' · ')}
                  </span>
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <DateTimePicker
                value={entrada}
                onChange={setEntrada}
                mode="time"
                label="Entrada correta"
                digitavel
              />
            </div>
            <div style={{ flex: 1 }}>
              <DateTimePicker
                value={saida}
                onChange={setSaida}
                mode="time"
                label="Saída correta"
                digitavel
              />
            </div>
          </div>

          {ocorrencia && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={rotulo}>Pausas do turno</span>
              {pausas.length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--c2)' }}>
                  Nenhuma pausa registrada nesse turno.
                </span>
              )}
              {pausas.map((item, indice) => (
                <div
                  key={item.pausaId || indice}
                  style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}
                >
                  <span
                    style={{
                      width: 46,
                      flexShrink: 0,
                      fontSize: 10,
                      color: 'var(--c2)',
                      paddingBottom: 10,
                    }}
                  >
                    {`Pausa ${indice + 1}`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <DateTimePicker
                      value={item.inicio}
                      onChange={(valor) => alterarPausa(indice, 'inicio', valor)}
                      mode="time"
                      label="Início"
                      digitavel
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <DateTimePicker
                      value={item.fim}
                      onChange={(valor) => alterarPausa(indice, 'fim', valor)}
                      mode="time"
                      label="Retorno"
                      digitavel
                    />
                  </div>
                </div>
              ))}
              {pausaInvalida && (
                <span style={{ fontSize: 10.5, color: '#e8b93b' }}>
                  O retorno da pausa precisa ser depois do início.
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Motivo</span>
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="O que aconteceu com esse ponto?"
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
            {salvando ? 'Enviando…' : aplicarNaHora ? 'Aplicar ajuste' : 'Pedir ajuste'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
