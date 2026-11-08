import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { juntarTags, tagNormalizada } from '@/lib/conteudoPastas';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

/**
 * Cadastro de tags do conteúdo.
 *
 * Toda tag criada fica registrada no banco (entidade TagConteudo) para ser
 * reaproveitada nos próximos itens, mesmo antes de qualquer item ser salvo com
 * ela. A lista é sempre em MAIÚSCULA e sem repetição por caixa.
 */
export default function useTagsConteudo() {
  const [tags, setTags] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const conhecidas = useRef(new Set());

  const carregar = useCallback(async () => {
    try {
      const lista = asList(await base44.entities.TagConteudo.list('tag', 500, 0));
      const limpas = juntarTags(lista.map((registro) => registro?.tag));
      conhecidas.current = new Set(limpas);
      setTags(limpas);
    } catch (falha) {
      console.warn('[Tags] carregar', falha);
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* Registra o que ainda não existe. Chamado assim que a tag é criada no
     campo e de novo ao salvar o item: registrar duas vezes não duplica. */
  const registrar = useCallback(async (lista = [], autor = '') => {
    const novas = juntarTags(lista).filter(
      (tag) => tag && !conhecidas.current.has(tagNormalizada(tag))
    );
    if (!novas.length) return [];

    novas.forEach((tag) => conhecidas.current.add(tag));
    setTags((atuais) => juntarTags([...atuais, ...novas]));

    const criadas = await Promise.all(
      novas.map((tag) =>
        base44.entities.TagConteudo.create({ tag, criado_por_nome: autor }).catch((falha) => {
          console.warn('[Tags] registrar', tag, falha);
          conhecidas.current.delete(tag);
          return null;
        })
      )
    );

    const falharam = novas.filter((tag, indice) => !criadas[indice]);
    if (falharam.length) {
      setTags((atuais) => atuais.filter((tag) => !falharam.includes(tag)));
    }
    return novas.filter((tag) => !falharam.includes(tag));
  }, []);

  return { tags, carregado, registrar, recarregar: carregar };
}
