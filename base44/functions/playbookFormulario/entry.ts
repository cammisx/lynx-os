import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Formulário público do playbook.
//
// É o link que a modelo recebe no WhatsApp. Ela não tem conta no LynxOS e não
// precisa de nenhuma: esta função é chamada por HTTP, sem usuário logado, e
// trabalha com service role.
//
// O que ela sabe fazer, e só isso:
//   GET  ?token=...        devolve o formulário daquele convite
//   POST token + q_<id>    grava as respostas no playbook da modelo
//
// O token é longo e aleatório, um por modelo. Sem token válido não há leitura
// nem escrita: a função não enxerga playbook de mais ninguém nem outro dado do
// sistema.

const lista = (resultado: any) =>
  Array.isArray(resultado) ? resultado : resultado?.items || [];

const esc = (valor: any) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const pagina = (titulo: string, corpo: string) =>
  `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(titulo)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 28px 18px 56px;
    background: #0c0a11;
    background-image: radial-gradient(1100px 480px at 50% -10%, rgba(156,120,54,0.20), transparent 65%);
    color: #ece7f3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.6;
  }
  .wrap { max-width: 680px; margin: 0 auto; }
  .marca {
    font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase;
    color: #c9a55c; margin-bottom: 6px;
  }
  h1 { font-size: 21px; line-height: 1.3; margin: 0 0 6px; font-weight: 600; }
  .sub { color: #a99fb8; font-size: 13px; margin: 0 0 22px; }
  .secao {
    margin: 0 0 16px; padding: 16px 16px 6px;
    border: 1px solid rgba(201,165,92,0.22);
    border-radius: 14px;
    background: rgba(255,255,255,0.035);
  }
  .secao h2 {
    font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase;
    color: #c9a55c; margin: 0 0 14px; font-weight: 600;
  }
  .campo { margin-bottom: 16px; }
  .campo label { display: block; font-size: 13.5px; color: #ece7f3; margin-bottom: 6px; }
  textarea {
    width: 100%; min-height: 52px; resize: vertical;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.13);
    background: rgba(0,0,0,0.30);
    color: #ece7f3;
    font-family: inherit; font-size: 15px; line-height: 1.5;
  }
  textarea:focus {
    outline: none; border-color: #c9a55c;
    box-shadow: 0 0 0 3px rgba(201,165,92,0.16);
  }
  button {
    width: 100%; margin-top: 18px; padding: 15px 20px;
    border: 0; border-radius: 12px;
    background: linear-gradient(180deg, #d8b874, #b8934a);
    color: #201a10; font-size: 15px; font-weight: 700; letter-spacing: 0.02em;
    cursor: pointer;
  }
  button:disabled { opacity: 0.6; }
  .aviso {
    font-size: 12.5px; color: #a99fb8; margin-top: 16px;
  }
  .ok { font-size: 44px; line-height: 1; margin-bottom: 14px; }
  a { color: #c9a55c; }
</style>
</head>
<body>
<div class="wrap">
${corpo}
</div>
</body>
</html>`;

const paginaErro = (titulo: string, mensagem: string) =>
  pagina(
    titulo,
    `<div class="marca">Lynx</div>
     <h1>${esc(titulo)}</h1>
     <p class="sub">${esc(mensagem)}</p>
     <p class="aviso">Se precisar de um link novo, fale com a agência.</p>`
  );

const respostaHtml = (texto: string, status: number) =>
  new Response(texto, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex, nofollow',
    },
  });

const vencido = (convite: any) => {
  if (!convite?.expira_em) return false;
  return new Date(convite.expira_em).getTime() < Date.now();
};

const formularioHtml = (convite: any) => {
  const secoes = Array.isArray(convite?.secoes) ? convite.secoes : [];
  const total = secoes.reduce(
    (soma: number, secao: any) => soma + (Array.isArray(secao?.itens) ? secao.itens.length : 0),
    0
  );

  const corpoSecoes = secoes
    .map((secao: any) => {
      const itens = (Array.isArray(secao?.itens) ? secao.itens : []).filter((item: any) =>
        String(item?.pergunta || '').trim()
      );
      if (!itens.length) return '';
      const campos = itens
        .map(
          (item: any) => `<div class="campo">
        <label for="q_${esc(item.id)}">${esc(item.pergunta)}</label>
        <textarea id="q_${esc(item.id)}" name="q_${esc(item.id)}" rows="2" placeholder="Sua resposta"></textarea>
      </div>`
        )
        .join('');
      return `<section class="secao">
      <h2>${esc(secao.titulo || '')}</h2>
      ${campos}
    </section>`;
    })
    .join('');

  return pagina(
    'Perfil da modelo',
    `<div class="marca">Lynx</div>
     <h1>Oi${convite?.modelo_nome ? `, ${esc(convite.modelo_nome)}` : ''}!</h1>
     <p class="sub">Preencha seu perfil abaixo. São ${total} perguntas e ele fica salvo assim que você enviar.
     Pode responder no seu tempo: o link vale até ${esc(
       new Date(convite.expira_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
     )}.</p>
     <form method="POST" id="form">
       <input type="hidden" name="token" value="${esc(convite.token)}" />
       ${corpoSecoes}
       <button type="submit" id="enviar">Enviar meu perfil</button>
       <p class="aviso">Se não souber alguma resposta, pode deixar em branco: a equipe completa com você depois.</p>
     </form>
     <script>
       document.getElementById('form').addEventListener('submit', function () {
         var b = document.getElementById('enviar');
         b.disabled = true;
         b.textContent = 'Enviando...';
       });
     </script>`
  );
};

