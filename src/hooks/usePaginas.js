import { useCallback, useEffect, useRef, useState } from 'react';
import { carregarPaginas, iniciarEspontaneo } from '@/lib/paginas';
import { emitNotificationsChanged, SHIFTS_CHANGED } from '@/lib/desktopEvents';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { notificarPonto } from '@/lib/notificacoes';

const REFRESH_MS = 15000;

/**
 * Estado ao vivo das páginas em que a pessoa está atribuída.
 *
 * Recarrega a cada 15 segundos (mesmo ritmo do resto do shell) e sempre que um
 * turno muda, para o cartão não mentir sobre quem está na página.
 */
export default function usePaginas() {
  const { user } = useAuth();
  const [paginas, setPaginas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [entrando, setEntrando] = useState(null);
  const ativo = useRef(true);

  const recarregar = useCallback(async () => {
    try {
      const lista = await carregarPaginas();
      if (!ativo.current) return;
      setPaginas(lista);
      setErro(null);
    } catch (error) {
      if (!ativo.current) return;
      setErro(error?.message || 'Não foi possível carregar as páginas');
    } finally {
      if (ativo.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    ativo.current = true;
    recarregar();

    const id = setInterval(recarregar, REFRESH_MS);
    const aoMudarTurnos = () => recarregar();
    window.addEventListener(SHIFTS_CHANGED, aoMudarTurnos);

    return () => {
      ativo.current = false;
      clearInterval(id);
      window.removeEventListener(SHIFTS_CHANGED, aoMudarTurnos);
    };
  }, [recarregar]);

  const entrar = useCallback(
    async (modeloId) => {
      setEntrando(modeloId);
      try {
        const resultado = await iniciarEspontaneo(modeloId);
        // Entrada avulsa também avisa todos os admins, igual à do turno marcado.
        if (resultado?.ok) {
          const pagina = paginas.find((item) => item.modelo_id === modeloId);
          notificarPonto(base44, {
            tipo: 'entrada',
            usuario: user,
            modeloNome: pagina?.modelo_nome || '',
            modeloId,
            shiftId: resultado.shift_id || '',
            timestamp: resultado.entrada || new Date().toISOString(),
            avulso: true,
          }).catch((erro) => console.warn('[Ponto] aviso de entrada avulsa falhou', erro));
        }
        await recarregar();
        if (resultado?.ok && resultado?.proximo?.usuario_nome) {
          emitNotificationsChanged();
        }
        return resultado;
      } catch (error) {
        return { ok: false, error: error?.message || 'Não foi possível entrar na página' };
      } finally {
        setEntrando(null);
      }
    },
    [paginas, recarregar, user]
  );

  return { paginas, carregando, erro, entrando, recarregar, entrar };
}
