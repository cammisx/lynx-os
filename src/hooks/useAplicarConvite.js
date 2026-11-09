import { useEffect, useRef } from 'react';
import { aplicarMeuConvite } from '@/lib/convitesChatter';
import {
  emitChattersChanged,
  emitModelsChanged,
  emitNotificationsChanged,
  emitShiftsChanged,
} from '@/lib/desktopEvents';
import { useAuth } from '@/lib/AuthContext';

/**
 * Primeiro acesso de quem foi convidado: aplica o convite (cargo, vínculos nas
 * modelos e os turnos como pedido de aprovação) sem ninguém precisar apertar
 * nada, e acende a notificação de cada turno. Roda uma vez por sessão.
 */
export default function useAplicarConvite(user) {
  const { checkUserAuth } = useAuth();
  const tentado = useRef('');

  useEffect(() => {
    if (!user?.id || !user?.email) return;
    if (tentado.current === user.id) return;
    const chave = `lynx:convite:${user.id}`;
    if (sessionStorage.getItem(chave) === 'ok') return;

    tentado.current = user.id;
    sessionStorage.setItem(chave, 'ok');

    aplicarMeuConvite()
      .then(async (resultado) => {
        if (!resultado?.aplicados) {
          sessionStorage.removeItem(chave);
          return;
        }
        emitChattersChanged();
        emitModelsChanged();
        emitShiftsChanged();
        emitNotificationsChanged();
        // Convite de admin muda o cargo da pessoa: recarrega o usuário.
        await checkUserAuth?.();
      })
      .catch((falha) => {
        sessionStorage.removeItem(chave);
        console.warn('[convite] não consegui aplicar agora', falha?.message || falha);
      });
  }, [user?.id, user?.email, checkUserAuth]);
}