const sucessoHtml = (nome: string, respondidas: number) =>
  pagina(
    'Perfil enviado',
    `<div class="ok">✦</div>
     <div class="marca">Lynx</div>
     <h1>Pronto${nome ? `, ${esc(nome)}` : ''}!</h1>
     <p class="sub">Recebemos seu perfil com ${respondidas} resposta${respondidas === 1 ? '' : 's'}.
     Ele já está no playbook da sua página, e a equipe vai falar com você se precisar de algo.</p>
     <p class="aviso">Este link não abre mais. Para mudar alguma resposta, fale com a agência.</p>`
  );

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);

    const buscarConvite = async (token: string) => {
      if (!token || token.length < 20) return null;
      const achados = lista(
        await base44.asServiceRole.entities.PlaybookConvite.filter({ token })
      );
      return achados[0] || null;
    };

    /* ---------------- GET: mostra o formulário ---------------- */
    if (req.method === 'GET') {
      const token = url.searchParams.get('token') || '';
      const convite = await buscarConvite(token);

      if (!convite) {
        return respostaHtml(
          paginaErro('Link inválido', 'Este link não existe ou foi substituído por outro.'),
          404
        );
      }
      if (convite.status === 'respondido') {
        return respostaHtml(
          paginaErro('Perfil já enviado', 'Este link já foi usado. Suas respostas estão com a equipe.'),
          410
        );
      }
      if (vencido(convite)) {
        await base44.asServiceRole.entities.PlaybookConvite
          .update(convite.id, { status: 'expirado' })
          .catch(() => null);
        return respostaHtml(
          paginaErro('Link vencido', 'Este link passou da validade. A agência pode gerar um novo.'),
          410
        );
      }

      return respostaHtml(formularioHtml(convite), 200);
    }

    /* ---------------- POST: grava as respostas ---------------- */
    if (req.method === 'POST') {
      const texto = await req.text();
      const params = new URLSearchParams(texto);
      const token = params.get('token') || '';
      const convite = await buscarConvite(token);

      if (!convite) {
        return respostaHtml(
          paginaErro('Link inválido', 'Este link não existe ou foi substituído por outro.'),
          404
        );
      }
      if (convite.status === 'respondido') {
        return respostaHtml(
          paginaErro('Perfil já enviado', 'Este link já foi usado. Suas respostas estão com a equipe.'),
          410
        );
      }
      if (vencido(convite)) {
        await base44.asServiceRole.entities.PlaybookConvite
          .update(convite.id, { status: 'expirado' })
          .catch(() => null);
        return respostaHtml(
          paginaErro('Link vencido', 'Este link passou da validade. A agência pode gerar um novo.'),
          410
        );
      }

      const limpar = (valor: string | null) => String(valor ?? '').trim().slice(0, 4000);

      const secoes = (Array.isArray(convite.secoes) ? convite.secoes : []).map((secao: any) => ({
        id: String(secao?.id || ''),
        titulo: String(secao?.titulo || ''),
        texto: '',
        itens: (Array.isArray(secao?.itens) ? secao.itens : []).map((item: any) => ({
          id: String(item?.id || ''),
          pergunta: String(item?.pergunta || ''),
          resposta: limpar(params.get(`q_${item.id}`)),
          copiar: Boolean(item?.copiar),
        })),
      }));

      let respondidas = 0;
      secoes.forEach((secao: any) => {
        secao.itens.forEach((item: any) => {
          if (item.resposta) respondidas += 1;
        });
      });

      /* O playbook da modelo: o do convite, ou o dela pelo modelo_id. */
      let playbook: any = null;
      if (convite.playbook_id) {
        playbook = await base44.asServiceRole.entities.Playbook
          .get(convite.playbook_id)
          .catch(() => null);
      }
      if (!playbook && convite.modelo_id) {
        const achados = lista(
          await base44.asServiceRole.entities.Playbook.filter({
            modelo_id: convite.modelo_id,
            tipo: 'modelo',
          }).catch(() => [])
        );
        playbook = achados[0] || null;
      }

      const modelo = convite.modelo_id
        ? await base44.asServiceRole.entities.Modelo.get(convite.modelo_id).catch(() => null)
        : null;

      if (playbook?.id) {
        await base44.asServiceRole.entities.Playbook.update(playbook.id, {
          secoes,
          atualizado_por_nome: 'Formulário da modelo',
        });
      } else {
        const criado = await base44.asServiceRole.entities.Playbook.create({
          tipo: 'modelo',
          modelo_id: convite.modelo_id || '',
          titulo: convite.modelo_nome || modelo?.nome || 'Modelo',
          resumo: `Diretrizes da modelo ${convite.modelo_nome || modelo?.nome || ''}.`.trim(),
          secoes,
          arquivado: false,
          atualizado_por_nome: 'Formulário da modelo',
        });
        playbook = criado;
      }

      await base44.asServiceRole.entities.PlaybookConvite.update(convite.id, {
        status: 'respondido',
        respondido_em: new Date().toISOString(),
        playbook_id: playbook?.id || convite.playbook_id || '',
      }).catch(() => null);

      return respostaHtml(sucessoHtml(convite.modelo_nome || modelo?.nome || '', respondidas), 200);
    }

    return new Response('Método não suportado', { status: 405 });
  } catch (erro: any) {
    console.error('[playbookFormulario]', erro);
    return respostaHtml(
      paginaErro('Algo deu errado', 'Não consegui abrir o formulário agora. Tente de novo em instantes.'),
      500
    );
  }
}
