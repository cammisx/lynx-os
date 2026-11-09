/**
 * A chamada da Pixie pelo menu do botão direito.
 *
 * Qualquer menu do sistema pode oferecer "Chamar Pixie": o item só avisa que
 * ela foi chamada, e quem estiver com ela na tela (o roteiro do tutorial ou a
 * ajuda do sistema) aparece e responde. Assim o menu não precisa saber onde
 * ela mora.
 */

const EVENTO = 'lynx:chamar-pixie';

/**
 * Chama a Pixie. `alvo` é o elemento em que a pessoa clicou (melhor caminho:
 * ele pode ter um tutorial próprio); sem ele, valem as coordenadas.
 */
export const chamarPixie = ({ x = 0, y = 0, alvo = null } = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { x, y, alvo } }));
};

export const assinarChamadoPixie = (fn) => {
  if (typeof window === 'undefined') return () => {};
  const ouvir = (evento) => fn(evento.detail || {});
  window.addEventListener(EVENTO, ouvir);
  return () => window.removeEventListener(EVENTO, ouvir);
};

/* Item pronto para colar em qualquer menu de clique direito. */
export const itemChamarPixie = ({ x = 0, y = 0, alvo = null } = {}) => ({
  id: 'chamar-pixie',
  rotulo: 'Chamar Pixie',
  acao: () => chamarPixie({ x, y, alvo }),
});

/* ---------- ela fica flutuando depois do tutorial ---------- */

const CHAVE_ESPERA = 'lynx:pixie-em-espera';

/* Terminado o tutorial, ela fica na tela em silêncio até alguém fechar. */
export const marcarPixieEmEspera = () => {
  try {
    window.sessionStorage.setItem(CHAVE_ESPERA, '1');
  } catch {
    /* sem armazenamento ela só não fica em espera: nada quebra */
  }
};

export const pixieEmEspera = () => {
  try {
    return window.sessionStorage.getItem(CHAVE_ESPERA) === '1';
  } catch {
    return false;
  }
};

export const limparPixieEmEspera = () => {
  try {
    window.sessionStorage.removeItem(CHAVE_ESPERA);
  } catch {
    /* nada a fazer */
  }
};

/* ---------- o tutorial da primeira vez ---------- */

const CHAVE_VISTO = 'lynx:tutorial-pixie-visto';

/* Se a pessoa já passou pelo tutorial da Pixie. */
export const tutorialPixieVisto = () => {
  try {
    return window.localStorage.getItem(CHAVE_VISTO) === '1';
  } catch {
    return false;
  }
};

/* Marca que ela já se apresentou: na sequência da conta, não volta. */
export const marcarTutorialPixieVisto = () => {
  try {
    window.localStorage.setItem(CHAVE_VISTO, '1');
  } catch {
    /* Sem armazenamento o tutorial só repete: nada quebra. */
  }
};
