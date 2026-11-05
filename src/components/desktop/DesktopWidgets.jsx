import { useState } from 'react';
import WidgetIcon from '@/components/desktop/WidgetIcon';
import TurnoWidgetPanel from '@/components/desktop/TurnoWidgetPanel';
import JustificativaModal from '@/components/notifications/JustificativaModal';
import useWidgets from '@/hooks/useWidgets';
import useTurnoPonto from '@/hooks/useTurnoPonto';
import useNotifications from '@/hooks/useNotifications';
import RegistrarVendaModal from '@/components/vendas/RegistrarVendaModal';
import SolicitarFolgaModal from '@/components/solicitacoes/SolicitarFolgaModal';
import AjustePontoModal from '@/components/solicitacoes/AjustePontoModal';
import { useAuth } from '@/lib/AuthContext';

const ENTRADA_LIBERADA_MS = 5 * 60000;

export default function DesktopWidgets() {
  const { user } = useAuth();
  const { widgets, carregado, patch } = useWidgets();
  const { userId, ponto, semana, saving, feedback, punch } = useTurnoPonto();
  const { items, reload } = useNotifications(userId);
  const [justificativa, setJustificativa] = useState(null);
  const [solicitacao, setSolicitacao] = useState(null);

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
          semana={semana}
          saving={saving}
          feedback={feedback}
          onPunch={punch}
          justificativaPendente={justificativaPendente}
          onOpenJustificativa={(notificacao) => setJustificativa(notificacao)}
          onClose={() => patch(turno.id, { aberto: false })}
          onMove={(posicao) => patch(turno.id, posicao)}
          onAbrirSolicitacao={(tipo) => setSolicitacao(tipo)}
        />
      )}

      {solicitacao === 'venda' && (
        <RegistrarVendaModal
          usuario={user}
          modeloPadraoId={ponto.modeloId || ''}
          onClose={() => setSolicitacao(null)}
          onSaved={() => setSolicitacao(null)}
        />
      )}

      {solicitacao === 'folga' && (
        <SolicitarFolgaModal
          usuario={user}
          onClose={() => setSolicitacao(null)}
          onSaved={() => setSolicitacao(null)}
        />
      )}

      {solicitacao === 'ajuste' && (
        <AjustePontoModal
          usuario={user}
          onClose={() => setSolicitacao(null)}
          onSaved={() => setSolicitacao(null)}
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
