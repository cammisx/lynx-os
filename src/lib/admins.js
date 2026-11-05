import { base44 } from '@/api/base44Client';

const CHAVE = 'lynx:adminsSincronizados';

// Todo admin é chatter de todas as modelos. Roda uma vez por sessão, no
// backend, porque o cadastro de modelos e de usuários fica escondido pelo RLS.
export const sincronizarAdminsUmaVez = async () => {
  try {
    if (sessionStorage.getItem(CHAVE)) return 0;
    sessionStorage.setItem(CHAVE, '1');
    const resposta = await base44.functions.invoke('sincronizarAdmins', {});
    const dados = resposta?.data;
    if (!dados?.ok) {
      sessionStorage.removeItem(CHAVE);
      return 0;
    }
    return Number(dados.ajustadas) || 0;
  } catch (falha) {
    sessionStorage.removeItem(CHAVE);
    console.warn('[admins] sincronização falhou', falha?.message || falha);
    return 0;
  }
};
