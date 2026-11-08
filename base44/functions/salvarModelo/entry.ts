import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Grava a modelo (criar ou editar) com a lista de chatters e os centavos de
// cada um. Também roda com service role: sem isso o admin de uma conta sob
// RLS vê o formulário salvar sem nada acontecer na entidade.
//
// Payload: { id?, nome, comissao_agencia, janela_operacao?, chatters: [{ usuario_id, usuario_nome, identificador }] }

const semAcento = (valor: any) => String(valor ?? '').trim();

/** 'HH:MM' válido vira 'HH:MM'; qualquer outra coisa vira vazio (24h). */
const horaValida = (valor: any) => {
  const bruto = String(valor ?? '').trim();
  const achado = bruto.match(/^(\d{1,2}):(\d{2})$/);
  if (!achado) return '';
  const horas = Number(achado[1]);
  const minutos = Number(achado[2]);
  if (horas > 23 || minutos > 59) return '';
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
};

/**
 * Janela de operação: sete itens, um por dia da semana, do domingo ao sábado.
 * Dia sem início e fim válidos fica vazio, e vazio significa 24 horas.
 */
const limparJanela = (janela: any) => {
  const lista = Array.isArray(janela) ? janela : [];
  return Array.from({ length: 7 }, (_, dia) => {
    const item = lista[dia];
    const inicio = horaValida(item?.inicio);
    const fim = horaValida(item?.fim);
    if (!inicio || !fim || fim <= inicio) return {};
    return { inicio, fim };
  });
};

const limparChatters = (chatters: any) => {
  const saida: any[] = [];
  const vistos = new Set<string>();

  (Array.isArray(chatters) ? chatters : []).forEach((chatter: any) => {
    const usuarioId = semAcento(chatter?.usuario_id);
    if (!usuarioId || vistos.has(usuarioId)) return;
    vistos.add(usuarioId);

    const bruto = String(chatter?.identificador ?? '').replace(/\D/g, '').slice(0, 2);
    if (bruto && !/^\d{2}$/.test(bruto)) return;

    saida.push({
      usuario_id: usuarioId,
      usuario_nome: semAcento(chatter?.usuario_nome),
      identificador: bruto,
    });
  });

  const repetidos = saida
    .filter((item) => item.identificador)
    .map((item) => item.identificador)
    .filter((valor, indice, todos) => todos.indexOf(valor) !== indice);

  if (repetidos.length) {
    const erro: any = new Error(`Centavos repetidos: ${[...new Set(repetidos)].join(', ')}`);
    erro.status = 422;
    throw erro;
  }

  return saida;
};

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

    const corpo = await req.json().catch(() => ({}));
    const nome = semAcento(corpo?.nome);
    if (!nome) {
      return Response.json({ ok: false, error: 'Informe o nome da modelo.' }, { status: 422 });
    }

    const percentual = Math.min(
      100,
      Math.max(0, Number(String(corpo?.comissao_agencia ?? 50).replace(',', '.')) || 0)
    );
    const chatters = limparChatters(corpo?.chatters);

    const dados: any = { nome, chatters, comissao_agencia: percentual };
    if (corpo?.janela_operacao !== undefined) {
      dados.janela_operacao = limparJanela(corpo.janela_operacao);
    }

    const modelo = corpo?.id
      ? await base44.asServiceRole.entities.Modelo.update(String(corpo.id), dados)
      : await base44.asServiceRole.entities.Modelo.create(dados);

    return Response.json({ ok: true, modelo });
  } catch (erro: any) {
    const status = Number(erro?.status) || 500;
    return Response.json(
      { ok: false, error: String(erro?.message || erro || 'Falha ao salvar a modelo') },
      { status }
    );
  }
});
