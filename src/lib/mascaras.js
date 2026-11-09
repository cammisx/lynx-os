/**
 * Máscaras dos documentos brasileiros da ficha.
 *
 * Regra da casa: o valor é guardado só com números; os pontos, traços e
 * parênteses aparecem na tela enquanto a pessoa digita.
 */

export const soDigitos = (valor) => String(valor ?? '').replace(/\D+/g, '');

const emGrupos = (digitos, tamanho) => {
  const partes = [];
  let resto = digitos;
  while (resto.length > tamanho) {
    partes.unshift(resto.slice(-tamanho));
    resto = resto.slice(0, -tamanho);
  }
  if (resto) partes.unshift(resto);
  return partes.join('.');
};

/** CPF: até 11 dígitos, exibido 000.000.000-00. */
export const formatarCPF = (valor) => {
  const digitos = soDigitos(valor).slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
};

/** RG: até 9 dígitos, o último separado por traço (12.345.678-9). */
export const formatarRG = (valor) => {
  const digitos = soDigitos(valor).slice(0, 9);
  if (digitos.length <= 1) return digitos;
  const corpo = digitos.slice(0, -1);
  const fim = digitos.slice(-1);
  return `${emGrupos(corpo, 3)}-${fim}`;
};

/** Telefone com DDD: (11) 91234-5678 ou (11) 3456-7890. */
export const formatarTelefone = (valor) => {
  const digitos = soDigitos(valor).slice(0, 11);
  if (digitos.length <= 2) return digitos;
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  if (!resto) return `(${ddd})`;
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  if (resto.length <= 8) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
};

/** CEP: 00000-000. */
export const formatarCEP = (valor) => {
  const digitos = soDigitos(valor).slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
};

export const apenasNumeros = (valor, limite = 12) => soDigitos(valor).slice(0, limite);
