/**
 * Nome e foto de quem usa o sistema — uma fonte só.
 *
 * O nome oficial mora no User (`nome_exibicao` e `foto_url`), que é o mesmo
 * campo que a janela de Chatters edita quando o admin troca o nome de alguém.
 * A entidade Chatter continua existindo para comissão, e guarda uma cópia do
 * nome só para registros antigos e relatórios não ficarem sem identificação.
 */
import { base44 } from '@/api/base44Client';
import { cargoDaPessoa, fotoDaPessoa, iniciaisDe, nomeDaPessoa } from '@/lib/perfilLogica';

export { cargoDaPessoa, fotoDaPessoa, nomeDaPessoa };

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

export const iniciaisDaPessoa = (nome) => iniciaisDe(nome);

/**
 * Leva o nome para a cópia que vive no Chatter, sem tocar em comissão.
 * Nunca deve atrapalhar quem chamou: falha em silêncio e avisa no console.
 */
export const espelharNomeNoChatter = async ({ usuarioId, nome, email }) => {
  if (!usuarioId || !nome) return null;
  try {
    const existentes = asList(await base44.entities.Chatter.filter({ usuario_id: usuarioId }));
    if (existentes.length === 0) return null;

    await Promise.all(
      existentes
        .filter((chatter) => chatter.nome_exibicao !== nome)
        .map((chatter) => base44.entities.Chatter.update(chatter.id, { nome_exibicao: nome }))
    );
    return existentes[0];
  } catch (erro) {
    console.warn('[pessoas] não consegui espelhar o nome no chatter', erro?.message || erro);
    return null;
  }
};

/** Mantém o nome dentro dos vínculos de modelo em dia (usado pela janela de Chatters). */
export const propagarNomeNasModelos = async ({ usuarioId, nome }) => {
  try {
    const modelos = asList(await base44.entities.Modelo.list());
    const afetadas = modelos.filter((modelo) =>
      (modelo.chatters || []).some(
        (membro) => membro.usuario_id === usuarioId && membro.usuario_nome !== nome
      )
    );

    await Promise.all(
      afetadas.map((modelo) =>
        base44.entities.Modelo.update(modelo.id, {
          chatters: modelo.chatters.map((membro) =>
            membro.usuario_id === usuarioId ? { ...membro, usuario_nome: nome } : membro
          ),
        })
      )
    );

    return afetadas.length;
  } catch (erro) {
    console.warn('[pessoas] não consegui propagar o nome nas modelos', erro?.message || erro);
    return 0;
  }
};
