import { createContext, useContext } from 'react';

/**
 * O que a janela precisa saber sobre o gerenciador: se está na frente, se está
 * minimizada e como avisar que quer minimizar ou pedir foco.
 */
export const JanelaContext = createContext(null);

export const useJanela = () => useContext(JanelaContext) || {};
