export const buildChatterNames = (chatters) => {
  const map = {};
  (Array.isArray(chatters) ? chatters : []).forEach((chatter) => {
    if (chatter?.usuario_id) map[chatter.usuario_id] = chatter.nome_exibicao || '';
  });
  return map;
};

export const chatterName = (map, usuarioId, fallback) =>
  (map && map[usuarioId]) || fallback || '';