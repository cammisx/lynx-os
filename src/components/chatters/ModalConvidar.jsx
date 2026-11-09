import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import GlassSelect from '@/components/GlassSelect';
import DateTimePicker, { formatDateKey } from '@/components/DateTimePicker';
import RepeatFields from '@/components/shifts/RepeatFields';
import { daysLabel, sortDays } from '@/lib/shiftRepeat';
import { useIsMobile } from '@/hooks/use-mobile';
import { CheckIcon, CloseIcon, PlusIcon } from '@/components/icons';

const rotulo = {
  fontSize: 9.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

const campo = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  outline: 'none',
  boxSizing: 'border-box',
};

const bloco = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '10px 11px',
  borderRadius: 10,
  border: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 38%, transparent)',
};

const emailValido = (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor || '').trim());

/** Margem pra não brigar com o relógio enquanto a pessoa salva. */
const TOLERANCIA_PASSADO_MS = 5 * 60 * 1000;

const atHour = (data, hora) => {
  const base = new Date(data);
  base.setHours(hora, 0, 0, 0);
  return base;
};

const uid = () => Math.random().toString(36).slice(2, 9);

const novoTurno = (modeloId = '') => {
  const base = new Date();
  return {
    uid: uid(),
    modelo_id: modeloId,
    recorrente: false,
    inicio: atHour(base, 8),
    fim: atHour(base, 16),
    dias: [],
    repetirAte: null,
  };
};

/**
 * Convite completo: quem é, com que cargo entra, em quais modelos (com o ID de
 * centavos de cada uma) e quais turnos já nascem junto com a conta.
 *
 * Nada é criado aqui: o modal só junta e valida; a janela de Chatters grava o
 * convite e o Base44 manda o e-mail.
 */
