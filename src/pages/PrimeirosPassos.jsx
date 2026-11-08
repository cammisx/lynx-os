import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '@/theme.css';
import DesktopBackground from '@/components/DesktopBackground';
import { useAuth } from '@/lib/AuthContext';
import { usePerfil } from '@/lib/perfilUsuario';
import { MODO_ESCURO, TEMA_PADRAO, aplicarTema } from '@/lib/temas';
import { useIsMobile } from '@/hooks/use-mobile';
import { marcarTutorialVisto } from '@/lib/tutorial';
import { passosDoTutorial } from '@/lib/tutorialPassos';
import { CheckIcon, CloseIcon } from '@/components/icons';

/**
 * Primeiro acesso: o tutorial do sistema numa rota própria.
 *
 * Rota `/primeiros-passos`, fora da casca do desktop, para a pessoa conhecer
 * tudo antes de encarar a mesa cheia. Também serve de revisão: Preferências e o
 * clique direito levam pra cá a qualquer momento.
 */
export default function PrimeirosPassos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const perfil = usePerfil(user);
  const pequeno = useIsMobile();
  const admin = user?.role === 'admin';
  const passos = useMemo(() => passosDoTutorial(admin), [admin]);
  const [atual, setAtual] = useState(0);
  const [saindo, setSaindo] = useState(false);

  const passo = passos[Math.min(atual, passos.length - 1)];
  const ultimo = atual === passos.length - 1;

  /* O tutorial veste o tema da pessoa: nada de tela cinza no meio do sistema. */
  useEffect(() => {
    aplicarTema(perfil.tema || TEMA_PADRAO, perfil.modo || MODO_ESCURO);
    document.body.classList.add('is-desktop-shell');
    return () => document.body.classList.remove('is-desktop-shell');
  }, [perfil.tema, perfil.modo]);

  const terminar = async (rota = '/') => {
    if (saindo) return;
    setSaindo(true);
    await marcarTutorialVisto(user);
    navigate(rota, { replace: true });
  };

  /* Setas do teclado andam o tutorial, como uma apresentação. */
  useEffect(() => {
    const ouvir = (event) => {
      if (event.key === 'ArrowRight') setAtual((n) => Math.min(n + 1, passos.length - 1));
      if (event.key === 'ArrowLeft') setAtual((n) => Math.max(n - 1, 0));
      if (event.key === 'Escape') terminar();
    };
    window.addEventListener('keydown', ouvir);
    return () => window.removeEventListener('keydown', ouvir);
  }, [passos.length, saindo]);

  const Icone = passo.Icone;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        fontFamily: 'var(--font-main)',
        color: 'var(--c3)',
      }}
    >
      <DesktopBackground
        imagem={perfil.fundoUrl}
        estatico={perfil.fundoEstatico}
        semLinhas={perfil.fundoModo === 'sem'}
      />

      <div
        className="glass-scroll"
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          overflowY: 'auto',
          boxSizing: 'border-box',
          padding: pequeno ? '20px 14px 22px' : '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: pequeno ? 560 : 1000,
            display: 'grid',
            gridTemplateColumns: pequeno ? '1fr' : '260px 1fr',
            gap: pequeno ? 14 : 26,
            alignItems: 'stretch',
          }}
        >
          {/* Índice das etapas: no celular vira só a contagem. */}
          {pequeno ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  letterSpacing: '0.08em',
                  color: 'var(--c1)',
                }}
              >
                LYNX
              </span>
              <span style={{ fontSize: 11, color: 'var(--c2)' }}>
                {atual + 1} de {passos.length}
              </span>
              <button
                type="button"
                onClick={() => terminar()}
                aria-label="Pular tutorial"
                style={botaoTexto}
              >
                Pular
              </button>
            </div>
          ) : (
            <aside
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: 14,
                borderRadius: 16,
                border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                height: 'fit-content',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  letterSpacing: '0.1em',
                  color: 'var(--c1)',
                  padding: '2px 6px 10px',
                }}
              >
                PRIMEIROS PASSOS
              </span>
              {passos.map((item, indice) => {
                const ativo = indice === atual;
                const feito = indice < atual;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAtual(indice)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 9px',
                      borderRadius: 9,
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-main)',
                      fontSize: 11,
                      lineHeight: 1.3,
                      color: ativo ? 'var(--c1)' : feito ? 'var(--c3)' : 'var(--c2)',
                      background: ativo
                        ? 'color-mix(in srgb, var(--c1) 16%, transparent)'
                        : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        flexShrink: 0,
                        borderRadius: 999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8.5,
                        border: `1px solid color-mix(in srgb, var(--c1) ${ativo ? '70%' : '26%'}, transparent)`,
                        color: ativo ? 'var(--c1)' : 'var(--c2)',
                      }}
                    >
                      {feito ? <CheckIcon size={9} /> : indice + 1}
                    </span>
                    {item.titulo}
                  </button>
                );
              })}
              <button type="button" onClick={() => terminar()} style={{ ...botaoTexto, marginTop: 8, textAlign: 'left', padding: '6px 9px' }}>
                Pular tutorial
              </button>
            </aside>
          )}

          {/* O cartão da etapa. */}
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              padding: pequeno ? 16 : 26,
              borderRadius: 18,
              border: '1px solid color-mix(in srgb, var(--c1) 20%, transparent)',
              background: 'color-mix(in srgb, var(--c8) 52%, transparent)',
              backdropFilter: 'blur(26px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(26px) saturate(1.3)',
              boxShadow: '0 18px 60px rgba(0,0,0,0.42)',
              minHeight: pequeno ? 0 : 380,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: pequeno ? 42 : 52,
                  height: pequeno ? 42 : 52,
                  flexShrink: 0,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c1)',
                  border: '1px solid color-mix(in srgb, var(--c1) 34%, transparent)',
                  background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
                }}
              >
                <Icone size={pequeno ? 22 : 26} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '0.14em',
                    color: 'var(--c2)',
                    textTransform: 'uppercase',
                  }}
                >
                  Etapa {atual + 1} de {passos.length}
                </div>
                <h1
                  style={{
                    margin: '2px 0 0',
                    fontFamily: 'var(--font-display)',
                    fontSize: pequeno ? 19 : 25,
                    lineHeight: 1.15,
                    color: 'var(--c3)',
                  }}
                >
                  {passo.titulo}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => terminar()}
                aria-label="Fechar tutorial"
                style={{ ...botaoIcone }}
              >
                <CloseIcon size={15} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: pequeno ? 12.5 : 13.5, lineHeight: 1.6, color: 'var(--c3)' }}>
              {passo.resumo}
            </p>

            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {passo.dicas.map((dica) => (
                <li
                  key={dica}
                  style={{
                    display: 'flex',
                    gap: 9,
                    fontSize: pequeno ? 11.5 : 12,
                    lineHeight: 1.55,
                    color: 'var(--c2)',
                  }}
                >
                  <span style={{ color: 'var(--c1)', marginTop: 1, flexShrink: 0 }}>
                    <CheckIcon size={12} />
                  </span>
                  {dica}
                </li>
              ))}
            </ul>

            <div style={{ flex: 1 }} />

            {/* Progresso e navegação. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                paddingTop: 4,
              }}
            >
              <div style={{ display: 'flex', gap: 5, flex: 1, minWidth: 90 }}>
                {passos.map((item, indice) => (
                  <span
                    key={item.id}
                    style={{
                      height: 3,
                      flex: 1,
                      borderRadius: 999,
                      background:
                        indice <= atual
                          ? 'var(--c1)'
                          : 'color-mix(in srgb, var(--c2) 22%, transparent)',
                      transition: 'background 0.2s ease',
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setAtual((n) => Math.max(n - 1, 0))}
                disabled={atual === 0}
                style={{
                  ...botaoNeutro,
                  opacity: atual === 0 ? 0.4 : 1,
                  cursor: atual === 0 ? 'default' : 'pointer',
                }}
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() => (ultimo ? terminar() : setAtual((n) => n + 1))}
                style={botaoPrincipal}
              >
                {ultimo ? 'Concluir e abrir o LYNX' : 'Próximo'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const botaoNeutro = {
  padding: '9px 14px',
  borderRadius: 9,
  border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
  background: 'transparent',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  cursor: 'pointer',
};

const botaoPrincipal = {
  padding: '9px 16px',
  borderRadius: 9,
  border: '1px solid color-mix(in srgb, var(--c1) 55%, transparent)',
  background: 'color-mix(in srgb, var(--c1) 22%, transparent)',
  color: 'var(--c1)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  fontWeight: 700,
  cursor: 'pointer',
};

const botaoTexto = {
  padding: '6px 4px',
  border: 'none',
  background: 'transparent',
  color: 'var(--c2)',
  fontFamily: 'var(--font-main)',
  fontSize: 10.5,
  cursor: 'pointer',
  textDecoration: 'underline',
};

const botaoIcone = {
  width: 30,
  height: 30,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 9,
  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  background: 'transparent',
  color: 'var(--c2)',
  cursor: 'pointer',
};
