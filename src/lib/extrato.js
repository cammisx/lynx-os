/**
 * Leitura do extrato colado e atribuição de cada venda ao chatter.
 *
 * Regras combinadas com a Chloë:
 * - Venda comum: o centavo do valor BRUTO é o identificador de dois dígitos que
 *   o chatter tem naquela modelo (R$ 14,07 é do chatter 07).
 * - Mimo / venda internacional: nunca tem o centavo, porque o chatter já lançou
 *   pelo widget. Então o extrato serve de conferência: se o registro existe, a
 *   venda é atribuída a quem lançou e não é duplicada.
 */

import parsePrivacy from '@/lib/privacyParser';

const TIPO_MIMO = /mimo|internacional|gift|presente|gorjeta|tip\b/i;

const semAcento = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const valorNumerico = (value) => {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : 0;
};

/** Centavo do valor bruto, com dois dígitos: 14,9 -> "90"; 24,84 -> "84". */
export const centavoDe = (valor) => {
  const numero = valorNumerico(valor);
  return String(Math.round(numero * 100) % 100).padStart(2, '0');
};

export const identificadorNormalizado = (value) => {
  const digitos = String(value ?? '').replace(/\D/g, '');
  if (!digitos) return '';
  return digitos.slice(-2).padStart(2, '0');
};

/** identificador -> usuario_id, a partir dos chatters cadastrados na modelo. */
export const mapaIdentificadores = (modelo) => {
  const mapa = new Map();
  (modelo?.chatters || []).forEach((membro) => {
    const identificador = identificadorNormalizado(membro?.identificador);
    if (identificador && membro?.usuario_id) mapa.set(identificador, membro.usuario_id);
  });
  return mapa;
};

export const ehMimo = (item) => TIPO_MIMO.test(String(item?.tipo || ''));

const diaDe = (iso) => String(iso || '').slice(0, 10);

const mesmaVenda = (item, venda) => {
  if (venda?.modelo_id && item.modelo_id && venda.modelo_id !== item.modelo_id) return false;
  if (Math.abs(valorNumerico(venda?.bruto) - valorNumerico(item?.bruto)) > 0.005) return false;
  if (semAcento(venda?.usuario_plataforma) !== semAcento(item?.usuario_plataforma)) return false;
  return diaDe(venda?.ocorrido_em) === diaDe(item?.ocorrido_em);
};

const acharExistente = (item, existentes) => {
  const doDia = existentes.filter((venda) => mesmaVenda(item, venda));
  if (!doDia.length) return null;
  // 1) mesmo instante, 2) mesma pessoa e valor no dia, 3) qualquer registro do dia.
  return (
    doDia.find((venda) => String(venda.ocorrido_em) === String(item.ocorrido_em)) ||
    doDia.find((venda) => semAcento(venda.tipo) === semAcento(item.tipo)) ||
    doDia[0]
  );
};

export const SITUACOES = {
  centavo: {
    rotulo: 'Atribuída',
    cor: '#7bd88f',
    texto: 'Centavo do bruto casa com o identificador do chatter.',
  },
  mimo_registrado: {
    rotulo: 'Mimo conferido',
    cor: '#3B9EFF',
    texto: 'Já foi lançada pelo chatter no widget; confere o registro e não duplica.',
  },
  ja_importada: {
    rotulo: 'Já importada',
    cor: 'var(--c2)',
    texto: 'Essa venda já entrou num extrato anterior.',
  },
  mimo_sem_registro: {
    rotulo: 'Mimo sem registro',
    cor: '#e8b93b',
    texto: 'Venda internacional que ninguém lançou no widget.',
  },
  sem_dono: {
    rotulo: 'Sem dono',
    cor: '#ff6b6b',
    texto: 'Nenhum chatter da modelo tem esse centavo como identificador.',
  },
  duplicado: {
    rotulo: 'Duplicada no texto',
    cor: 'var(--c2)',
    texto: 'O mesmo registro apareceu duas vezes no extrato colado.',
  },
};

