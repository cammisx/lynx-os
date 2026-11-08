/**
 * Convites de chatter: o nome digitado no convite fica guardado até a pessoa
 * existir no app.
 *
 * O convite em si é do Base44 (base44.users.inviteUser) e só leva o e-mail.
 * Quando o usuário já aparece na listagem, o nome é aplicado na hora; quando
 * não aparece ainda, ele espera aqui e entra na próxima vez que a janela de
 * Chatters abrir.
 */
const CHAVE = 'lynx:convites-pendentes';

export const normalizarEmail = (email) => String(email || '').trim().toLowerCase();

const lerTodos = () => {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const dados = bruto ? JSON.parse(bruto) : {};
    return dados && typeof dados === 'object' ? dados : {};
  } catch (erro) {
    return {};
  }
};

const gravarTodos = (mapa) => {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(mapa));
  } catch (erro) {
    // sem storage o nome só não fica esperando; o convite continua valendo
  }
};

export const guardarNomePendente = (email, nome) => {
  const alvo = normalizarEmail(email);
  if (!alvo || !nome) return;
  gravarTodos({ ...lerTodos(), [alvo]: String(nome).trim() });
};

export const tirarNomePendente = (email) => {
  const alvo = normalizarEmail(email);
  const mapa = lerTodos();
  if (!(alvo in mapa)) return;
  delete mapa[alvo];
  gravarTodos(mapa);
};

/** Nome que está esperando a pessoa aparecer no app (ou string vazia). */
export const nomePendente = (email) => lerTodos()[normalizarEmail(email)] || '';
