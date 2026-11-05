import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Entrega a equipe para a janela de Modelos: todas as modelos (com os
// chatters e os centavos de cada um) e o cadastro de quem trabalha no app
// (nome de exibição, foto, subnick e cargo).
//
// Roda com service role porque o RLS destas entidades esconde a lista de
// quem não é admin: era por isso que a janela abria vazia.
// Admin recebe tudo; qualquer outra pessoa recebe apenas as modelos em que
// está atribuída.

const PAGE = 500;

const lista = (resultado: any) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const paginado = async (entidade: any, query: any = {}, sort = 'created_date') => {
  const saida: any[] = [];
  let skip = 0;
  while (true) {
    const lote = await entidade.filter(query, sort, PAGE, skip);
    const itens = lista(lote);
    saida.push(...itens);
    if (itens.length < PAGE) break;
    skip += PAGE;
  }
  return saida;
};

const nomeDe = (usuario: any) =>
  usuario?.nome_exibicao || usuario?.full_name || usuario?.email || '';

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    const eu = await base44.auth.me().catch(() => null);
    if (!eu) {
      return Response.json({ ok: false, error: 'Sessão inválida' }, { status: 401 });
    }

    const admin = eu.role === 'admin';

    const [modelos, usuarios] = await Promise.all([
      paginado(base44.asServiceRole.entities.Modelo, {}),
      paginado(base44.asServiceRole.entities.User, {}),
    ]);

    const equipe = usuarios
      .map((usuario: any) => ({
        id: usuario.id,
        email: usuario.email || '',
        full_name: usuario.full_name || '',
        nome_exibicao: usuario.nome_exibicao || '',
        foto_url: usuario.foto_url || '',
        subnick: usuario.subnick || '',
        role: usuario.role || 'user',
      }))
      .sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), 'pt-BR'));

    const visiveis = modelos
      .filter((modelo: any) =>
        admin
          ? true
          : (Array.isArray(modelo?.chatters) ? modelo.chatters : []).some(
              (chatter: any) => chatter?.usuario_id === eu.id
            )
      )
      .sort((a: any, b: any) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));

    return Response.json({
      ok: true,
      escopo: admin ? 'admin' : 'chatter',
      usuario: {
        id: eu.id,
        email: eu.email || '',
        role: eu.role || 'user',
        nome_exibicao: eu.nome_exibicao || '',
        foto_url: eu.foto_url || '',
        subnick: eu.subnick || '',
      },
      modelos: visiveis,
      usuarios: admin ? equipe : equipe.filter((pessoa: any) => pessoa.id === eu.id),
      totais: { modelos: visiveis.length, usuarios: equipe.length },
    });
  } catch (erro: any) {
    return Response.json(
      { ok: false, error: String(erro?.message || erro || 'Falha ao ler a equipe') },
      { status: 500 }
    );
  }
});
