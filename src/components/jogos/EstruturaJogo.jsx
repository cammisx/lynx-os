import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Pecas comuns aos jogos: a moldura (voltar, titulo, recorde e engrenagem) e o
 * painel de configuracoes.
 *
 * Ficam juntas de proposito: os quatro jogos tem a mesma cara e qualquer ajuste
 * de estilo acontece num lugar so.
 */

export const dourado = (valor) => `color-mix(in srgb, var(--c1) ${valor}%, transparent)`;
export const escuro = (valor) => `color-mix(in srgb, var(--c2) ${valor}%, transparent)`;

const vidro = (valor = 52) => `color-mix(in srgb, var(--c8) ${valor}%, transparent)`;

const botaoBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: `1px solid ${escuro(14)}`,
  background: vidro(),
  color: 'var(--c2)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  fontWeight: 700,
  borderRadius: 8,
  cursor: 'pointer',
};

/** Botao de vidro do projeto, com variacao dourada para a acao principal. */
export function BotaoVidro({ children, onClick, tom = 'normal', style, ...resto }) {
  const principal = tom === 'principal';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...botaoBase,
        height: 30,
        padding: '0 12px',
        color: principal ? 'var(--c1)' : 'var(--c2)',
        border: `1px solid ${principal ? dourado(45) : escuro(14)}`,
        background: principal ? dourado(14) : vidro(),
        ...style,
      }}
      {...resto}
    >
      {children}
    </button>
  );
}

/**
 * Moldura de um jogo. Cabecalho fixo com o caminho de volta, o recorde da
 * configuracao em uso e a engrenagem; o miolo e do jogo.
 */
export function MolduraJogo({
  titulo,
  aoVoltar,
  recorde = null,
  rotuloRecorde = 'recorde',
  aoAbrirConfig,
  configAberto = false,
  children,
  painel = null,
}) {
  const pequeno = useIsMobile();
  const textoRecorde =
    recorde == null ? '—' : rotuloRecorde === 'tempo' ? formatarTempo(recorde) : String(recorde);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 8,
          marginBottom: 8,
          borderBottom: `1px solid ${escuro(10)}`,
          flexShrink: 0,
        }}
      >
        <button type="button" onClick={aoVoltar} style={{ ...botaoBase, height: 28, padding: '0 10px' }}>
          ‹ Jogos
        </button>
        <span
          style={{
            fontFamily: 'var(--font-main)',
            fontSize: pequeno ? 12.5 : 13,
            fontWeight: 800,
            color: 'var(--c3)',
            letterSpacing: '0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {titulo}
        </span>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            lineHeight: 1.1,
            minWidth: 54,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-main)',
              fontSize: 12.5,
              fontWeight: 800,
              color: 'var(--c1)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {textoRecorde}
          </span>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: 8.5, color: escuro(55), letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {rotuloRecorde}
          </span>
        </div>
        {aoAbrirConfig ? (
          <button
            type="button"
            onClick={aoAbrirConfig}
            title="Configuracoes do jogo"
            aria-label="Configuracoes do jogo"
            style={{
              ...botaoBase,
              width: 28,
              height: 28,
              padding: 0,
              color: configAberto ? 'var(--c1)' : 'var(--c2)',
              border: `1px solid ${configAberto ? dourado(45) : escuro(14)}`,
              background: configAberto ? dourado(14) : vidro(),
            }}
          >
            <IconeEngrenagem />
          </button>
        ) : null}
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>{children}</div>
        {painel}
      </div>
    </div>
  );
}

export function IconeEngrenagem({ tamanho = 13 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.2v2.1M12 18.7v2.1M4.8 12H2.7M21.3 12h-2.1M6.9 6.9 5.4 5.4M18.6 18.6l-1.5-1.5M17.1 6.9l1.5-1.5M5.4 18.6l1.5-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const formatarTempo = (segundos) => {
  const total = Math.max(0, Math.round(Number(segundos) || 0));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
};

/* ----------------------------- painel de config ----------------------------- */

const rotulo = {
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--c2)',
};

/**
 * Painel de configuracoes em vidro, sobreposto ao jogo.
 *
 * Cada campo e declarado pelo jogo: `segmentos` (escolha entre poucos valores),
 * `cores` (igual ao segmentos, mas cada opcao e uma bolinha da propria cor, para
 * quando o nome atrapalha, tipo tom de pele), `stepper` (numero com menos e mais)
 * e `toggle` (liga e desliga, com `inverter` para quando o ligado e o negativo,
 * tipo "depilado"). Aplicar e imediato, entao o jogo recomeca com a nova regra
 * quando ela muda.
 */
export function PainelConfig({
  titulo = 'Configuracoes',
  campos = [],
  valores = {},
  aoMudar,
  aoFechar,
  aoRestaurar,
  aoApagarRecordes,
  nota = null,
}) {
  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        aoFechar?.();
      }
    };
    window.addEventListener('keydown', aoTeclar, true);
    return () => window.removeEventListener('keydown', aoTeclar, true);
  }, [aoFechar]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={aoFechar}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'color-mix(in srgb, #05060a 55%, transparent)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(evento) => evento.stopPropagation()}
        style={{
          width: 'min(340px, 100%)',
          maxHeight: 'min(560px, 88vh)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 14,
          border: `1px solid ${dourado(28)}`,
          background: `color-mix(in srgb, var(--c8) 88%, transparent)`,
          backdropFilter: 'blur(var(--blur-glass))',
          boxShadow: '0 24px 60px color-mix(in srgb, #000 55%, transparent)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            borderBottom: `1px solid ${escuro(12)}`,
          }}
        >
          <span style={{ ...rotulo, fontSize: 12.5, color: 'var(--c1)', flex: 1 }}>{titulo}</span>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar configuracoes"
            style={{ ...botaoBase, width: 26, height: 26, padding: 0 }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="glass-scroll" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {campos.map((campo) => (
            <LinhaConfig
              key={campo.chave}
              campo={campo}
              valor={valores?.[campo.chave]}
              aoMudar={(valor) => aoMudar?.({ [campo.chave]: valor })}
            />
          ))}
          {nota ? (
            <p style={{ margin: 0, fontFamily: 'var(--font-main)', fontSize: 10, lineHeight: 1.5, color: escuro(55) }}>
              {nota}
            </p>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '10px 14px',
            borderTop: `1px solid ${escuro(12)}`,
            flexWrap: 'wrap',
          }}
        >
          <BotaoVidro onClick={aoRestaurar}>Padrao</BotaoVidro>
          <BotaoVidro onClick={aoApagarRecordes}>Apagar recordes</BotaoVidro>
          <div style={{ flex: 1 }} />
          <BotaoVidro tom="principal" onClick={aoFechar}>
            Pronto
          </BotaoVidro>
        </div>
      </div>
    </div>,
    document.body
  );
}

