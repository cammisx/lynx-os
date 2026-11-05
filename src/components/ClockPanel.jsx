import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { CHATTERS_CHANGED, MODELS_CHANGED, SHIFTS_CHANGED } from '@/lib/desktopEvents';
import { buildChatterNames } from '@/lib/chatterNames';
import { expandShift } from '@/lib/shiftRepeat';
import { isRecusado } from '@/lib/aceite';
import {
  buildPontoIndex,
  clockLabel,
  localDateKey,
  occurrenceKey,
} from '@/lib/ponto';
import ShiftWidget from '@/components/shifts/ShiftWidget';
import WeekToolbar from '@/components/shifts/WeekToolbar';
import WeekGrid from '@/components/shifts/WeekGrid';

const DAY_MS = 86400000;
const REFRESH_MS = 15000;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const shortDate = (date) =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

export default function ClockPanel({ open, onClose, anchorRef, notificacoes = [], onOpenJustificativa }) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [weekShifts, setWeekShifts] = useState([]);
  const [ownShifts, setOwnShifts] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [models, setModels] = useState([]);
  const [chatters, setChatters] = useState([]);
  const [activeTab, setActiveTab] = useState('agenda');
  const [saving, setSaving] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [tick, setTick] = useState(0);
  const [modelsVersion, setModelsVersion] = useState(0);
  const [chattersVersion, setChattersVersion] = useState(0);
  const panelRef = useRef(null);
  const feedbackTimer = useRef(null);
  const userId = user?.id;

  useEffect(() => {
    if (!open) return undefined;
    const handleDown = (event) => {
      if (panelRef.current && panelRef.current.contains(event.target)) return;
      if (anchorRef && anchorRef.current && anchorRef.current.contains(event.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  useEffect(() => {
    if (!open) return undefined;
    const handleModelsChanged = () => {
      setModelsVersion((n) => n + 1);
      setTick((n) => n + 1);
    };
    const handleChattersChanged = () => {
      setChattersVersion((n) => n + 1);
      setTick((n) => n + 1);
    };
    window.addEventListener(MODELS_CHANGED, handleModelsChanged);
    window.addEventListener(CHATTERS_CHANGED, handleChattersChanged);
    return () => {
      window.removeEventListener(MODELS_CHANGED, handleModelsChanged);
      window.removeEventListener(CHATTERS_CHANGED, handleChattersChanged);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleShiftsChanged = () => setTick((n) => n + 1);
    window.addEventListener(SHIFTS_CHANGED, handleShiftsChanged);
    return () => window.removeEventListener(SHIFTS_CHANGED, handleShiftsChanged);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    base44.entities.Modelo.list()
      .then((result) => {
        if (active) setModels(asList(result));
      })
      .catch(() => {
        if (active) setModels([]);
      });
    return () => {
      active = false;
    };
  }, [open, modelsVersion]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    base44.entities.Chatter.list()
      .then((result) => {
        if (active) setChatters(asList(result));
      })
      .catch(() => {
        if (active) setChatters([]);
      });
    return () => {
      active = false;
    };
  }, [open, chattersVersion]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const weekEnd = new Date(anchor.getTime() + 7 * DAY_MS);
    Promise.all([
      base44.entities.Shift.filter({
        inicio: { $lt: weekEnd.toISOString() },
        fim: { $gt: anchor.toISOString() },
      }),
      base44.entities.Shift.filter({
        dias_semana: { $exists: true },
        inicio: { $lt: weekEnd.toISOString() },
      }),
    ])
      .then(([weekResult, repeatResult]) => {
        if (!active) return;
        const merged = new Map();
        asList(weekResult).forEach((shift) => merged.set(shift.id, shift));
        asList(repeatResult).forEach((shift) => merged.set(shift.id, shift));
        setWeekShifts([...merged.values()]);
      })
      .catch(() => {
        if (active) setWeekShifts([]);
      });
    return () => {
      active = false;
    };
  }, [open, anchor, tick]);

  useEffect(() => {
    if (!open || !userId) return undefined;
    let active = true;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    base44.entities.Shift.filter(
      { usuario_id: userId, fim: { $gte: monthStart.toISOString() } },
      { sort: 'inicio', limit: 100 }
    )
      .then((result) => {
        if (active) setOwnShifts(asList(result));
      })
      .catch(() => {
        if (active) setOwnShifts([]);
      });
    return () => {
      active = false;
    };
  }, [open, userId, tick]);

  useEffect(() => {
    if (!open || !userId) return undefined;
    let active = true;
    base44.entities.RegistroPonto.filter(
      { usuario_id: userId },
      { sort: '-timestamp', limit: 200 }
    )
      .then((result) => {
        if (active) setRegistros(asList(result));
      })
      .catch(() => {
        if (active) setRegistros([]);
      });
    return () => {
      active = false;
    };
  }, [open, userId, tick]);

  const chatterNames = useMemo(() => buildChatterNames(chatters), [chatters]);

  const visibleModels = useMemo(() => {
    const isAdmin = user?.role === 'admin';
    return models.filter(
      (model) =>
        !model.arquivada &&
        (isAdmin || (model.chatters || []).some((chatter) => chatter.usuario_id === userId))
    );
  }, [models, user, userId]);

  const archivedModels = useMemo(() => models.filter((model) => model.arquivada), [models]);

  const pontoIndex = useMemo(() => buildPontoIndex(registros), [registros]);

  const openEntries = useMemo(
    () =>
      Object.values(pontoIndex)
        .filter((entry) => entry.entrada && !entry.saida)
        .sort((a, b) => b.entrada - a.entrada)
        .map((entry) => ({
          shiftId: entry.shiftId,
          dateKey: entry.dateKey,
          modeloId: entry.modeloId,
          modeloNome: entry.modeloNome,
          entradaAt: entry.entrada,
          pausaAbertaAt: entry.pausaAberta,
          pausasMs: entry.pausasMs,
        })),
    [pontoIndex]
  );

  const ponto = useMemo(() => {
    const activeEntry = openEntries[0];
    if (activeEntry) {
      return {
        ...activeEntry,
        mode: activeEntry.pausaAbertaAt ? 'pausa' : 'ativo',
      };
    }

    const now = Date.now();
    const windowStart = startOfDay(new Date()).getTime();
    const windowEnd = windowStart + 7 * DAY_MS;
    const archivedIds = new Set(
      models.filter((model) => model.arquivada).map((model) => model.id)
    );

    const next = ownShifts
      .filter((shift) => !archivedIds.has(shift.modelo_id))
      .filter((shift) => !isRecusado(shift))
      .flatMap((shift) => expandShift(shift, windowStart, windowEnd))
      .filter((occurrence) => occurrence.end > now)
      .sort((a, b) => a.start - b.start)
      .find((occurrence) => {
        const dateKey = localDateKey(occurrence.start);
        const entry = pontoIndex[occurrenceKey(occurrence.shift.id, dateKey)];
        return !entry || !entry.entrada;
      });

    if (!next) return { mode: 'livre' };

    return {
      mode: 'proximo',
      start: next.start,
      shiftId: next.shift.id,
      dateKey: localDateKey(next.start),
      modeloId: next.shift.modelo_id || '',
      modeloNome: next.shift.modelo_nome || '',
    };
  }, [openEntries, ownShifts, models, pontoIndex]);

  const justificativaPendente = useMemo(
    () =>
      notificacoes.find(
        (notification) => notification.tipo === 'turno_esquecido' && notification.status === 'pendente'
      ) || null,
    [notificacoes]
  );

  const showFeedback = (text, error = false) => {
    setFeedback({ text, error });
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2000);
  };

  const createRegistro = (occurrence, tipo, timestamp) =>
    base44.entities.RegistroPonto.create({
      shift_id: occurrence.shiftId,
      ocorrencia_data: occurrence.dateKey,
      usuario_id: userId,
      usuario_nome: chatterNames[userId] || user?.full_name || '',
      modelo_id: occurrence.modeloId || '',
      modelo_nome: occurrence.modeloNome || '',
      tipo,
      timestamp,
    });

  const closeOccurrence = async (occurrence) => {
    const timestamp = new Date().toISOString();
    if (occurrence.pausaAbertaAt) await createRegistro(occurrence, 'retorno', timestamp);
    await createRegistro(occurrence, 'saida', timestamp);
    await base44.entities.Shift.update(occurrence.shiftId, {
      status: 'concluido',
      fim_real: timestamp,
    });
    return timestamp;
  };

  const punch = async (tipo) => {
    if (!userId || saving) return;
    const activeEntry = openEntries[0] || null;

    if (tipo !== 'entrada' && !activeEntry) {
      showFeedback('Registre a entrada primeiro', true);
      return;
    }

    setSaving(tipo);
    try {
      if (tipo === 'entrada') {
        for (const previous of openEntries) {
          await closeOccurrence(previous);
        }
        const timestamp = new Date().toISOString();
        await createRegistro(ponto, 'entrada', timestamp);
        await base44.entities.Shift.update(ponto.shiftId, {
          status: 'em_andamento',
          inicio_real: timestamp,
        });
        showFeedback(`Entrada registrada às ${clockLabel(timestamp)}`);
      } else if (tipo === 'pausa') {
        const timestamp = new Date().toISOString();
        await createRegistro(activeEntry, 'pausa', timestamp);
        showFeedback(`Pausa registrada às ${clockLabel(timestamp)}`);
      } else if (tipo === 'retorno') {
        const timestamp = new Date().toISOString();
        await createRegistro(activeEntry, 'retorno', timestamp);
        showFeedback(`Retorno registrado às ${clockLabel(timestamp)}`);
      } else if (tipo === 'saida') {
        const timestamp = await closeOccurrence(activeEntry);
        showFeedback(`Turno encerrado às ${clockLabel(timestamp)}`);
      }
      setTick((n) => n + 1);
    } finally {
      setSaving(null);
    }
  };

  if (!open) return null;

  const tabs = [
    { id: 'agenda', label: 'Minha Agenda' },
    ...visibleModels.map((model) => ({ id: model.id, label: model.nome })),
  ];
  const activeTabSafe = tabs.some((tab) => tab.id === activeTab) ? activeTab : 'agenda';

  const gridShifts = (() => {
    const base = weekShifts.filter((shift) => {
      if (isRecusado(shift)) return false;
      if (archivedModels.some((model) => model.id === shift.modelo_id)) return false;
      if (!shift.modelo_id) {
        return !archivedModels.some((model) => model.nome === shift.modelo_nome);
      }
      return true;
    });

    if (activeTabSafe === 'agenda') return base.filter((shift) => shift.usuario_id === userId);
    const model = visibleModels.find((item) => item.id === activeTabSafe);
    if (!model) return [];
    return base.filter(
      (shift) => shift.modelo_id === model.id || (!shift.modelo_id && shift.modelo_nome === model.nome)
    );
  })();

  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const weekLabel = `${shortDate(days[0])} – ${shortDate(days[6])}`;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: 'calc(100vh * 1.5 / 24)',
        right: 3,
        width: 700,
        height: 500,
        background: 'color-mix(in srgb, var(--c8) 35%, transparent)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid color-mix(in srgb, var(--c1) 22%, transparent)',
        borderRadius: 16,
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
        zIndex: 1200,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-main)',
        animation: 'clk-panel-in 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <ShiftWidget
        user={user}
        displayName={chatterNames[userId]}
        ponto={ponto}
        saving={saving}
        feedback={feedback}
        onPunch={punch}
        justificativaPendente={justificativaPendente}
        onOpenJustificativa={onOpenJustificativa}
      />

      <WeekToolbar
        tabs={tabs}
        activeTab={activeTabSafe}
        onTabChange={setActiveTab}
        weekLabel={weekLabel}
        onPrev={() => setAnchor((prev) => addDays(prev, -7))}
        onNext={() => setAnchor((prev) => addDays(prev, 7))}
        onToday={() => setAnchor(startOfDay(new Date()))}
        onPickDate={(value) => {
          const parsed = new Date(`${value}T00:00:00`);
          if (!Number.isNaN(parsed.getTime())) setAnchor(startOfDay(parsed));
        }}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '8px 8px 6px' }}>
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transform: 'scale(0.95)',
            transformOrigin: 'top center',
          }}
        >
          <WeekGrid
            days={days}
            shifts={gridShifts}
            userId={userId}
            chatterNames={chatterNames}
            pontoIndex={pontoIndex}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}