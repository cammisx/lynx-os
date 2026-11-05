/**
 * Leitura do extrato e atribuição de cada venda ao chatter.
 *
 * Regras combinadas com a Chloë:
 * - Venda comum: o centavo do valor BRUTO é o identificador de dois dígitos que
 *   o chatter tem naquela modelo (R$ 14,07 é do chatter 07).
 * - Mimo / venda internacional: nunca tem o centavo, porque o chatter já lançou
 *   pelo widget. Então o extrato serve de conferência: se o registro existe, a
 *   venda é atribuída a quem lançou e não é duplicada.
 *
 * A entrada principal é a planilha .xlsx exportada pelo Privacy; o texto colado
 * continua aceito pelo mesmo conferidor.
 */

import parsePrivacy from '@/lib/privacyParser';

const TIPO_MIMO = /mimo|internacional|gift|presente|gorjeta|tip\b/i;

const semAcento = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const chaveColuna = (value) => semAcento(value).replace(/[^a-z0-9]/g, '');

export const valorNumerico = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const texto = String(value ?? '').trim();
  if (!texto) return 0;
  const limpo = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number.parseFloat(limpo);
  return Number.isFinite(numero) ? numero : 0;
};

const numeroOuNulo = (value) => {
  const texto = String(value ?? '').trim();
  if (!texto) return null;
  return valorNumerico(texto);
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

export const ehMimo = (item) =>
  TIPO_MIMO.test(String(item?.tipo || '')) || /internacional/i.test(String(item?.tipo_venda || ''));

const diaDe = (iso) => String(iso || '').slice(0, 10);

const mesmaVenda = (item, venda) => {
  if (venda?.modelo_id && item.modelo_id && venda.modelo_id !== item.modelo_id) return false;
  if (Math.abs(valorNumerico(venda?.bruto) - valorNumerico(item?.bruto)) > 0.005) return false;
  if (item.comprador_id && venda?.comprador_id) {
    return item.comprador_id === venda.comprador_id;
  }
  if (semAcento(venda?.usuario_plataforma) !== semAcento(item?.usuario_plataforma)) return false;
  return diaDe(venda?.ocorrido_em) === diaDe(item?.ocorrido_em);
};

const acharExistente = (item, existentes) => {
  const doDia = existentes.filter((venda) => mesmaVenda(item, venda));
  if (!doDia.length) return null;
  // 1) mesmo instante, 2) mesmo tipo no dia, 3) qualquer registro do dia.
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
  nao_confirmada: {
    rotulo: 'Não confirmada',
    cor: '#e8b93b',
    texto: 'A situação do registro no extrato não é "Pagamento confirmado".',
  },
  duplicado: {
    rotulo: 'Duplicada no arquivo',
    cor: 'var(--c2)',
    texto: 'O mesmo registro apareceu duas vezes no extrato.',
  },
};

/** Cabeçalho da planilha do Privacy -> campo do registro. */
const COLUNAS = {
  data: 'data',
  hora: 'hora',
  valordavenda: 'bruto',
  suacomissao: 'liquido',
  tipodeentrada: 'tipo',
  formadepagamento: 'metodo',
  idusuariocomprador: 'comprador_id',
  comprador: 'usuario_plataforma',
  tipovenda: 'tipo_venda',
  vendedor: 'vendedor',
  situacao: 'situacao',
};

const dataHora = (data, hora) => {
  const achado = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(data || '').trim());
  if (!achado) return null;
  const [, dia, mes, ano] = achado;
  const relogio = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(hora || '').trim());
  const date = new Date(
    Number(ano.length <= 2 ? `20${ano}` : ano),
    Number(mes) - 1,
    Number(dia),
    relogio ? Number(relogio[1]) : 0,
    relogio ? Number(relogio[2]) : 0,
    relogio ? Number(relogio[3] || 0) : 0
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Matriz da planilha -> itens no mesmo formato do texto colado. */
export const itensDaPlanilha = (linhas = []) => {
  if (!linhas.length) return [];
  const cabecalho = linhas[0].map(chaveColuna);
  const indice = {};
  cabecalho.forEach((nome, posicao) => {
    const campo = COLUNAS[nome];
    if (campo) indice[campo] = posicao;
  });
  if (indice.bruto === undefined || indice.data === undefined) {
    throw new Error('Planilha fora do formato do extrato do Privacy.');
  }

  return linhas
    .slice(1)
    .filter((linha) => linha.some((celula) => String(celula || '').trim() !== ''))
    .map((linha) => {
      const pegar = (campo) => (indice[campo] === undefined ? '' : linha[indice[campo]] || '');
      const bruto = numeroOuNulo(pegar('bruto'));
      const liquido = numeroOuNulo(pegar('liquido'));
      const item = {
        ocorrido_em: dataHora(pegar('data'), pegar('hora')),
        usuario_plataforma: String(pegar('usuario_plataforma') || '').trim(),
        comprador_id: String(pegar('comprador_id') || '').trim(),
        tipo: String(pegar('tipo') || '').trim(),
        tipo_venda: String(pegar('tipo_venda') || '').trim(),
        vendedor: String(pegar('vendedor') || '').trim(),
        situacao: String(pegar('situacao') || '').trim(),
        metodo: String(pegar('metodo') || '').trim(),
        bruto,
        liquido: liquido === null ? bruto : liquido,
        moeda: 'BRL',
        faltando: [],
      };
      if (!item.ocorrido_em) item.faltando.push('data');
      if (!item.usuario_plataforma) item.faltando.push('comprador');
      if (bruto === null) item.faltando.push('valor da venda');
      if (!item.tipo) item.faltando.push('tipo de entrada');
      return item;
    });
};

/**
 * Lê as vendas (planilha ou texto colado) e devolve uma linha por venda, já com
 * o chatter atribuído e a situação de cada uma. Nada é salvo aqui.
 */
export const conferirExtrato = ({ itens: itensProntos, texto, modelo, existentes = [] }) => {
  const itens = itensProntos || parsePrivacy(texto || '').itens;
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
    const confirmada = !base.situacao || /confirmad/i.test(base.situacao);
    let situacao = 'sem_dono';

    if (!confirmada) situacao = 'nao_confirmada';
    else if (vistos.has(chave)) situacao = 'duplicado';
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
      naoConfirmadas: contaSituacao('nao_confirmada'),
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
  comprador_id: linha.comprador_id || '',
  tipo: linha.tipo,
  tipo_venda: linha.tipo_venda || '',
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
