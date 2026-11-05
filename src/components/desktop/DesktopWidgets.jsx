import { useState } from 'react';
import WidgetIcon from '@/components/desktop/WidgetIcon';
import TurnoWidgetPanel from '@/components/desktop/TurnoWidgetPanel';
import JustificativaModal from '@/components/notifications/JustificativaModal';
import useWidgets from '@/hooks/useWidgets';
import useTurnoPonto from '@/hooks/useTurnoPonto';
import useNotifications from '@/hooks/useNotifications';

const ENTRADA_LIBERADA_MS = 15 * 60000;

export default function DesktopWidgets() {
  const { widgets, carregado, patch } = useWidgets();
  const { userId, ponto, saving, feedback, punch } = useTurnoPonto();
  const { items, reload } = useNotifications(userId);
  const [justificativa, setJustificativa] = useState(null);

  if (!carregado) return null;

  const justificativaPendente =
    items.find(
      (item) => item.tipo === 'turno_esquecido' && item.status === 'pendente'
    ) || null;

  const turno = widgets.find((widget) => widget.tipo === 'turno');
  if (!turno) return null;

  const aberto = Boolean(turno.aberto);
  const entradaLiberada =
    ponto.mode === 'proximo' && ponto.start - Date.now() <= ENTRADA_LIBERADA_MS;

  return (
    <>
      {!aberto && (
        <WidgetIcon
          label="Turno"
          position={turno}
          pulsando={entradaLiberada}
          onOpen={() => patch(turno.id, { aberto: true })}
          onCommit={(posicao) => patch(turno.id, posicao)}
        />
      )}

      {aberto && (
        <TurnoWidgetPanel
          widget={turno}
          ponto={ponto}
          saving={saving}
          feedback={feedback}
          onPunch={punch}
          justificativaPendente={justificativaPendente}
          onOpenJustificativa={(notificacao) => setJustificativa(notificacao)}
          onClose={() => patch(turno.id, { aberto: false })}
          onMove={(posicao) => patch(turno.id, posicao)}
        />
      )}

      {justificativa && (
        <JustificativaModal
          notification={justificativa}
          onClose={() => setJustificativa(null)}
          onSaved={reload}
        />
      )}
    </>
  );
}
