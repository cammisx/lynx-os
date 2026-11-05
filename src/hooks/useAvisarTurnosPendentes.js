import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { precisaAvisoPendente, occurrenceForAviso } from '@/lib/aceite';
import { buildTurnoPendenteMessage, notificarAdmins } from '@/lib/notificacoes';
import { buildChatterNames, chatterName } from '@/lib/chatterNames';

const LAST_RUN_KEY = 'lynx_aviso_turnos_pendentes_em';
const INTERVAL_MS = 15 * 60 * 1000;

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

/**
 * Avisa o admin quando um turno está a menos de 6 horas de começar e o chatter
 * ainda não confirmou. Roda no cliente porque a app não tem backend functions
 * habilitado, então só executa com o desktop aberto.
 */
export default function useAvisarTurnosPendentes() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (typeof window === 'undefined') return;

    const lastRun = Number(window.localStorage.getItem(LAST_RUN_KEY) || 0);
    if (Date.now() - lastRun < INTERVAL_MS) return;

    window.localStorage.setItem(LAST_RUN_KEY, String(Date.now()));

    let active = true;

    (async () => {
      const [shiftResult, chatterResult] = await Promise.all([
        base44.entities.Shift.list('-created_date', 200),
        base44.entities.Chatter.list().catch(() => []),
      ]);
      if (!active) return;

      const shifts = asList(shiftResult);
      const names = buildChatterNames(asList(chatterResult));
      const now = Date.now();

      // Turnos criados antes do fluxo de aceite não têm o campo e ficam de fora.
      const pendentes = shifts.filter(
        (shift) => shift.aceite === 'pendente' && precisaAvisoPendente(shift, now)
      );

      for (const shift of pendentes) {
        const nome = chatterName(names, shift.usuario_id, shift.usuario_nome);
        const occurrence = occurrenceForAviso(shift, now);
        try {
          await notificarAdmins(base44, {
            titulo: 'Turno sem confirmação',
            mensagem: buildTurnoPendenteMessage(shift, nome, occurrence),
            tipo: 'turno_pendente',
            shift_id: shift.id,
            ocorrencia_data: '',
            modelo_id: shift.modelo_id || '',
          });
        } catch (error) {
          console.warn('[useAvisarTurnosPendentes]', error);
        }
      }
    })().catch((error) => console.warn('[useAvisarTurnosPendentes]', error));

    return () => {
      active = false;
    };
  }, [user]);
}