/**
 * Lê o texto colado e devolve uma linha por venda, já com o chatter atribuído
 * e a situação de cada uma. Nada é salvo aqui.
 */
export const conferirExtrato = ({ texto, modelo, existentes = [] }) => {
  const { itens } = parsePrivacy(texto || '');
  const identificadores = mapaIdentificadores(modelo);
  const vistos = new Set();

  const linhas = itens.map((item) => {
    const identificador = centavoDe(item.bruto);
    const base = {
      ...item,
      modelo_id: modelo?.id || '',
      modelo_nome: modelo?.nome || '',
      identificador,
    };

    const chave = `${base.ocorrido_em}|${semAcento(base.usuario_plataforma)}|${valorNumerico(
      base.bruto
    ).toFixed(2)}`;

    const existente = acharExistente(base, existentes);
    let situacao = 'sem_dono';

    if (vistos.has(chave)) situacao = 'duplicado';
    else if (existente) situacao = existente.origem === 'extrato' ? 'ja_importada' : 'mimo_registrado';
    else if (identificadores.has(identificador)) situacao = 'centavo';
    else if (ehMimo(base)) situacao = 'mimo_sem_registro';
    else if (item.faltando?.length) situacao = 'sem_dono';

    vistos.add(chave);

    const chatterId =
      situacao === 'mimo_registrado' || situacao === 'ja_importada'
        ? existente?.usuario_id || ''
        : situacao === 'centavo'
          ? identificadores.get(identificador) || ''
          : '';

    return {
      ...base,
      situacao,
      chatter_id: chatterId,
      chatter_nome: existente && chatterId === existente.usuario_id ? existente.usuario_nome || '' : '',
      venda_existente_id: existente?.id || '',
      salvar: situacao === 'centavo' || situacao === 'mimo_sem_registro',
    };
  });

  const contaSituacao = (chave) => linhas.filter((linha) => linha.situacao === chave).length;
  const somaPor = (lista) => lista.reduce((total, linha) => total + valorNumerico(linha.bruto), 0);

  return {
    linhas,
    resumo: {
      total: linhas.length,
      bruto: somaPor(linhas),
      liquido: linhas.reduce((total, linha) => total + valorNumerico(linha.liquido), 0),
      salvar: linhas.filter((linha) => linha.salvar).length,
      brutoSalvar: somaPor(linhas.filter((linha) => linha.salvar)),
      atribuidas: contaSituacao('centavo'),
      mimosConferidos: contaSituacao('mimo_registrado'),
      semDono: contaSituacao('sem_dono') + contaSituacao('mimo_sem_registro'),
      jaImportadas: contaSituacao('ja_importada') + contaSituacao('duplicado'),
    },
  };
};

/** Registro pronto para gravar como VendaMimo do extrato. */
export const paraVendaMimo = (linha, { modelo, chatterNome, lote, admin }) => ({
  usuario_id: linha.chatter_id || admin?.id || '',
  usuario_nome: chatterNome || admin?.full_name || admin?.email || '',
  modelo_id: modelo?.id || linha.modelo_id,
  modelo_nome: modelo?.nome || linha.modelo_nome,
  plataforma: 'privacy',
  usuario_plataforma: linha.usuario_plataforma,
  tipo: linha.tipo,
  bruto: valorNumerico(linha.bruto),
  liquido: valorNumerico(linha.liquido),
  moeda: linha.moeda || 'BRL',
  metodo: linha.metodo || '',
  ocorrido_em: linha.ocorrido_em,
  registro_original: linha.registro_original || '',
  identificador: linha.identificador,
  origem: 'extrato',
  lote,
  status: 'aprovada',
  observacao: linha.situacao === 'mimo_sem_registro' ? 'Mimo sem registro prévio no widget' : '',
});
