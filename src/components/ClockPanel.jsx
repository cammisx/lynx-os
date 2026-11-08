import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { SHIFTS_CHANGED } from '@/lib/desktopEvents';
import { isRecusado } from '@/lib/aceite';
import { chattersDaModelo, ehAdmin } from '@/lib/chat';
import {
  juntarOrdemAgenda,
  moverNaOrdem,
  ordemAgendaInicial,
  ordenarModelos,
} from '@/lib/agendaOrdem';
import { salvarOrdemAgenda } from '@/lib/perfilUsuario';
import useTurnoPonto from '@/hooks/useTurnoPonto';
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
  const {
    user,
    userId,
    chatterNames,
    models,
    pontoIndex,
    ponto,
    saving,
    feedback,
    punch,
  } = useTurnoPonto();
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [weekShifts, setWeekShifts] = useState([]);
  const [activeTab, setActiveTab] = useState('agenda');
  const [tick, setTick] = useState(0);
  /* Ordem das abas das modelos: preferência de quem está olhando. */
  const [ordem, setOrdem] = useState(() => ordemAgendaInicial(user));
  const [arrastando, setArrastando] = useState(null);
  const panelRef = useRef(null);

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

  useEffect(() => {
    if (!open) return undefined;
    const handleShiftsChanged = () => setTick((n) => n + 1);
    window.addEventListener(SHIFTS_CHANGED, handleShiftsChanged);
    return () => window.removeEventListener(SHIFTS_CHANGED, handleShiftsChanged);
  }, [open]);

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

  /* A agenda da modelo aparece para todo chatter vinculado a ela, tenha turno
     marcado ou não. Admin continua vendo todas. */
  const visibleModels = useMemo(() => {
    const isAdmin = ehAdmin(user);
    return models.filter(
      (model) => !model.arquivada && (isAdmin || chattersDaModelo(model).includes(user?.id))
    );
  }, [models, user]);

  const modelosEmOrdem = useMemo(
    () => ordenarModelos(visibleModels, ordem),
    [visibleModels, ordem]
  );

  /* Todas as abas visíveis entram na ordem; modelo nova entra no fim. */
  const ordemCompleta = useMemo(
    () => juntarOrdemAgenda(modelosEmOrdem.map((model) => model.id), ordem),
    [modelosEmOrdem, ordem]
  );
  const ordemRef = useRef(ordemCompleta);
  ordemRef.current = ordemCompleta;

  useEffect(() => {
    const doBanco = ordemAgendaInicial(user);
    if (doBanco.length) setOrdem((atual) => (atual.length ? atual : doBanco));
  }, [user?.agenda_ordem]);

  const moverAba = (origem, destino) => {
    if (!origem || !destino || origem === destino) return;
    setOrdem(moverNaOrdem(ordemCompleta, origem, destino));
  };

  const soltarAba = () => {
    if (!arrastando) return;
    setArrastando(null);
    salvarOrdemAgenda(user, ordemRef.current);
  };

  const archivedModels = useMemo(() => models.filter((model) => model.arquivada), [models]);

  const justificativaPendente = useMemo(
    () =>
      notificacoes.find(
        (notification) => notification.tipo === 'turno_esquecido' && notification.status === 'pendente'
      ) || null,
    [notificacoes]
  );

  if (!open) return null;

  const tabs = [
    { id: 'agenda', label: 'Minha Agenda' },
    ...modelosEmOrdem.map((model) => ({ id: model.id, label: model.nome, ordenavel: true })),
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
        arrastando={arrastando}
        onArrastarInicio={(id) => setArrastando(id)}
        onArrastarSobre={(id) => moverAba(arrastando, id)}
        onArrastarFim={soltarAba}
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
            agendaPessoal={activeTabSafe === 'agenda'}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}