export default function ModalConvidar({ modelos = [], onFechar, onEnviar }) {
  const pequeno = useIsMobile();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('user');
  const [vinculos, setVinculos] = useState({});
  const [turnos, setTurnos] = useState([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape' && !enviando) onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar, enviando]);

  const modelosAtivas = useMemo(
    () => (Array.isArray(modelos) ? modelos.filter((modelo) => !modelo?.arquivada) : []),
    [modelos]
  );

  const opcoesModelo = modelosAtivas.map((modelo) => ({ value: modelo.id, label: modelo.nome }));

  const usadosNaModelo = (modeloId) => {
    const modelo = modelosAtivas.find((item) => item.id === modeloId);
    const usados = (modelo?.chatters || [])
      .map((membro) => String(membro?.identificador || '').trim())
      .filter(Boolean);
    return usados.length ? `IDs em uso nesta modelo: ${usados.join(', ')}` : 'Nenhum ID em uso nesta modelo.';
  };

  const alternarModelo = (modeloId) => {
    setVinculos((prev) => {
      const proximo = { ...prev };
      if (modeloId in proximo) delete proximo[modeloId];
      else proximo[modeloId] = '';
      return proximo;
    });
  };

  const definirId = (modeloId, valor) => {
    setVinculos((prev) => ({ ...prev, [modeloId]: String(valor).replace(/\D+/g, '').slice(0, 2) }));
  };

  const atualizarTurno = (id, patch) => {
    setTurnos((prev) => prev.map((turno) => (turno.uid === id ? { ...turno, ...patch } : turno)));
  };

  const montarPayload = () => {
    const escolhidas = Object.entries(vinculos).map(([modeloId, identificador]) => {
      const modelo = modelosAtivas.find((item) => item.id === modeloId);
      return { modelo_id: modeloId, modelo_nome: modelo?.nome || '', identificador };
    });

    return {
      nome: nome.trim(),
      email: email.trim(),
      cargo,
      modelos: escolhidas,
      turnos: turnos.map((turno) => {
        const modelo = modelosAtivas.find((item) => item.id === turno.modelo_id);
        const dias = turno.recorrente ? sortDays(turno.dias) : [];
        return {
          modelo_id: turno.modelo_id,
          modelo_nome: modelo?.nome || '',
          inicio: turno.inicio ? turno.inicio.toISOString() : null,
          fim: turno.fim ? turno.fim.toISOString() : null,
          recorrente: turno.recorrente,
          dias_semana: dias,
          repetir_ate:
            turno.recorrente && turno.repetirAte ? formatDateKey(turno.repetirAte) : null,
        };
      }),
    };
  };

  const validar = () => {
    if (!nome.trim()) return 'Diz o nome de quem você quer convidar.';
    if (!emailValido(email)) return 'Esse e-mail não parece certo.';

    for (const [modeloId, identificador] of Object.entries(vinculos)) {
      if (!identificador) continue;
      const modelo = modelosAtivas.find((item) => item.id === modeloId);
      const ocupados = (modelo?.chatters || [])
        .map((membro) => String(membro?.identificador || '').trim())
        .filter(Boolean);
      if (ocupados.includes(identificador)) {
        return `O ID ${identificador} já está em uso em ${modelo?.nome || 'uma das modelos'}.`;
      }
    }

    for (let index = 0; index < turnos.length; index += 1) {
      const turno = turnos[index];
      const numero = index + 1;
      if (!turno.modelo_id) return `Escolha a modelo do turno ${numero}.`;
      if (!turno.inicio || !turno.fim) return `Informe início e fim do turno ${numero}.`;
      if (turno.fim.getTime() <= turno.inicio.getTime()) {
        return `O fim do turno ${numero} precisa ser depois do início.`;
      }
      /* A conta pode demorar a ser criada: turno que começa no passado não
         entra, senão nasceria marcado e sem nenhum registro de ponto. */
      if (turno.inicio.getTime() < Date.now() - TOLERANCIA_PASSADO_MS) {
        return `O turno ${numero} não pode começar no passado. Escolha uma data daqui pra frente.`;
      }
      if (turno.recorrente && sortDays(turno.dias).length === 0) {
        return `Marque ao menos um dia da semana no turno ${numero} (ou deixe como turno único).`;
      }
      if (turno.recorrente && turno.repetirAte) {
        const limite = new Date(
          turno.repetirAte.getFullYear(),
          turno.repetirAte.getMonth(),
          turno.repetirAte.getDate(),
          23,
          59,
          59
        );
        if (!(limite.getTime() > turno.inicio.getTime())) {
          return `A data de repetição do turno ${numero} precisa ser depois do início.`;
        }
      }
    }

    return '';
  };

  const enviar = async () => {
    if (enviando) return;
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro('');
    setEnviando(true);
    const resultado = await onEnviar(montarPayload());
    setEnviando(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    onFechar();
  };

  const resumoTurno = (turno) => {
    if (!turno.recorrente) return 'Turno único, só na data de início';
    const dias = sortDays(turno.dias);
    return dias.length ? `Toda semana: ${daysLabel(dias)}` : 'Marque os dias da semana';
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        background: 'rgba(0,0,0,0.42)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !enviando) onFechar();
      }}
    >
      <div style={{ ...MODAL_CAIXA, width: pequeno ? '100%' : 560, maxHeight: pequeno ? '92vh' : '88vh' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--c1)' }}>Convidar pessoa</span>
          <button
            type="button"
            onClick={onFechar}
            disabled={enviando}
            aria-label="Fechar"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              fontSize: 13,
              cursor: enviando ? 'default' : 'pointer',
              padding: 2,
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="glass-scroll"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 14,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Nome de exibição</span>
            <input
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Como a pessoa aparece no app"
              autoFocus
              style={campo}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>E-mail</span>
            <input
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="nome@email.com"
              inputMode="email"
              type="email"
              style={campo}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Cargo</span>
            <GlassSelect
              value={cargo}
              onChange={setCargo}
              options={[
                { value: 'user', label: 'Chatter' },
                { value: 'admin', label: 'Admin' },
              ]}
              placeholder="Escolha o cargo"
            />
            <span style={{ fontSize: 9.5, color: 'var(--c2)', lineHeight: 1.5 }}>
              {cargo === 'admin'
                ? 'Admin recebe o convite de admin e entra como chatter de todas as modelos.'
                : 'Chatter entra só nas modelos escolhidas abaixo.'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={rotulo}>Modelos e IDs</span>
            {modelosAtivas.length === 0 ? (
              <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.75 }}>
                Nenhuma modelo ativa para vincular agora.
              </span>
            ) : (
              modelosAtivas.map((modelo) => {
                const marcado = modelo.id in vinculos;
                return (
                  <div key={modelo.id} style={{ ...bloco, gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => alternarModelo(modelo.id)}
                        aria-pressed={marcado}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          border: marcado
                            ? '1px solid color-mix(in srgb, var(--c1) 55%, transparent)'
                            : '1px solid color-mix(in srgb, var(--c2) 26%, transparent)',
                          background: marcado
                            ? 'color-mix(in srgb, var(--c1) 22%, transparent)'
                            : 'transparent',
                          color: 'var(--c1)',
                          padding: 0,
                        }}
                      >
                        {marcado ? <CheckIcon size={11} /> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => alternarModelo(modelo.id)}
                        style={{
                          flex: 1,
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-main)',
                          fontSize: 11.5,
                          fontWeight: marcado ? 700 : 500,
                          color: marcado ? 'var(--c3)' : 'var(--c2)',
                        }}
                      >
                        {modelo.nome}
                      </button>
                      {marcado ? (
                        <input
                          value={vinculos[modelo.id] || ''}
                          onChange={(evento) => definirId(modelo.id, evento.target.value)}
                          placeholder="ID"
                          inputMode="numeric"
                          maxLength={2}
                          aria-label={`ID de centavos em ${modelo.nome}`}
                          style={{
                            ...campo,
                            width: 56,
                            flexShrink: 0,
                            textAlign: 'center',
                            padding: '6px 4px',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        />
                      ) : null}
                    </div>
                    {marcado ? (
                      <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.8, paddingLeft: 28 }}>
                        {usadosNaModelo(modelo.id)}
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={rotulo}>Turnos</span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() =>
                  setTurnos((prev) => [...prev, novoTurno(prev[0]?.modelo_id || modelosAtivas[0]?.id || '')])
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 9px',
                  borderRadius: 7,
                  border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
                  background: 'transparent',
                  color: 'var(--c3)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                <PlusIcon size={10} />
                Adicionar turno
              </button>
            </div>

            {turnos.length === 0 ? (
              <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.75 }}>
                Sem turno no convite: a pessoa entra sem escala e você monta depois em Turnos.
              </span>
            ) : null}

            {turnos.map((turno, index) => (
              <div key={turno.uid} style={bloco}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c1)' }}>
                    Turno {index + 1}
                  </span>
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    onClick={() => setTurnos((prev) => prev.filter((item) => item.uid !== turno.uid))}
                    aria-label={`Remover turno ${index + 1}`}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--c2)',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                    }}
                  >
                    <CloseIcon size={11} />
                  </button>
                </div>

                <GlassSelect
                  value={turno.modelo_id}
                  onChange={(valor) => atualizarTurno(turno.uid, { modelo_id: valor })}
                  options={opcoesModelo}
                  placeholder="Modelo do turno"
                  emptyText="Nenhuma modelo ativa."
                />

                <GlassSelect
                  value={turno.recorrente ? 'semanal' : 'unico'}
                  onChange={(valor) =>
                    atualizarTurno(turno.uid, {
                      recorrente: valor === 'semanal',
                      dias: valor === 'semanal' ? turno.dias : [],
                    })
                  }
                  options={[
                    { value: 'unico', label: 'Turno único (só nessa data)' },
                    { value: 'semanal', label: 'Toda semana' },
                  ]}
                />

                <div style={{ display: 'flex', gap: 8, flexWrap: pequeno ? 'wrap' : undefined }}>
                  <div style={{ flex: 1, minWidth: pequeno ? '100%' : 0 }}>
                    <DateTimePicker
                      label="Início"
                      value={turno.inicio}
                      onChange={(valor) => atualizarTurno(turno.uid, { inicio: valor })}
                      mode="datetime"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: pequeno ? '100%' : 0 }}>
                    <DateTimePicker
                      label="Fim"
                      value={turno.fim}
                      onChange={(valor) => atualizarTurno(turno.uid, { fim: valor })}
                      mode="datetime"
                    />
                  </div>
                </div>

                {turno.recorrente ? (
                  <RepeatFields
                    dias={turno.dias}
                    repetirAte={turno.repetirAte}
                    onToggleDia={(dia) =>
                      atualizarTurno(turno.uid, {
                        dias: turno.dias.includes(dia)
                          ? turno.dias.filter((item) => item !== dia)
                          : [...turno.dias, dia],
                      })
                    }
                    onRepetirAteChange={(valor) => atualizarTurno(turno.uid, { repetirAte: valor })}
                  />
                ) : (
                  <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.75 }}>
                    {resumoTurno(turno)}
                  </span>
                )}

                {turno.recorrente && sortDays(turno.dias).length > 0 ? (
                  <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.8 }}>
                    {daysLabel(turno.dias)}
                    {turno.repetirAte
                      ? ` até ${formatDateKey(turno.repetirAte).split('-').reverse().join('/')}`
                      : ' sem prazo para acabar'}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          {erro ? <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{erro}</span> : null}

          <span style={{ fontSize: 9.5, color: 'var(--c2)', lineHeight: 1.5 }}>
            O Base44 manda o convite por e-mail. Quando a pessoa criar a conta, o sistema aplica sozinho o
            cargo, as modelos com os IDs e os turnos.
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '11px 14px',
            borderTop: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <button
            type="button"
            onClick={onFechar}
            disabled={enviando}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
              background: 'transparent',
              color: 'var(--c3)',
              fontFamily: 'var(--font-main)',
              fontSize: 10.5,
              cursor: enviando ? 'default' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
              background: 'color-mix(in srgb, var(--c1) 16%, transparent)',
              color: 'var(--c1)',
              fontFamily: 'var(--font-main)',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: enviando ? 'default' : 'pointer',
              opacity: enviando ? 0.7 : 1,
            }}
          >
            {enviando ? 'Enviando…' : 'Enviar convite'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
