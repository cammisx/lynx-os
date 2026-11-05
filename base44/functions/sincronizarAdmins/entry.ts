import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Todo admin é chatter de todas as modelos: quando alguém entra no app com
// cargo de admin, esta rotina coloca a pessoa em cada modelo que ainda não
// a tem. O identificador de centavos nasce vazio para o admin preencher ao
// editar a modelo.
//
// Roda com service role (o RLS esconde Modelo e User de quem não é admin) e
// só aceita ser chamada por um admin.

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
    if (eu.role !== 'admin') {
      return Response.json({ ok: false, error: 'Apenas admin' }, { status: 403 });
    }

    const [usuarios, modelos] = await Promise.all([
      paginado(base44.asServiceRole.entities.User, {}),
      paginado(base44.asServiceRole.entities.Modelo, {}),
    ]);

    const admins = usuarios.filter((usuario: any) => usuario?.role === 'admin');
    const ajustes: any[] = [];

    for (const modelo of modelos) {
      const atuais = Array.isArray(modelo?.chatters) ? modelo.chatters : [];
      const presentes = new Set(atuais.map((chatter: any) => chatter?.usuario_id));
      const faltando = admins.filter((admin: any) => !presentes.has(admin.id));
      // Arquivada: só recebe admin novo se já tinha algum admin (mantém o histórico coerente).
      if (modelo?.arquivada && atuais.length === 0) continue;
      if (faltando.length === 0) continue;

      const proximos = [
        ...atuais,
        ...faltando.map((admin: any) => ({
          usuario_id: admin.id,
          usuario_nome: nomeDe(admin),
          identificador: '',
        })),
      ];

      await base44.asServiceRole.entities.Modelo.update(modelo.id, { chatters: proximos });
      ajustes.push({
        modelo_id: modelo.id,
        modelo_nome: modelo.nome || '',
        incluidos: faltando.map((admin: any) => nomeDe(admin)),
      });
    }

    return Response.json({
      ok: true,
      admins: admins.map((admin: any) => ({ id: admin.id, nome: nomeDe(admin) })),
      ajustadas: ajustes.length,
      ajustes,
    });
  } catch (erro: any) {
    return Response.json(
      { ok: false, error: String(erro?.message || erro || 'Falha ao sincronizar admins') },
      { status: 500 }
    );
  }
});
