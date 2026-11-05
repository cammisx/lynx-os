/**
 * Cutucadas com sequência ("streak").
 *
 * Regra combinada: a janela de 24h começa quando a pessoa ABRE a notificação,
 * e não tem prazo para abrir. Enquanto ninguém abriu, a cutucada fica no ar.
 * Se a devolução vier em menos de 24h depois da abertura, a sequência cresce;
 * se passar disso, recomeça em 1.
 */

import { base44 } from '@/api/base44Client';
import { emitNotificationsChanged } from '@/lib/desktopEvents';

export const JANELA_MS = 24 * 60 * 60 * 1000;

/** A partir daqui a notificação mostra o contador e o foguinho. */
export const SEQUENCIA_COM_FOGUINHO = 4;

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const emMs = (valor) => {
  if (!valor) return null;
  const tempo = new Date(valor).getTime();
  return Number.isNaN(tempo) ? null : tempo;
};

/** Qual sequência a devolução que está sendo enviada agora vale. */
export const proximaSequencia = (anterior, agora = Date.now()) => {
  if (!anterior) return 1;
  const aberta = emMs(anterior.aberta_em);
  /* Ninguém abriu: a sequência não existe ainda, começa do 1. */
  if (aberta === null) return 1;
  /* Abriu, mas deixou passar mais de 24h: recomeça. */
  if (agora - aberta > JANELA_MS) return 1;
  return (Number(anterior.sequencia) || 1) + 1;
};

/** A janela de 24h da abertura já passou? (sem abertura, nunca vence.) */
export const respostaVencida = (cutucada, agora = Date.now()) => {
  const aberta = emMs(cutucada?.aberta_em);
  if (aberta === null) return false;
  return agora - aberta > JANELA_MS;
};

export const textoDaCutucada = (nome, sequencia) => {
  const quem = nome || 'Alguém';
  const numero = Math.max(1, Number(sequencia) || 1);
  if (numero >= SEQUENCIA_COM_FOGUINHO) {
    return {
      titulo: `${quem} te cutucou ${numero} vezes seguidas`,
      mensagem: 'A sequência está pegando fogo. Cutuque de volta para continuar.',
      foguinho: true,
    };
  }
  return {
    titulo: `${quem} te cutucou`,
    mensagem: 'Toque para ver e cutucar de volta.',
    foguinho: false,
  };
};

const buscarCutucada = async (id) => {
  if (!id) return null;
  const entidade = base44.entities.Cutucada;
  try {
    const item = await entidade.get(id);
    if (item?.id) return item;
  } catch (falha) {
    // sem get por id, tenta pela lista
  }
  const lista = asList(await entidade.filter({ id }, '-created_date', 1, 0));
  return lista[0] || null;
};

/** Marca que a pessoa abriu a notificação: é aqui que a janela de 24h começa. */
export const registrarAbertura = async (cutucadaId) => {
  if (!cutucadaId) return null;
  const cutucada = await buscarCutucada(cutucadaId);
  if (!cutucada) return null;
  if (cutucada.aberta_em) return cutucada;
  const agora = new Date().toISOString();
  try {
    await base44.entities.Cutucada.update(cutucadaId, { aberta_em: agora });
  } catch (falha) {
    console.warn('[Cutucada] não consegui registrar a abertura', falha);
  }
  return { ...cutucada, aberta_em: agora };
};

/**
 * Envia uma cutucada de `de` para `para`. Se existir uma cutucada do outro
 * esperando devolução e ela estiver dentro da janela, cresce a sequência e
 * fecha a anterior.
 */
export const enviarCutucada = async (de, para) => {
  if (!de?.id || !para?.id) return null;
  if (de.id === para.id) return null;

  let anterior = null;
  try {
    const recebidas = asList(
      await base44.entities.Cutucada.filter(
        { de_id: para.id, para_id: de.id },
        '-created_date',
        10,
        0
      )
    );
    anterior = recebidas.find((item) => !item.respondida) || null;
  } catch (falha) {
    console.warn('[Cutucada] não consegui ver as cutucadas anteriores', falha);
  }

  const sequencia = proximaSequencia(anterior);
  const agora = new Date().toISOString();
  const nome = String(de.nome || '').trim() || 'Alguém';

  const cutucada = await base44.entities.Cutucada.create({
    de_id: de.id,
    de_nome: nome,
    para_id: para.id,
    sequencia,
    respondida: false,
  });

  const texto = textoDaCutucada(nome, sequencia);
  const notificacao = await base44.entities.Notificacao.create({
    usuario_id: para.id,
    titulo: texto.titulo,
    mensagem: texto.mensagem,
    tipo: 'cutucada',
    status: 'pendente',
    lida: false,
    solicitante_id: de.id,
    solicitante_nome: nome,
    cutucada_id: cutucada.id,
    cutucada_sequencia: sequencia,
  });

  if (cutucada?.id && notificacao?.id) {
    await base44.entities.Cutucada
      .update(cutucada.id, { notificacao_id: notificacao.id })
      .catch(() => {});
  }

  /* A devolução fecha a rodada anterior dos dois lados, mesmo quando a
     sequência recomeçou (a pessoa demorou mais de 24h desde a abertura). */
  if (anterior) {
    await base44.entities.Cutucada
      .update(anterior.id, { respondida: true, respondida_em: agora })
      .catch(() => {});
    if (anterior.notificacao_id) {
      await base44.entities.Notificacao
        .update(anterior.notificacao_id, { status: 'resolvida' })
        .catch(() => {});
    }
  }

  emitNotificationsChanged();
  return { sequencia, notificacao };
};
