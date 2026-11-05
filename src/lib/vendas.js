/** Formatação compartilhada dos registros de mimo/venda internacional. */

export const moedaLabel = (valor, moeda) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda || 'BRL' }).format(
      Number(valor)
    );
  } catch {
    return `${moeda || ''} ${valor}`.trim();
  }
};

export const quandoLabel = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} às ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
};

export const statusLabel = (status) =>
  ({ pendente: 'Aguardando', aprovada: 'Aprovada', recusada: 'Recusada' })[status] || 'Registrada';

export const statusColor = (status) =>
  ({ pendente: '#e8b93b', aprovada: '#7bd88f', recusada: '#ff6b6b' })[status] || 'var(--c2)';
