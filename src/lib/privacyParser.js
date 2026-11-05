/**
 * Lê o registro copiado do chat do Privacy e devolve os dados estruturados.
 *
 * O bloco colado costuma vir assim:
 *   08/10/2026, 22:39
 *   guti3133
 *   R$ 10,00
 *   R$ 8,00
 *   Pix
 *   Mimo - Chat
 *
 * Vários blocos podem vir colados de uma vez; blocos novos começam na linha de data.
 */

const MOEDAS = {
  'R$': 'BRL',
  'US$': 'USD',
  'U$': 'USD',
  USD: 'USD',
  '$': 'USD',
  '€': 'EUR',
  EUR: 'EUR',
  '£': 'GBP',
  GBP: 'GBP',
};

const DATA_HORA = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})$/;
const SO_DATA = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
const VALOR = /^(R\$|US\$|U\$|USD|EUR|GBP|\$|€|£)\s*([\d.,]+)$/i;
const METODOS = /^(pix|cart[ãa]o|cr[ée]dito|d[ée]bito|credit card|crypto|cripto|transfer[êe]ncia|boleto)\b/i;

const numero = (bruto) => {
  const texto = String(bruto).trim().replace(/\s/g, '');
  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');
  let normalizado = texto;

  if (temVirgula && temPonto) {
    // Formato brasileiro: 1.234,56
    normalizado = texto.lastIndexOf(',') > texto.lastIndexOf('.')
      ? texto.replace(/\./g, '').replace(',', '.')
      : texto.replace(/,/g, '');
  } else if (temVirgula) {
    normalizado = texto.replace(',', '.');
  } else if (temPonto) {
    // 1.234 pode ser milhar ou decimal; assumimos decimal só quando há 1 ou 2 dígitos depois.
    const partes = texto.split('.');
    if (partes[partes.length - 1].length > 2) normalizado = texto.replace(/\./g, '');
  }

  const valor = Number.parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : null;
};

const dataIso = (dia, mes, ano, hora = '0', minuto = '0') => {
  const anoCompleto = ano.length <= 2 ? `20${ano}` : ano;
  const date = new Date(
    Number(anoCompleto),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto),
    0,
    0
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const ehLinhaDeData = (linha) => DATA_HORA.test(linha) || SO_DATA.test(linha);

/** Separa o texto colado em blocos, cada um começando numa linha de data. */
const separarBlocos = (texto) => {
  const linhas = String(texto || '')
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);

  const blocos = [];
  let atual = null;

  linhas.forEach((linha) => {
    if (ehLinhaDeData(linha)) {
      if (atual) blocos.push(atual);
      atual = [linha];
      return;
    }
    if (atual) atual.push(linha);
  });

  if (atual) blocos.push(atual);
  return blocos;
};

const lerBloco = (linhas) => {
  const resultado = {
    ocorrido_em: null,
    usuario_plataforma: '',
    bruto: null,
    liquido: null,
    moeda: 'BRL',
    metodo: '',
    tipo: '',
    faltando: [],
  };

  const dataLinha = DATA_HORA.exec(linhas[0]);
  if (dataLinha) {
    resultado.ocorrido_em = dataIso(dataLinha[1], dataLinha[2], dataLinha[3], dataLinha[4], dataLinha[5]);
  } else {
    const soData = SO_DATA.exec(linhas[0]);
    if (soData) resultado.ocorrido_em = dataIso(soData[1], soData[2], soData[3]);
  }

  const valores = [];
  linhas.slice(1).forEach((linha) => {
    const achado = VALOR.exec(linha);
    if (!achado) return;
    const simbolo = achado[1].toUpperCase();
    valores.push({
      moeda: MOEDAS[simbolo] || MOEDAS[achado[1]] || 'BRL',
      valor: numero(achado[2]),
    });
  });

  if (valores[0]) {
    resultado.bruto = valores[0].valor;
    resultado.moeda = valores[0].moeda;
  }
  if (valores[1]) resultado.liquido = valores[1].valor;

  // Usuário: primeira linha depois da data que não é valor nem forma de pagamento.
  const candidato = linhas.slice(1).find((linha) => {
    if (VALOR.test(linha)) return false;
    if (METODOS.test(linha)) return false;
    return !linha.includes(' - ');
  });
  if (candidato) resultado.usuario_plataforma = candidato;

  const metodo = linhas.find((linha) => METODOS.test(linha));
  if (metodo) resultado.metodo = metodo.split(/\s+/)[0];

  const tipoLinha = linhas.find((linha) => linha.includes(' - ') && !VALOR.test(linha));
  if (tipoLinha) {
    resultado.tipo = tipoLinha;
  } else {
    const rotulo = linhas.find((linha) => /mimo|venda/i.test(linha) && !VALOR.test(linha));
    if (rotulo) resultado.tipo = rotulo;
  }

  if (!resultado.ocorrido_em) resultado.faltando.push('data');
  if (!resultado.usuario_plataforma) resultado.faltando.push('usuário');
  if (resultado.bruto === null) resultado.faltando.push('valor bruto');
  if (!resultado.tipo) resultado.faltando.push('tipo');

  if (resultado.liquido === null) resultado.liquido = resultado.bruto;

  return resultado;
};

export default function parsePrivacy(texto) {
  const blocos = separarBlocos(texto);
  const itens = blocos.map(lerBloco).filter((item) => item.bruto !== null || item.ocorrido_em);

  return {
    ok: itens.length > 0 && itens.every((item) => item.faltando.length === 0),
    itens,
  };
}
