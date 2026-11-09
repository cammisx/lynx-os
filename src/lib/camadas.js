/**
 * Camadas do sistema.
 *
 * As janelas vivem em 8000 + a contagem do gerenciador (que cresce a cada
 * abertura ou foco). Modais ficam entre 9000 e 9600. Estas constantes são as
 * superfícies que precisam ficar acima de tudo que é janela.
 */

/** Fundo invisível do menu iniciar: cobre a tela toda e fecha o menu ao clique. */
export const FUNDO_MENU_INICIAR = 9699;

/** Menu iniciar: nada de janela, widget ou relógio fica na frente dele. */
export const MENU_INICIAR = 9700;

/** Confirmação de sair, aberta de dentro do menu: precisa ficar sobre ele. */
export const CONFIRMAR_SAIR = 9720;

/** Relógio no celular, onde não existe janela: sobe sobre a barra de status. */
export const RELOGIO_CELULAR = 9500;

/** Relógio no desktop quando o shell não informa uma camada. */
export const RELOGIO_DESKTOP = 1200;
