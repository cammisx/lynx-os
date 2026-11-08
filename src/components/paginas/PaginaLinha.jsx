import { LogInIcon } from '@/components/icons';
import { countdownLabel, durationLabel } from '@/lib/ponto';

/**
 * Uma página (modelo) no painel de páginas ao vivo.
 *
 * Mora fora do widget porque o celular mostra a mesma linha na folha de
 * Páginas: um lugar só, para o desktop e o celular nunca divergirem.
 */

const AVISO_MS = 60 * 60000;

const COR_AVISO = '#ffb84d';

const BOTAO_ENTRAR = {
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 26,
  padding: '0 11px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c1) 42%, transparent)',
  background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
  color: 'var(--c3)',
  fontSize: 11,
  fontWeight: 700,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};

const pill = (cor, fundo) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 18,
  padding: '0 7px',
  borderRadius: 999,
  background: fundo,
  color: cor,
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});

const hora = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/** Como está a página agora, em uma palavra e uma cor. */
export const estadoDaPagina = (pagina) => {
  if (pagina.estado === 'ocupada') {
    return {
      texto: pagina.ocupantes.some((item) => item.pausa) ? 'Em pausa' : 'Ocupada',
      cor: 'var(--c2)',
      fundo: 'color-mix(in srgb, var(--ink-hex) 10%, transparent)',
    };
  }

  if (pagina.estado === 'programado_sem_entrada') {
    return {
      texto: 'Turno agora',
      cor: COR_AVISO,
      fundo: 'color-mix(in srgb, #ffb84d 20%, transparent)',
    };
  }

  return {
    texto: 'Livre',
    cor: 'var(--c1)',
    fundo: 'color-mix(in srgb, var(--c1) 20%, transparent)',
  };
};

export default function PaginaLinha({
  pagina,
  usuarioId,
  agora,
  entrando,
  onEntrar,
  avisoTexto = '',
  ondeBaterSaida = 'widget Turno',
  compacto = false,
}) {
  const tag = estadoDaPagina(pagina);
  const ocupante = pagina.ocupantes[0];
  const proximo = pagina.proximo;
  const minutos = pagina.minutos_livres;
  const fimLivre = proximo?.inicio || pagina.livre_ate;
  const logoAgora = minutos !== null && minutos * 60000 <= AVISO_MS;
  const ocupado = entrando === pagina.modelo_id;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: compacto ? '11px 12px' : '9px 10px',
        borderRadius: compacto ? 12 : 10,
        background: 'color-mix(in srgb, var(--ink-hex) 5%, transparent)',
        border: '1px solid color-mix(in srgb, var(--ink-hex) 9%, transparent)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: compacto ? 13 : 12.5,
            fontWeight: 600,
            color: 'var(--c3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {pagina.modelo_nome}
        </span>
        <span style={pill(tag.cor, tag.fundo)}>{tag.texto}</span>
      </div>

      {pagina.estado === 'ocupada' && ocupante && (
        <span style={{ fontSize: compacto ? 11.5 : 11, color: 'var(--c2)' }}>
          {ocupante.usuario_id === usuarioId
            ? 'Você está na página'
            : ocupante.usuario_nome || 'Alguém'}{' '}
          há {durationLabel(Math.max(0, agora - new Date(ocupante.desde).getTime()))}
          {ocupante.pausa ? ' · em pausa' : ''}
        </span>
      )}

      {pagina.estado === 'ocupada' && ocupante?.usuario_id === usuarioId && (
        <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.75 }}>
          Bata a saída pelo {ondeBaterSaida} quando terminar.
        </span>
      )}

      {pagina.estado === 'programado_sem_entrada' && (
        <span style={{ fontSize: compacto ? 11.5 : 11, color: 'var(--c2)' }}>
          {pagina.programado_agora?.usuario_nome || 'Turno'} das{' '}
          {hora(pagina.programado_agora?.inicio)} às {hora(pagina.programado_agora?.fim)},
          sem entrada.
        </span>
      )}

      {pagina.estado === 'programado_sem_entrada' &&
        typeof pagina.libera_em_minutos === 'number' && (
          <span style={{ fontSize: 10.5, color: COR_AVISO }}>
            Libera para cobertura em {countdownLabel(pagina.libera_em_minutos * 60000)}
          </span>
        )}

      {pagina.estado === 'livre' && pagina.liberada && pagina.liberada_de && (
        <span style={{ fontSize: 10.5, color: COR_AVISO, lineHeight: 1.4 }}>
          Turno de {pagina.liberada_de.usuario_nome || 'quem estava escalado'} não teve entrada ·
          livre para cobertura
        </span>
      )}

      {pagina.estado === 'livre' && (
        <span style={{ fontSize: compacto ? 11.5 : 11, color: 'var(--c2)' }}>
          {fimLivre && typeof minutos === 'number'
            ? `Livre até ${hora(fimLivre)} (${countdownLabel(minutos * 60000)})`
            : 'Livre, sem turno marcado à frente'}
        </span>
      )}

      {pagina.estado === 'livre' && logoAgora && proximo && (
        <span style={{ fontSize: 10.5, color: COR_AVISO }}>
          {proximo.usuario_nome || 'O próximo turno'} entra às {hora(proximo.inicio)}
        </span>
      )}

      {avisoTexto && (
        <span style={{ fontSize: 10.5, color: '#ff8a8a', lineHeight: 1.4 }}>{avisoTexto}</span>
      )}

      {pagina.estado === 'livre' && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onEntrar(pagina)}
          style={{
            ...BOTAO_ENTRAR,
            height: compacto ? 34 : 26,
            padding: compacto ? '0 16px' : '0 11px',
            fontSize: compacto ? 12.5 : 11,
            opacity: ocupado ? 0.6 : 1,
            cursor: ocupado ? 'default' : 'pointer',
          }}
        >
          <LogInIcon size={13} />
          {ocupado ? 'Entrando...' : 'Entrar na página'}
        </button>
      )}
    </div>
  );
}
