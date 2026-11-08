import { createContext, useContext, useEffect } from 'react';

/** O que a janela sabe sobre o gerenciador: camada, se está escondida e como minimizar. */
export const JanelaContext = createContext(null);

export const useJanela = () => useContext(JanelaContext) || {};

/**
 * Avisa o gerenciador de que a janela tem alteração que se perderia ao fechar.
 * Sem isso, fechar é imediato; com isso, o dashboard pede confirmação.
 */
export const useMarcarSujo = (sujo) => {
  const { id, marcarSujo } = useJanela();
  useEffect(() => {
    if (!marcarSujo || !id) return undefined;
    marcarSujo(id, Boolean(sujo));
    return () => marcarSujo(id, false);
  }, [id, marcarSujo, Boolean(sujo)]);
};
