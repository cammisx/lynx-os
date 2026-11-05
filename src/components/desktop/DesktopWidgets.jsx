import { useState } from 'react';
import WidgetIcon from '@/components/desktop/WidgetIcon';
import TurnoWidgetPanel from '@/components/desktop/TurnoWidgetPanel';
import PaginasWidgetPanel from '@/components/desktop/PaginasWidgetPanel';
import JustificativaModal from '@/components/notifications/JustificativaModal';
import useWidgets from '@/hooks/useWidgets';
import useTurnoPonto from '@/hooks/useTurnoPonto';
import usePaginas from '@/hooks/usePaginas';
import PaginasIcon from '@/components/icons/PaginasIcon';
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
  const paginas = usePaginas();
  const [justificativa, setJustificativa] = useState(null);
  const [solicitacao, setSolicitacao] = useState(null);

  if (!carregado) return null;

  const justificativaPendente =
    items.find(
      (item) => item.tipo === 'turno_esquecido' && item.status === 'pendente'
    ) || null;

  const turno = widgets.find((widget) => widget.tipo === 'turno');
  const paginasWidget = widgets.find((widget) => widget.tipo === 'paginas');
  if (!turno) return null;

  const aberto = Boolean(turno.aberto);
  const paginasAberto = Boolean(paginasWidget?.aberto);
  const entradaLiberada =
    ponto.mode === 'proximo' && ponto.start - Date.now() <= ENTRADA_LIBERADA_MS;
  const paginaLivre = !paginasAberto && paginas.paginas.some((pagina) => pagina.estado === 'livre');

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

      {paginasWidget && !paginasAberto && (
        <WidgetIcon
          label="Páginas"
          Icon={PaginasIcon}
          position={paginasWidget}
          pulsando={paginaLivre}
          onOpen={() => patch(paginasWidget.id, { aberto: true })}
          onCommit={(posicao) => patch(paginasWidget.id, posicao)}
        />
      )}

      {paginasWidget && paginasAberto && (
        <PaginasWidgetPanel
          widget={paginasWidget}
          paginas={paginas.paginas}
          carregando={paginas.carregando}
          erro={paginas.erro}
          entrando={paginas.entrando}
          recarregar={paginas.recarregar}
          entrar={paginas.entrar}
          usuarioId={user?.id}
          onClose={() => patch(paginasWidget.id, { aberto: false })}
          onMove={(posicao) => patch(paginasWidget.id, posicao)}
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
