/**
 * Avisos por e-mail do chat.
 *
 * Duas escolhas por pessoa, guardadas em PreferenciaSom:
 *  - notificar_email (menções) — vem ligado por padrão;
 *  - email_todas (tudo o que passa nos canais dela) — vem desligado.
 *
 * O envio usa a integração de e-mail da plataforma. Se ela não estiver
 * disponível, nada quebra: a mensagem já foi gravada e o aviso do sino
 * continua funcionando.
 */
import { base44 } from '@/api/base44Client';
import { primeiroNome, resumoDaMensagem } from '@/lib/mencoes';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

export const PADRAO_EMAIL = {
  notificar_email: true,
  email_todas: false,
  email: '',
  notificar_navegador: false,
};

/** Trava para "todas as mensagens" não virar enxurrada numa conversa rápida. */
const ESPERA_ENTRE_AVISOS_MS = 10 * 60 * 1000;

const chaveDoAviso = (usuarioId, canalId) => `lynx:email-aviso:${usuarioId}:${canalId}`;

const podeAvisarAgora = (usuarioId, canalId) => {
  try {
    const ultimo = Number(window.localStorage.getItem(chaveDoAviso(usuarioId, canalId)) || 0);
    return Date.now() - ultimo > ESPERA_ENTRE_AVISOS_MS;
  } catch (erro) {
    return true;
  }
};

const marcarAviso = (usuarioId, canalId) => {
  try {
    window.localStorage.setItem(chaveDoAviso(usuarioId, canalId), String(Date.now()));
  } catch (erro) {
    // sem storage: sem trava, mas o e-mail sai igual
  }
};

/** Preferências de todo mundo, por usuario_id. Quem não tem registro usa o padrão. */
export const carregarPreferenciasDeEmail = async () => {
  try {
    const registros = asList(await base44.entities.PreferenciaSom.list());
    const mapa = new Map();
    registros.forEach((registro) => {
      if (!registro?.usuario_id) return;
      mapa.set(registro.usuario_id, {
        notificar_email: registro.notificar_email !== false,
        email_todas: registro.email_todas === true,
        email: String(registro.email || '').trim(),
        notificar_navegador: registro.notificar_navegador === true,
      });
    });
    return mapa;
  } catch (erro) {
    console.warn('[email] não consegui ler as preferências', erro?.message || erro);
    return new Map();
  }
};

const enderecoDe = (preferencia, pessoa) =>
  String(preferencia?.email || pessoa?.email || '').trim();

const linkDoApp = () => {
  try {
    return `${window.location.origin}`;
  } catch (erro) {
    return '';
  }
};

const corpoDoEmail = ({ titulo, autor, canal, trecho, tipo, quando }) => {
  const linhas = [
    titulo,
    '',
    `${autor} em ${canal || 'uma conversa do chat'}:`,
    `"${trecho || 'enviou um anexo'}"`,
    '',
    `${quando}`,
  ];
  if (tipo === 'todos') {
    linhas.push('', 'Esta mensagem chamou todo mundo do canal.');
  }
  const link = linkDoApp();
  if (link) linhas.push('', `Abrir o Lynx OS: ${link}`);
  linhas.push('', 'Para mudar o que você recebe por e-mail, abra o chat e clique na engrenagem.');
  return linhas.join('\n');
};

const enviar = async ({ para, assunto, corpo, de }) => {
  if (!para || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return false;
  try {
    await base44.integrations.Core.SendEmail({
      to: para,
      subject: assunto,
      body: corpo,
      from_name: de || 'Lynx OS',
    });
    return true;
  } catch (erro) {
    console.warn('[email] não consegui enviar o aviso', erro?.message || erro);
    return false;
  }
};

/**
 * Envia os avisos de uma mensagem nova.
 * Uma pessoa mencionada recebe o e-mail de menção; quem marcou "todas as
 * mensagens" recebe o de mensagem comum (sem repetir para quem já foi
 * mencionado).
 */
export const avisarPorEmail = async ({
  canal,
  mensagem,
  autorId,
  autorNome,
  pessoas = [],
  mencionados = [],
}) => {
  if (!canal?.id || !mensagem) return [];

  const quemFoiMencionado = new Set(mencionados.filter(Boolean));
  const destinatarios = (Array.isArray(pessoas) ? pessoas : []).filter(
    (pessoa) => pessoa?.id && pessoa.id !== autorId
  );
  if (!destinatarios.length) return [];

  const preferencias = await carregarPreferenciasDeEmail();
  const trecho = resumoDaMensagem(mensagem.texto) || (mensagem.anexo_url ? '' : '');
  const quando = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const autor = primeiroNome(autorNome) || 'Alguém';
  const canalNome = canal.nome || 'Chat';

  const envios = [];

  for (const pessoa of destinatarios) {
    const preferencia = preferencias.get(pessoa.id) || PADRAO_EMAIL;
    const para = enderecoDe(preferencia, pessoa);
    if (!para) continue;

    const mencionada = quemFoiMencionado.has(pessoa.id);

    /* Quem desmarcou as menções mas marcou "todas as mensagens" recebe a
       mensagem como qualquer outra, não o aviso de menção. */
    const emailDeMencao = mencionada && preferencia.notificar_email !== false;
    const emailDeTudo = !emailDeMencao && preferencia.email_todas === true;

    if (emailDeMencao) {
      const assunto = `${autor} te mencionou em ${canalNome}`;
      const corpo = corpoDoEmail({
        titulo: `Olá, ${primeiroNome(pessoa.nome)}. Você foi mencionado no chat.`,
        autor,
        canal: canalNome,
        trecho,
        tipo: 'mencao',
        quando,
      });
      const ok = await enviar({ para, assunto, corpo, de: 'Lynx OS · Chat' });
      if (ok) envios.push({ usuario_id: pessoa.id, tipo: 'mencao', para });
      continue;
    }

    if (!emailDeTudo) continue;
    if (!podeAvisarAgora(pessoa.id, canal.id)) continue;

    const assunto = `Nova mensagem de ${autor} em ${canalNome}`;
    const corpo = corpoDoEmail({
      titulo: `Olá, ${primeiroNome(pessoa.nome)}. Chegou mensagem no chat.`,
      autor,
      canal: canalNome,
      trecho,
      tipo: 'mensagem',
      quando,
    });
    const ok = await enviar({ para, assunto, corpo, de: 'Lynx OS · Chat' });
    if (ok) {
      marcarAviso(pessoa.id, canal.id);
      envios.push({ usuario_id: pessoa.id, tipo: 'mensagem', para });
    }
  }

  return envios;
};
