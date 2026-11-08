import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { agruparReacoes } from '@/lib/pets';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

/**
 * Reações dos pets guardadas no banco (entidade PetReacao).
 *
 * Se a entidade ainda não estiver publicada, a leitura falha e a tela segue com
 * as frases de fábrica do código: o pet nunca fica mudo por causa disso.
 */
export default function useReacoesPet() {
  const [reacoes, setReacoes] = useState({});

  const carregar = useCallback(async () => {
    try {
      const lista = asList(await base44.entities.PetReacao.list('created_date', 500, 0));
      setReacoes(agruparReacoes(lista));
    } catch (falha) {
      console.warn('[Pet] reações indisponíveis, usando as de fábrica:', falha?.message || falha);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { reacoes, recarregar: carregar };
}
