import { useCallback, useEffect, useRef, useState } from 'react';
import { carregarPaginas, iniciarEspontaneo } from '@/lib/paginas';
import { emitNotificationsChanged, SHIFTS_CHANGED } from '@/lib/desktopEvents';

/**
 * Estado ao vivo das páginas em que a pessoa está atribuída.
 *
 * Carrega ao abrir, quando um turno muda e no botão "Atualizar". Não repete
 * sozinho: cada leitura chama a função de backend, então nada de laço.
 */
export default function usePaginas() {
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

    const aoMudarTurnos = () => recarregar();
    window.addEventListener(SHIFTS_CHANGED, aoMudarTurnos);

    return () => {
      ativo.current = false;
      window.removeEventListener(SHIFTS_CHANGED, aoMudarTurnos);
    };
  }, [recarregar]);

  const entrar = useCallback(
    async (modeloId) => {
      setEntrando(modeloId);
      try {
        const resultado = await iniciarEspontaneo(modeloId);
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
    [recarregar]
  );

  return { paginas, carregando, erro, entrando, recarregar, entrar };
}