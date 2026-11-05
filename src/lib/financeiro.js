/**
 * Matemática do financeiro.
 *
 * Bruto     = valor cheio da venda.
 * Líquido   = o que a modelo recebeu da plataforma.
 * Agência   = comissao_agencia da modelo (padrão 50%) sobre o líquido.
 * Chatter   = comissao do chatter (percentual) sobre o líquido, pago DENTRO da
 *             parte da agência, então nunca passa do que a agência recebeu.
 * Repasse   = líquido menos a parte da agência.
 */

import { valorNumerico } from '@/lib/extrato';

export const COMISSAO_AGENCIA_PADRAO = 50;

export const pctAgencia = (modelo) => {
  const valor = Number(modelo?.comissao_agencia);
  return Number.isFinite(valor) && valor >= 0 ? valor : COMISSAO_AGENCIA_PADRAO;
};

export const pctChatter = (chatter) => {
  const valor = Number(chatter?.comissao);
  return Number.isFinite(valor) && valor >= 0 ? valor : 0;
};

export const calcularVenda = (venda, modelo, chatter) => {
  const bruto = valorNumerico(venda?.bruto);
  const liquido = valorNumerico(venda?.liquido ?? venda?.bruto);
  const agencia = (liquido * pctAgencia(modelo)) / 100;
  const brutoChatter = chatter ? (liquido * pctChatter(chatter)) / 100 : 0;
  const chatterComissao = Math.min(agencia, brutoChatter);

  return {
    bruto,
    liquido,
    agencia,
    chatter: chatterComissao,
    agenciaLiquida: agencia - chatterComissao,
    repasseModelo: liquido - agencia,
    pctAgencia: pctAgencia(modelo),
    pctChatter: chatter ? pctChatter(chatter) : 0,
  };
};

const vazio = () => ({
  vendas: 0,
  bruto: 0,
  liquido: 0,
  agencia: 0,
  chatter: 0,
  agenciaLiquida: 0,
  repasseModelo: 0,
});

const somar = (alvo, valores) => {
  alvo.vendas += 1;
  alvo.bruto += valores.bruto;
  alvo.liquido += valores.liquido;
  alvo.agencia += valores.agencia;
  alvo.chatter += valores.chatter;
  alvo.agenciaLiquida += valores.agenciaLiquida;
  alvo.repasseModelo += valores.repasseModelo;
};

/**
 * Agrega as vendas do período por modelo e por chatter.
 * `semChatter` separa o que não foi atribuído a ninguém, para não esconder
 * dinheiro no relatório.
 */
export const resumirVendas = (vendas = [], { modelos = [], chatters = [] } = {}) => {
  const modelosPorId = new Map(modelos.map((modelo) => [modelo.id, modelo]));
  const chatterPorUsuario = new Map(chatters.map((chatter) => [chatter.usuario_id, chatter]));
  const nomeChatter = new Map(
    chatters.map((chatter) => [
      chatter.usuario_id,
      chatter.nome_exibicao || chatter.usuario_email || 'Chatter',
    ])
  );

  const total = vazio();
  const porModeloMap = new Map();
  const porChatterMap = new Map();
  const semChatter = vazio();

  vendas.forEach((venda) => {
    const modelo = modelosPorId.get(venda.modelo_id) || null;
    const chatter = venda.usuario_id ? chatterPorUsuario.get(venda.usuario_id) || null : null;
    const valores = calcularVenda(venda, modelo, chatter);

    somar(total, valores);

    const chaveModelo = venda.modelo_id || venda.modelo_nome || 'sem-modelo';
    if (!porModeloMap.has(chaveModelo)) {
      porModeloMap.set(chaveModelo, {
        ...vazio(),
        modelo_id: venda.modelo_id || '',
        modelo_nome: modelo?.nome || venda.modelo_nome || 'Sem modelo',
        comissao_agencia: pctAgencia(modelo),
      });
    }
    somar(porModeloMap.get(chaveModelo), valores);

    if (!chatter) {
      somar(semChatter, valores);
      return;
    }

    if (!porChatterMap.has(venda.usuario_id)) {
      porChatterMap.set(venda.usuario_id, {
        ...vazio(),
        usuario_id: venda.usuario_id,
        chatter_nome:
          nomeChatter.get(venda.usuario_id) || venda.usuario_nome || 'Chatter',
        comissao: pctChatter(chatter),
      });
    }
    somar(porChatterMap.get(venda.usuario_id), valores);
  });

  const porModelo = [...porModeloMap.values()].sort((a, b) => b.bruto - a.bruto);
  const porChatter = [...porChatterMap.values()].sort((a, b) => b.chatter - a.chatter);

  return { total, porModelo, porChatter, semChatter };
};

export const inicioDoMes = (referencia) => {
  const data = new Date(referencia);
  return new Date(data.getFullYear(), data.getMonth(), 1, 0, 0, 0, 0);
};

export const fimDoMes = (referencia) => {
  const data = new Date(referencia);
  return new Date(data.getFullYear(), data.getMonth() + 1, 1, 0, 0, 0, 0);
};

export const mesLabel = (referencia) =>
  new Date(referencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export const somarMeses = (referencia, meses) => {
  const data = new Date(referencia);
  return new Date(data.getFullYear(), data.getMonth() + meses, 1);
};

export const moeda = (valor) => {
  const numero = valorNumerico(valor);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const percentual = (valor) => `${Number(valor || 0).toFixed(0)}%`;
