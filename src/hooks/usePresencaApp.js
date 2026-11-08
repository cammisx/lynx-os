import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { INTERVALO_PULSO_MS, baterPresenca } from '@/lib/presencaApp';

/**
 * Mantém a presença do app em dia enquanto o LYNX estiver aberto.
 *
 * Bate uma vez ao abrir, sempre que a pessoa volta para a janela e a cada 90
 * segundos. Aba escondida não bate: se a pessoa fechou o app, ela fica fora, e
 * é essa ausência que libera o fechamento automático do turno.
 */
export default function usePresencaApp() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return undefined;

    baterPresenca(user, { forcar: true });

    const id = setInterval(() => {
      if (document.hidden) return;
      baterPresenca(user);
    }, INTERVALO_PULSO_MS);

    const acordar = () => {
      if (document.hidden) return;
      baterPresenca(user, { forcar: true });
    };

    window.addEventListener('focus', acordar);
    document.addEventListener('visibilitychange', acordar);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', acordar);
      document.removeEventListener('visibilitychange', acordar);
    };
  }, [user]);
}
