import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { buildChatterNames } from '@/lib/chatterNames';
import { MODELS_CHANGED, SHIFTS_CHANGED } from '@/lib/desktopEvents';
import { expandShift } from '@/lib/shiftRepeat';
import { isRecusado } from '@/lib/aceite';
import { buildPontoIndex, clockLabel, localDateKey, occurrenceKey } from '@/lib/ponto';

const DAY_MS = 86400000;
const REFRESH_MS = 60000;
const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Fonte única da verdade do ponto: turnos da pessoa, registros, estado atual
 * (livre, próximo, ativo ou em pausa) e as ações de bater ponto.
 *
 * O painel do relógio e o widget do desktop consomem este hook, então os dois
 * nunca discordam sobre tempo ou estado.
 */
export default function useTurnoPonto() {
  const { user } = useAuth();
  const userId = user?.id;
  const [ownShifts, setOwnShifts] = useState([]);
  const [models, setModels] = useState([]);
  const [chatters, setChatters] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [saving, setSaving] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [tick, setTick] = useState(0);
  const feedbackTimer = useRef(null);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const loadShifts = useCallback(() => {
    if (!userId) return undefined;
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
  }, [userId]);

  const loadModels = useCallback(() => {
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
  }, []);

  const loadChatters = useCallback(() => {
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
  }, []);

  const loadRegistros = useCallback(() => {
    if (!userId) return undefined;
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
  }, [userId]);

  useEffect(() => loadShifts(), [loadShifts, tick]);
  useEffect(() => loadModels(), [loadModels, tick]);
  useEffect(() => loadChatters(), [loadChatters, tick]);
  useEffect(() => loadRegistros(), [loadRegistros, tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleShifts = () => setTick((n) => n + 1);
    const handleModels = () => setTick((n) => n + 1);
    window.addEventListener(SHIFTS_CHANGED, handleShifts);
    window.addEventListener(MODELS_CHANGED, handleModels);
    return () => {
      window.removeEventListener(SHIFTS_CHANGED, handleShifts);
      window.removeEventListener(MODELS_CHANGED, handleModels);
    };
  }, []);

  const chatterNames = useMemo(() => buildChatterNames(chatters), [chatters]);

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

  // Turnos da semana vigente (mesma janela de 7 dias do painel do relógio).
  const semana = useMemo(() => {
    const agora = Date.now();
    const inicio = startOfDay(new Date()).getTime();
    const fim = inicio + 7 * DAY_MS;
    const arquivadas = new Set(models.filter((model) => model.arquivada).map((model) => model.id));

    const ocorrencias = ownShifts
      .filter((shift) => !arquivadas.has(shift.modelo_id))
      .filter((shift) => !isRecusado(shift))
      .flatMap((shift) => expandShift(shift, inicio, fim))
      .filter((occurrence) => occurrence.end > agora)
      .sort((a, b) => a.start - b.start);

    return {
      total: ocorrencias.length,
      proximo: ocorrencias[0] || null,
    };
  }, [ownShifts, models]);

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

  const showFeedback = useCallback((text, error = false) => {
    setFeedback({ text, error });
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  }, []);

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

  return {
    user,
    userId,
    chatterNames,
    ownShifts,
    models,
    chatters,
    registros,
    pontoIndex,
    openEntries,
    ponto,
    semana,
    saving,
    feedback,
    punch,
    reload: () => setTick((n) => n + 1),
  };
}
