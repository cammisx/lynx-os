import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { nomeDaPessoa } from '@/lib/pessoas';
import { useChatPanel } from '@/components/chat/ChatProvider';
import JustificativaModal from '@/components/notifications/JustificativaModal';
import ConfirmarTurnoModal from '@/components/notifications/ConfirmarTurnoModal';
import CutucadaModal from '@/components/notifications/CutucadaModal';
import VendaPendenteModal from '@/components/vendas/VendaPendenteModal';
import FolgaPendenteModal from '@/components/solicitacoes/FolgaPendenteModal';
import HorarioDisponivelModal from '@/components/solicitacoes/HorarioDisponivelModal';
import AjustePontoModal from '@/components/solicitacoes/AjustePontoModal';

/**
 * O que acontece ao tocar numa notificação.
 *
 * Fica num lugar só porque barra de tarefas (desktop) e barra de status
 * (mobile) mostram a mesma lista: menção abre o canal, cutucada e as
 * pendências abrem o modal próprio, o resto só é marcado como resolvido.
 * Devolve também os modais já montados, para quem chamar só desenhar.
 */
export default function useAcoesNotificacoes({ reload, aoAbrirChat } = {}) {
  const chat = useChatPanel();
  const { user } = useAuth();
  const [justificativa, setJustificativa] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [vendaPendente, setVendaPendente] = useState(null);
  const [folgaPendente, setFolgaPendente] = useState(null);
  const [horarioLivre, setHorarioLivre] = useState(null);
  const [cutucada, setCutucada] = useState(null);
  /* Saída automática e saída pendente levam a pessoa direto para o ajuste do
     ponto, já na ocorrência do aviso: é lá que ela corrige o horário real. */
  const [ajustePonto, setAjustePonto] = useState(null);

  const abrir = async (notificacao) => {
    if (!notificacao) return;

    if (notificacao.tipo === 'mencao') {
      if (notificacao.canal_id) {
        if (aoAbrirChat) aoAbrirChat();
        else chat.abrir();
        chat.abrirCanal(notificacao.canal_id);
      }
      if (notificacao.status !== 'resolvida') {
        base44.entities.Notificacao.update(notificacao.id, { status: 'resolvida' }).catch((erro) =>
          console.warn('[Notificacao]', erro)
        );
        await reload?.();
      }
      return;
    }

    if (notificacao.tipo === 'cutucada') {
      if (notificacao.status === 'resolvida') return;
      setCutucada(notificacao);
      return;
    }

    if (notificacao.tipo === 'turno_esquecido') {
      setJustificativa(notificacao);
      return;
    }

    if (notificacao.tipo === 'saida_automatica' || notificacao.tipo === 'saida_pendente') {
      setAjustePonto(notificacao);
      return;
    }

    if (notificacao.tipo === 'folga_pendente') {
      if (notificacao.status === 'resolvida') return;
      setFolgaPendente(notificacao);
      return;
    }

    if (notificacao.tipo === 'horario_disponivel') {
      if (notificacao.status === 'resolvida') return;
      setHorarioLivre(notificacao);
      return;
    }

    if (notificacao.tipo === 'venda_pendente') {
      if (notificacao.status === 'resolvida') return;
      setVendaPendente(notificacao);
      return;
    }

    if (notificacao.tipo === 'novo_shift') {
      if (notificacao.status === 'resolvida') return;
      setConfirmacao(notificacao);
      return;
    }

    if (notificacao.status !== 'resolvida') {
      try {
        await base44.entities.Notificacao.update(notificacao.id, { status: 'resolvida' });
      } catch (erro) {
        console.warn('[Notificacao]', erro);
      }
      await reload?.();
    }
  };

  /* `reload` é o recarregamento da lista de quem chamou; os modais devolvem
     para ele quando salvam algo. */
  const modais = (
    <>
      {cutucada ? (
        <CutucadaModal
          notificacao={cutucada}
          onClose={() => {
            setCutucada(null);
            reload?.();
          }}
        />
      ) : null}
      {horarioLivre ? (
        <HorarioDisponivelModal
          notification={horarioLivre}
          onClose={() => setHorarioLivre(null)}
          onSaved={reload}
        />
      ) : null}
      {folgaPendente ? (
        <FolgaPendenteModal
          notification={folgaPendente}
          onClose={() => setFolgaPendente(null)}
          onSaved={reload}
        />
      ) : null}
      {vendaPendente ? (
        <VendaPendenteModal
          notification={vendaPendente}
          onClose={() => setVendaPendente(null)}
          onSaved={reload}
        />
      ) : null}
      {justificativa ? (
        <JustificativaModal
          notification={justificativa}
          onClose={() => setJustificativa(null)}
          onSaved={reload}
        />
      ) : null}
      {ajustePonto ? (
        <AjustePontoModal
          usuario={user}
          chaveInicial={
            ajustePonto.shift_id && ajustePonto.ocorrencia_data
              ? `${ajustePonto.shift_id}|${ajustePonto.ocorrencia_data}`
              : ''
          }
          onClose={() => {
            setAjustePonto(null);
            reload?.();
          }}
          onSaved={() => {
            setAjustePonto(null);
            reload?.();
          }}
        />
      ) : null}
      {confirmacao ? (
        <ConfirmarTurnoModal
          notification={confirmacao}
          chatterNome={user ? nomeDaPessoa(user) : ''}
          onClose={() => setConfirmacao(null)}
          onSaved={reload}
        />
      ) : null}
    </>
  );

  return { abrir, modais };
}
