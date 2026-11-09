import { base44 } from '@/api/base44Client';

/**
 * Convites de chatter com tudo dentro: cargo, modelos com os IDs de centavos
 * e os turnos. O convite fica guardado até a pessoa criar a conta; nesse
 * momento a função `aplicarConvitesPendentes` cria o chatter, os vínculos nas
 * modelos e os turnos de verdade.
 */

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

export const normalizarEmail = (email) => String(email || '').trim().toLowerCase();

export const cargoDoConvite = (valor) => (valor === 'admin' ? 'admin' : 'user');

export const criarConvite = async ({ nome, email, cargo, modelos, turnos, convidadoPor }) => {
  const alvo = normalizarEmail(email);
  const registro = await base44.entities.ConviteChatter.create({
    email: alvo,
    nome: String(nome || '').trim(),
    cargo: cargoDoConvite(cargo),
    modelos: (Array.isArray(modelos) ? modelos : []).map((modelo) => ({
      modelo_id: String(modelo?.modelo_id || ''),
      modelo_nome: String(modelo?.modelo_nome || ''),
      identificador: String(modelo?.identificador || '').replace(/\D+/g, '').slice(0, 2),
    })),
    turnos: (Array.isArray(turnos) ? turnos : []).map((turno) => ({
      modelo_id: String(turno?.modelo_id || ''),
      modelo_nome: String(turno?.modelo_nome || ''),
      inicio: turno?.inicio || null,
      fim: turno?.fim || null,
      recorrente: Boolean(turno?.recorrente),
      dias_semana: (Array.isArray(turno?.dias_semana) ? turno.dias_semana : [])
        .map(Number)
        .filter((dia) => dia >= 0 && dia <= 6),
      repetir_ate: turno?.repetir_ate || null,
    })),
    status: 'pendente',
    convidado_por: convidadoPor || '',
    convidado_em: new Date().toISOString(),
  });
  return registro;
};

export const listarConvitesPendentes = async () => {
  const bruto = await base44.entities.ConviteChatter.filter({ status: 'pendente' }, '-created_date', 100);
  return asList(bruto);
};

export const cancelarConvite = async (id, motivo = '') => {
  await base44.entities.ConviteChatter.update(id, {
    status: 'cancelado',
    cancelado_motivo: motivo,
  });
};

/** Varre todos os convites pendentes (uso do admin ao abrir a janela). */
export const aplicarConvitesPendentes = async () => {
  const resposta = await base44.functions.invoke('aplicarConvitesPendentes', {});
  return resposta?.data || { ok: false, aplicados: 0 };
};

/** Aplica só o convite de quem está logado (primeiro acesso). */
export const aplicarMeuConvite = async () => {
  const resposta = await base44.functions.invoke('aplicarConvitesPendentes', { todos: false });
  return resposta?.data || { ok: false, aplicados: 0 };
};

export const enviarConviteBase44 = async (email, cargo) => {
  await base44.users.inviteUser(normalizarEmail(email), cargoDoConvite(cargo));
};

export const removerAcesso = async (usuarioId, motivo) => {
  const resposta = await base44.functions.invoke('removerAcessoUsuario', {
    usuario_id: usuarioId,
    motivo,
  });
  const dados = resposta?.data;
  if (!dados?.ok) {
    throw new Error(dados?.error || 'Não consegui remover o acesso agora.');
  }
  return dados;
};
