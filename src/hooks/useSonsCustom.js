import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { registrarSonsCustom } from '@/lib/sons';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

/**
 * Galeria de áudios de notificação (entidade SomNotificacao).
 *
 * Duas faixas, como a Chloë pediu: "Meus sons" são os envios da própria
 * pessoa, que aparecem nos dois aparelhos dela; "Compartilhados" são os que
 * ela marcou para todo mundo usar. A escolha de qual tocar continua sendo de
 * cada aparelho, então a galeria é comum e a seleção não.
 *
 * Se a entidade ainda não estiver publicada, a leitura falha e o sistema segue
 * com os quatro sons do código: ninguém fica sem som por causa disso.
 */
export default function useSonsCustom() {
  const { user } = useAuth();
  const userId = user?.id;
  const [todos, setTodos] = useState([]);
  const [carregado, setCarregado] = useState(false);

  const carregar = useCallback(async () => {
    if (!userId) {
      setCarregado(true);
      return;
    }
    try {
      const [meus, compartilhados] = await Promise.all([
        base44.entities.SomNotificacao.filter({ usuario_id: userId }),
        base44.entities.SomNotificacao.filter({ compartilhado: true }),
      ]);
      const porId = new Map();
      [...asList(meus), ...asList(compartilhados)].forEach((item) => {
        if (item?.id && item?.url) porId.set(item.id, item);
      });
      setTodos([...porId.values()]);
    } catch (falha) {
      console.warn('[Sons] galeria indisponível, usando os do código:', falha?.message || falha);
    } finally {
      setCarregado(true);
    }
  }, [userId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* A biblioteca de som precisa saber dos áudios para tocar e para o seletor
     mostrar o nome certo. */
  useEffect(() => {
    registrarSonsCustom(todos);
  }, [todos]);

  const meus = useMemo(
    () => todos.filter((item) => item.usuario_id === userId),
    [todos, userId]
  );

  const compartilhados = useMemo(() => todos.filter((item) => item.compartilhado === true), [todos]);

  const excluir = useCallback(
    async (registro) => {
      if (!registro?.id) return;
      setTodos((atual) => atual.filter((item) => item.id !== registro.id));
      try {
        await base44.entities.SomNotificacao.delete(registro.id);
      } catch (falha) {
        console.warn('[Sons] excluir', falha?.message || falha);
        carregar();
      }
    },
    [carregar]
  );

  const alternarCompartilhado = useCallback(
    async (registro) => {
      if (!registro?.id) return;
      const valor = registro.compartilhado !== true;
      setTodos((atual) =>
        atual.map((item) => (item.id === registro.id ? { ...item, compartilhado: valor } : item))
      );
      try {
        await base44.entities.SomNotificacao.update(registro.id, { compartilhado: valor });
      } catch (falha) {
        console.warn('[Sons] compartilhar', falha?.message || falha);
        carregar();
      }
    },
    [carregar]
  );

  return { todos, meus, compartilhados, carregado, recarregar: carregar, excluir, alternarCompartilhado };
}
