import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { normalizarEstrategia, paraSalvar } from '@/lib/estrategias';

/**
 * Estrategias no banco (entidade Estrategia).
 *
 * Todo mundo le: o chatter precisa ver os textos. Quem grava e o admin, e a
 * tela so mostra os botoes para ele.
 */
const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

/* A entidade precisa estar publicada no app. Sem ela, o erro precisa ser claro
   em vez de um "undefined" no meio da tela. */
const cadastro = () => {
  const entidade = base44?.entities?.Estrategia;
  if (!entidade) throw new Error('O cadastro Estrategia ainda não foi publicado no Builder.');
  return entidade;
};

export default function useEstrategias() {
  const { user } = useAuth();
  const [estrategias, setEstrategias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const userId = user?.id;

  const carregar = useCallback(async () => {
    if (!userId) return;
    setErro('');
    setCarregando(true);
    try {
      const lista = asList(await cadastro().list('-created_date', 300, 0));
      setEstrategias(lista.map(normalizarEstrategia));
    } catch (falha) {
      console.warn('[Estrategias] carregar', falha);
      setErro(
        falha?.message?.includes('publicado')
          ? falha.message
          : 'Não consegui carregar as estratégias agora.'
      );
    } finally {
      setCarregando(false);
    }
  }, [userId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* Cria ou atualiza e devolve o registro salvo, para a tela já abrir nele. */
  const salvar = useCallback(async (estrategia) => {
    const corpo = paraSalvar(estrategia);
    const entidade = cadastro();
    if (estrategia?.id) {
      const salvo = await entidade.update(estrategia.id, corpo);
      setEstrategias((atuais) =>
        atuais.map((item) =>
          item.id === estrategia.id ? normalizarEstrategia({ ...item, ...corpo }) : item
        )
      );
      return normalizarEstrategia(salvo?.id ? salvo : { ...estrategia, ...corpo });
    }
    const criada = await entidade.create(corpo);
    const normalizada = normalizarEstrategia(criada?.id ? criada : corpo);
    setEstrategias((atuais) => [normalizada, ...atuais]);
    return normalizada;
  }, []);

  const excluir = useCallback(async (id) => {
    await cadastro().delete(id);
    setEstrategias((atuais) => atuais.filter((item) => item.id !== id));
  }, []);

  return { estrategias, carregando, erro, salvar, excluir, recarregar: carregar };
}
