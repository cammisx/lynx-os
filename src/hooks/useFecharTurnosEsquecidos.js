import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const LAST_RUN_KEY = 'lynx_fechar_turnos_em';
const INTERVAL_MS = 15 * 60 * 1000;

/**
 * Rede de segurança do fechamento automático de turno.
 *
 * A verificação oficial roda por automação agendada no painel do app. Este hook
 * garante que ela também aconteça quando o admin abre o desktop, no máximo a
 * cada 15 minutos, sem travar a interface.
 */
export default function useFecharTurnosEsquecidos() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (typeof window === 'undefined') return;

    const lastRun = Number(window.localStorage.getItem(LAST_RUN_KEY) || 0);
    if (Date.now() - lastRun < INTERVAL_MS) return;

    window.localStorage.setItem(LAST_RUN_KEY, String(Date.now()));

    base44.functions
      .invoke('fecharTurnosEsquecidos', {})
      .catch((error) => console.warn('[fecharTurnosEsquecidos]', error));
  }, [user]);
}