function LinhaConfig({ campo, valor, aoMudar }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ ...rotulo, color: escuro(75) }}>{campo.rotulo}</span>
      {campo.tipo === 'segmentos' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {campo.opcoes.map((opcao) => {
            const ativo = opcao.valor === valor;
            return (
              <button
                key={String(opcao.valor)}
                type="button"
                onClick={() => aoMudar(opcao.valor)}
                style={{
                  ...botaoBase,
                  height: 28,
                  padding: '0 10px',
                  fontSize: 11,
                  color: ativo ? 'var(--c1)' : escuro(70),
                  border: `1px solid ${ativo ? dourado(50) : escuro(14)}`,
                  background: ativo ? dourado(16) : vidro(40),
                }}
              >
                {opcao.rotulo}
              </button>
            );
          })}
        </div>
      ) : null}
      {campo.tipo === 'cores' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {campo.opcoes.map((opcao) => {
            const ativo = opcao.valor === valor;
            return (
              <button
                key={String(opcao.valor)}
                type="button"
                onClick={() => aoMudar(opcao.valor)}
                aria-label={opcao.rotulo || String(opcao.valor)}
                aria-pressed={ativo}
                title={opcao.rotulo || String(opcao.valor)}
                style={{
                  ...botaoBase,
                  width: 30,
                  height: 30,
                  padding: 0,
                  borderRadius: '50%',
                  background: opcao.cor,
                  border: `1px solid ${ativo ? 'var(--c1)' : escuro(22)}`,
                  boxShadow: ativo
                    ? `0 0 0 2px ${dourado(70)}, 0 4px 10px color-mix(in srgb, #000 45%, transparent)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.18)',
                  transform: ativo ? 'scale(1.06)' : 'none',
                  transition: 'transform 120ms ease, box-shadow 120ms ease',
                }}
              />
            );
          })}
        </div>
      ) : null}
      {campo.tipo === 'stepper' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => aoMudar(Math.max(campo.min, Number(valor) - (campo.passo || 1)))}
            style={{ ...botaoBase, width: 30, height: 28, padding: 0, fontSize: 15 }}
            aria-label="Diminuir"
          >
            −
          </button>
          <span
            style={{
              ...rotulo,
              minWidth: 46,
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--c3)',
            }}
          >
            {valor}
          </span>
          <button
            type="button"
            onClick={() => aoMudar(Math.min(campo.max, Number(valor) + (campo.passo || 1)))}
            style={{ ...botaoBase, width: 30, height: 28, padding: 0, fontSize: 15 }}
            aria-label="Aumentar"
          >
            +
          </button>
          {campo.sufixo ? <span style={{ ...rotulo, color: escuro(50) }}>{campo.sufixo}</span> : null}
        </div>
      ) : null}
      {campo.tipo === 'toggle' ? (() => {
        /* `inverter` serve para o ligado ser o caso negativo ("depilado"):
           o valor guardado continua sendo o positivo, so a exibicao muda. */
        const marcado = campo.inverter ? !valor : Boolean(valor);
        return (
          <button
            type="button"
            role="switch"
            aria-label={campo.rotulo}
            aria-checked={marcado}
            onClick={() => aoMudar(!valor)}
            style={{
              ...botaoBase,
              height: 28,
              width: 120,
              padding: '0 10px',
              justifyContent: 'flex-start',
              color: marcado ? 'var(--c1)' : escuro(60),
              border: `1px solid ${marcado ? dourado(45) : escuro(14)}`,
              background: marcado ? dourado(14) : vidro(40),
            }}
          >
            <span
              style={{
                width: 26,
                height: 14,
                borderRadius: 999,
                border: `1px solid ${marcado ? dourado(55) : escuro(22)}`,
                background: marcado ? dourado(40) : 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                padding: 1,
                justifyContent: marcado ? 'flex-end' : 'flex-start',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: marcado ? 'var(--c1)' : escuro(45),
                }}
              />
            </span>
            {marcado ? 'ligado' : 'desligado'}
          </button>
        );
      })() : null}
    </div>
  );
}
