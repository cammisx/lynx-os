import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, LogInIcon } from '@/components/icons';
import PaginasIcon from '@/components/icons/PaginasIcon';
import { countdownLabel, durationLabel } from '@/lib/ponto';
import { TASKBAR_SAFE, WIDGET_TILE } from './widgetLayout';

const WIDTH = 356;
const ALTURA_ESTIMADA = 420;
const TASKBAR = TASKBAR_SAFE;
const MARGIN = 8;

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

const limitar = (left, top) => ({
  left: Math.min(Math.max(MARGIN, left), Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN)),
  top: Math.min(
    Math.max(MARGIN, top),
    Math.max(MARGIN, window.innerHeight - TASKBAR - ALTURA_ESTIMADA)
  ),
});

export const posicaoPainel = (icone) => {
  const abreParaEsquerda = icone.icone_x + WIDGET_TILE + WIDTH + 12 > window.innerWidth;
  const left = abreParaEsquerda ? icone.icone_x - WIDTH - 12 : icone.icone_x + WIDGET_TILE + 12;
  return limitar(left, icone.icone_y - 8);
};

/** Como está a página agora, em uma palavra e uma cor. */
const estadoDaPagina = (pagina) => {
  if (pagina.estado === 'ocupada') {
    return {
      texto: pagina.ocupantes.some((item) => item.pausa) ? 'Em pausa' : 'Ocupada',
      cor: 'var(--c2)',
      fundo: 'color-mix(in srgb, white 10%, transparent)',
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

export default function PaginasWidgetPanel({
  widget,
  paginas,
  carregando,
  erro,
  entrando,
  recarregar,
  entrar,
  usuarioId,
  onClose,
  onMove,
}) {
  const [pos, setPos] = useState(() => {
    if (typeof widget.painel_x === 'number' && typeof widget.painel_y === 'number') {
      return limitar(widget.painel_x, widget.painel_y);
    }
    return posicaoPainel(widget);
  });
  const [arrastando, setArrastando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const drag = useRef(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const livres = paginas.filter((pagina) => pagina.estado === 'livre').length;
  const agora = Date.now();

  const startDrag = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = {
      dx: event.clientX - posRef.current.left,
      dy: event.clientY - posRef.current.top,
      moveu: false,
    };
    setArrastando(true);

    const handleMove = (moveEvent) => {
      const data = drag.current;
      if (!data) return;
      data.moveu = true;
      setPos(limitar(moveEvent.clientX - data.dx, moveEvent.clientY - data.dy));
    };

    const handleUp = () => {
      const data = drag.current;
      drag.current = null;
      setArrastando(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      if (data?.moveu) onMove({ painel_x: posRef.current.left, painel_y: posRef.current.top });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const tentarEntrar = async (pagina) => {
    setAviso(null);
    const resultado = await entrar(pagina.modelo_id);
    if (!resultado?.ok) {
      setAviso({
        modelo_id: pagina.modelo_id,
        texto: resultado?.error || 'Não foi possível entrar agora',
      });
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: WIDTH,
        maxHeight: `calc(100vh - ${TASKBAR + 2 * MARGIN}px)`,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        background: 'color-mix(in srgb, var(--c8) 32%, transparent)',
        backdropFilter: 'blur(28px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
        border: '1px solid color-mix(in srgb, white 12%, transparent)',
        boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
        zIndex: 900,
        overflow: 'hidden',
        fontFamily: 'var(--font-main)',
        animation: 'clk-panel-in 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        onMouseDown={startDrag}
        style={{
          height: 34,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '0 6px 0 10px',
          borderBottom: '1px solid color-mix(in srgb, white 10%, transparent)',
          cursor: arrastando ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <PaginasIcon size={19} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--c3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Páginas
          </span>
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => recarregar()}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              fontSize: 10,
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            Atualizar
          </button>
          <button
            type="button"
            aria-label="Fechar widget"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClose}
            className="clk-nav-btn"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={12} />
          </button>
        </span>
      </div>

      <div style={{ padding: '11px 12px 6px', flexShrink: 0 }}>
        <span style={{ fontSize: 11.5, color: 'var(--c2)' }}>
          {carregando && !paginas.length ? (
            'Lendo as páginas...'
          ) : paginas.length ? (
            <>
              <span style={{ color: 'var(--c1)', fontWeight: 700 }}>{livres}</span> de{' '}
              {paginas.length} {paginas.length === 1 ? 'página livre' : 'páginas livres'} agora.
            </>
          ) : (
            'Nenhuma página atribuída a você.'
          )}
        </span>
      </div>

      <div
        className="glass-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '2px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {erro && (
          <span style={{ fontSize: 11, lineHeight: 1.45, color: '#ff8a8a' }}>
            {erro}
          </span>
        )}

        {paginas.map((pagina) => {
          const tag = estadoDaPagina(pagina);
          const ocupante = pagina.ocupantes[0];
          const proximo = pagina.proximo;
          const minutos = pagina.minutos_livres;
          const fimLivre = proximo?.inicio || pagina.livre_ate;
          const logoAgora = minutos !== null && minutos * 60000 <= AVISO_MS;
          const meAviso = aviso?.modelo_id === pagina.modelo_id;

          return (
            <div
              key={pagina.modelo_id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '9px 10px',
                borderRadius: 10,
                background: 'color-mix(in srgb, white 5%, transparent)',
                border: '1px solid color-mix(in srgb, white 9%, transparent)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12.5,
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
                <span style={{ fontSize: 11, color: 'var(--c2)' }}>
                  {ocupante.usuario_id === usuarioId
                    ? 'Você está na página'
                    : ocupante.usuario_nome || 'Alguém'}{' '}
                  há {durationLabel(Math.max(0, agora - new Date(ocupante.desde).getTime()))}
                  {ocupante.pausa ? ' · em pausa' : ''}
                </span>
              )}

              {pagina.estado === 'ocupada' && ocupante?.usuario_id === usuarioId && (
                <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.75 }}>
                  Bata a saída pelo widget Turno quando terminar.
                </span>
              )}

              {pagina.estado === 'programado_sem_entrada' && (
                <span style={{ fontSize: 11, color: 'var(--c2)' }}>
                  {pagina.programado_agora?.usuario_nome || 'Turno'} das{' '}
                  {hora(pagina.programado_agora?.inicio)} às {hora(pagina.programado_agora?.fim)},
                  sem entrada.
                </span>
              )}

              {pagina.estado === 'programado_sem_entrada' &&
                typeof pagina.libera_em_minutos === 'number' && (
                  <span style={{ fontSize: 10.5, color: COR_AVISO }}>
                    Libera para cobertura em{' '}
                    {countdownLabel(pagina.libera_em_minutos * 60000)}
                  </span>
                )}

              {pagina.estado === 'livre' && pagina.liberada && pagina.liberada_de && (
                <span style={{ fontSize: 10.5, color: COR_AVISO, lineHeight: 1.4 }}>
                  Turno de {pagina.liberada_de.usuario_nome || 'quem estava escalado'} não teve
                  entrada · livre para cobertura
                </span>
              )}

              {pagina.estado === 'livre' && (
                <span style={{ fontSize: 11, color: 'var(--c2)' }}>
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

              {meAviso && (
                <span style={{ fontSize: 10.5, color: '#ff8a8a', lineHeight: 1.4 }}>
                  {aviso.texto}
                </span>
              )}

              {pagina.estado === 'livre' && (
                <button
                  type="button"
                  disabled={entrando === pagina.modelo_id}
                  onClick={() => tentarEntrar(pagina)}
                  style={{
                    ...BOTAO_ENTRAR,
                    opacity: entrando === pagina.modelo_id ? 0.6 : 1,
                    cursor: entrando === pagina.modelo_id ? 'default' : 'pointer',
                  }}
                >
                  <LogInIcon size={13} />
                  {entrando === pagina.modelo_id ? 'Entrando...' : 'Entrar na página'}
                </button>
              )}
            </div>
          );
        })}

        <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.7, paddingTop: 2 }}>
          Atualiza sozinho a cada 15 segundos.
        </span>
      </div>
    </div>,
    document.body
  );
}
