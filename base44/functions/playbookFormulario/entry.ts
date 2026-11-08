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
//
// Os campos seguem o formulário original da agência: texto curto, texto longo,
// data, escolha única, várias escolhas, cada um podendo ter "Outro" e ser
// obrigatório.

const lista = (resultado: any) =>
  Array.isArray(resultado) ? resultado : resultado?.items || [];

const esc = (valor: any) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const OUTRO = '__outro__';

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
    padding: 26px 16px 56px;
    background: #0c0a11;
    background-image: radial-gradient(1100px 480px at 50% -10%, rgba(156,120,54,0.20), transparent 65%);
    color: #ece7f3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 680px; margin: 0 auto; }
  .marca { font-size: 10.5px; letter-spacing: 0.28em; text-transform: uppercase; color: #c9a55c; margin-bottom: 8px; }
  h1 { font-size: 21px; line-height: 1.3; margin: 0 0 10px; font-weight: 600; }
  .topo { border-bottom: 1px solid rgba(201,165,92,0.22); padding-bottom: 18px; margin-bottom: 20px; }
  .topo p { color: #a99fb8; font-size: 13.5px; margin: 0 0 10px; white-space: pre-line; }
  .alerta {
    padding: 11px 13px; border-radius: 11px; margin-bottom: 18px;
    background: rgba(214,92,92,0.12); border: 1px solid rgba(214,92,92,0.45);
    color: #f0c2c2; font-size: 13px;
  }
  .secao {
    margin: 0 0 18px; padding: 16px 15px 4px;
    border: 1px solid rgba(201,165,92,0.20);
    border-radius: 14px;
    background: rgba(255,255,255,0.032);
  }
  .secao > h2 {
    font-size: 11.5px; letter-spacing: 0.16em; text-transform: uppercase;
    color: #c9a55c; margin: 0 0 10px; font-weight: 600;
  }
  .secao > .desc { font-size: 12.5px; color: #a99fb8; margin: 0 0 14px; white-space: pre-line; }
  .campo { margin-bottom: 18px; }
  .campo > .pergunta { display: block; font-size: 13.5px; color: #ece7f3; margin-bottom: 7px; }
  .obrig { color: #c9a55c; }
  input[type="text"], input[type="date"], textarea {
    width: 100%; padding: 10px 12px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.13);
    background: rgba(0,0,0,0.30); color: #ece7f3;
    font-family: inherit; font-size: 15px; line-height: 1.5;
  }
  textarea { min-height: 54px; resize: vertical; }
  input:focus, textarea:focus { outline: none; border-color: #c9a55c; box-shadow: 0 0 0 3px rgba(201,165,92,0.16); }
  .grupo { display: flex; flex-direction: column; gap: 7px; }
  .opcao { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #ddd6ea; }
  .opcao input[type="radio"], .opcao input[type="checkbox"] {
    margin: 3px 0 0; width: 18px; height: 18px; accent-color: #c9a55c; flex-shrink: 0;
  }
  .outro-texto { margin: 4px 0 0 28px; }
  .erro { color: #ff9d9d; font-size: 12.5px; margin-top: 7px; }
  .campo.ruim input[type="text"], .campo.ruim textarea, .campo.ruim .grupo { border-color: rgba(214,92,92,0.6); }
  button {
    width: 100%; margin-top: 20px; padding: 15px 20px;
    border: 0; border-radius: 12px;
    background: linear-gradient(180deg, #d8b874, #b8934a);
    color: #201a10; font-size: 15px; font-weight: 700; cursor: pointer;
  }
  button:disabled { opacity: 0.6; }
  .aviso { font-size: 12.5px; color: #a99fb8; margin-top: 16px; }
  .ok { font-size: 44px; line-height: 1; margin-bottom: 14px; }
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
     <p class="aviso">${esc(mensagem)}</p>
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

const tipoDe = (item: any) => item?.tipo || 'longo';

/* A data vem do <input type="date"> como AAAA-MM-DD e é guardada como
   DD/MM/AAAA, que é como a equipe lê no playbook. */
const dataBr = (iso: string) => {
  const partes = String(iso || '').split('-');
  if (partes.length !== 3) return iso;
  const [ano, mes, dia] = partes;
  if (ano.length !== 4) return iso;
  return `${dia}/${mes}/${ano}`;
};

type Valores = Record<string, string[]>;

const valorDe = (valores: Valores, item: any) => {
  const bruto = valores[`q_${item.id}`] || [];
  const outro = String(valores[`q_${item.id}__outro`]?.[0] || '').trim();
  const tipo = tipoDe(item);

  if (tipo === 'radio') {
    const escolhido = String(bruto[0] || '');
    if (!escolhido) return '';
    if (escolhido === OUTRO) return outro;
    return escolhido;
  }

  if (tipo === 'checkbox') {
    const marcados = bruto.map(String);
    const textos = marcados.filter((valor) => valor !== OUTRO);
    const temOutro = marcados.includes(OUTRO);
    if (temOutro && outro) textos.push(outro);
    return textos.join(', ');
  }

  const texto = String(bruto[0] || '').trim();
  if (tipo === 'data' && texto) return dataBr(texto);
  return texto;
};

const faltaResponder = (valores: Valores, item: any) => {
  if (!item?.obrigatoria) return false;
  return !String(valorDe(valores, item) || '').trim();
};

const campoHtml = (item: any, valores: Valores) => {
  const nome = `q_${item.id}`;
  const tipo = tipoDe(item);
  const bruto = (valores[nome] || []).map(String);
  const outroAtual = String(valores[`${nome}__outro`]?.[0] || '');

  if (tipo === 'curto') {
    return `<input type="text" id="${esc(nome)}" name="${esc(nome)}" value="${esc(
      valores[nome]?.[0] || ''
    )}" ${item?.obrigatoria ? 'required' : ''} />`;
  }

  if (tipo === 'longo') {
    return `<textarea id="${esc(nome)}" name="${esc(nome)}" rows="3" ${
      item?.obrigatoria ? 'required' : ''
    }>${esc(valores[nome]?.[0] || '')}</textarea>`;
  }

  if (tipo === 'data') {
    const valor = String(valores[nome]?.[0] || '');
    return `<input type="date" id="${esc(nome)}" name="${esc(nome)}" value="${esc(valor)}" ${
      item?.obrigatoria ? 'required' : ''
    } />`;
  }

  const opcoes = (Array.isArray(item?.opcoes) ? item.opcoes : []).filter((opcao: string) =>
    String(opcao || '').trim()
  );
  const tipoInput = tipo === 'radio' ? 'radio' : 'checkbox';
  const escolhidoOutro = tipo === 'radio' ? bruto[0] === OUTRO : bruto.includes(OUTRO);

  const linhas = opcoes
    .map((opcao: string) => {
      const marcado =
        tipo === 'radio' ? bruto[0] === opcao : bruto.includes(opcao);
      return `<label class="opcao"><input type="${tipoInput}" name="${esc(nome)}" value="${esc(
        opcao
      )}" ${marcado ? 'checked' : ''} ${item?.obrigatoria ? 'required' : ''} /> <span>${esc(
        opcao
      )}</span></label>`;
    })
    .join('');

  const linhaOutro = item?.outro
    ? `<label class="opcao"><input type="${tipoInput}" name="${esc(nome)}" value="${OUTRO}" ${
        escolhidoOutro ? 'checked' : ''
      } ${item?.obrigatoria ? 'required' : ''} /> <span>Outro:</span></label>
       <div class="outro-texto"><input type="text" name="${esc(nome)}__outro" value="${esc(
         outroAtual
       )}" placeholder="Escreva aqui" /></div>`
    : '';

  return `<div class="grupo" ${item?.obrigatoria ? 'data-obrigatoria="1"' : ''}>${linhas}${linhaOutro}</div>`;
};

const formularioHtml = (convite: any, valores: Valores = {}, erros: Set<string> = new Set()) => {
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
        .map((item: any) => {
          const comErro = erros.has(item.id);
          return `<div class="campo${comErro ? ' ruim' : ''}">
        <label class="pergunta" for="q_${esc(item.id)}">${esc(item.pergunta)}${
            item?.obrigatoria ? '<span class="obrig"> *</span>' : ''
          }</label>
        ${campoHtml(item, valores)}
        ${comErro ? '<div class="erro">Responda esta pergunta para enviar.</div>' : ''}
      </div>`;
        })
        .join('');

      return `<section class="secao">
      <h2>${esc(secao.titulo || '')}</h2>
      ${secao.descricao ? `<p class="desc">${esc(secao.descricao)}</p>` : ''}
      ${campos}
    </section>`;
    })
    .join('');

  const avisoErro = erros.size
    ? `<div class="alerta">Faltam ${erros.size} resposta${erros.size === 1 ? '' : 's'} obrigatória${
        erros.size === 1 ? '' : 's'
      }. Confira os campos destacados abaixo.</div>`
    : '';

  return pagina(
    convite?.titulo || 'Perfil da modelo',
    `<div class="topo">
       <div class="marca">Lynx</div>
       <h1>${esc(convite?.titulo || 'Perfil da modelo')}</h1>
       ${convite?.modelo_nome ? `<p>Modelo: <strong>${esc(convite.modelo_nome)}</strong></p>` : ''}
       ${convite?.descricao ? `<p>${esc(convite.descricao)}</p>` : ''}
       <p>São ${total} perguntas. O link vale até ${esc(
         new Date(convite.expira_em).toLocaleDateString('pt-BR', {
           day: '2-digit',
           month: '2-digit',
         })
       )}.</p>
     </div>
     ${avisoErro}
     <form method="POST" id="form" novalidate>
       <input type="hidden" name="token" value="${esc(convite.token)}" />
       ${corpoSecoes}
       <button type="submit" id="enviar">Enviar meu perfil</button>
       <p class="aviso">As perguntas com <span class="obrig">*</span> são obrigatórias. Perguntas de escolha
       aceitam "Outro" quando você quiser responder com suas palavras.</p>
     </form>
     <script>
       (function () {
         var form = document.getElementById('form');
         form.addEventListener('submit', function (evento) {
           var faltando = [];
           var grupos = form.querySelectorAll('.grupo[data-obrigatoria]');
           for (var i = 0; i < grupos.length; i++) {
             var caixas = grupos[i].querySelectorAll('input[type=checkbox]');
             if (!caixas.length) continue;
             var marcou = false;
             for (var j = 0; j < caixas.length; j++) {
               if (caixas[j].checked) { marcou = true; break; }
             }
             if (!marcou) faltando.push(grupos[i].closest('.campo'));
           }
           if (faltando.length) {
             evento.preventDefault();
             for (var k = 0; k < faltando.length; k++) faltando[k].classList.add('ruim');
             faltando[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
             return;
           }
           var b = document.getElementById('enviar');
           b.disabled = true;
           b.textContent = 'Enviando...';
         });
       })();
     </script>`
  );
};

const sucessoHtml = (nome: string, respondidas: number) =>
  pagina(
    'Perfil enviado',
    `<div class="ok">✦</div>
     <div class="marca">Lynx</div>
     <h1>Pronto${nome ? `, ${esc(nome)}` : ''}!</h1>
     <p class="aviso">Recebemos seu perfil com ${respondidas} resposta${
       respondidas === 1 ? '' : 's'
     }. Ele já está no playbook da sua página, e a equipe vai falar com você se precisar de algo.</p>
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
      const textoBruto = await req.text();
      const params = new URLSearchParams(textoBruto);
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

      /* Junta tudo o que veio, por nome de campo. */
      const valores: Valores = {};
      params.forEach((valor, chave) => {
        if (chave === 'token') return;
        valores[chave] = valores[chave] ? [...valores[chave], valor] : [valor];
      });

      const secoesBase = Array.isArray(convite.secoes) ? convite.secoes : [];

      /* Obrigatória sem resposta barra o envio, como no formulário original. */
      const faltando = new Set<string>();
      secoesBase.forEach((secao: any) => {
        (Array.isArray(secao?.itens) ? secao.itens : []).forEach((item: any) => {
          if (faltaResponder(valores, item)) faltando.add(item.id);
        });
      });

      if (faltando.size) {
        return respostaHtml(formularioHtml(convite, valores, faltando), 200);
      }

      const limpar = (valor: any) => String(valor ?? '').trim().slice(0, 4000);

      const secoes = secoesBase.map((secao: any) => ({
        id: String(secao?.id || ''),
        titulo: String(secao?.titulo || ''),
        descricao: String(secao?.descricao || ''),
        texto: '',
        itens: (Array.isArray(secao?.itens) ? secao.itens : []).map((item: any) => ({
          id: String(item?.id || ''),
          pergunta: String(item?.pergunta || ''), 
          tipo: tipoDe(item),
          opcoes: Array.isArray(item?.opcoes) ? item.opcoes : [],
          outro: Boolean(item?.outro),
          obrigatoria: Boolean(item?.obrigatoria),
          resposta: limpar(valorDe(valores, item)),
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
