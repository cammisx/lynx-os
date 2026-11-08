import { useState } from 'react';
import MobilePaginasSheet from '@/components/mobile/MobilePaginasSheet';
import usePaginas from '@/hooks/usePaginas';

/**
 * Status das páginas na home do celular: quantas estão livres agora e quais
 * modelos estão com a página aberta.
 *
 * Bebe do mesmo hook do widget Páginas do desktop, então o número aqui é o
 * mesmo que o servidor responde pra quem está na mesa. Tocar abre a lista
 * completa, onde dá pra entrar numa página livre.
 */
export default function MobileStatusPaginas() {
  const { paginas, carregando, erro } = usePaginas();
  const [aberto, setAberto] = useState(false);

  const livres = paginas.filter((pagina) => pagina.estado === 'livre').length;

  const texto =
    carregando && !paginas.length
      ? 'Conferindo as páginas…'
      : erro
        ? 'Não consegui ler as páginas'
        : paginas.length
          ? `${livres} de ${paginas.length} ${livres === 1 ? 'livre' : 'livres'} agora`
          : 'Nenhuma página atribuída a você';

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: '100%',
          padding: '12px 14px',
          borderRadius: 16,
          border: '1px solid color-mix(in srgb, var(--c1) 20%, transparent)',
          background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
          color: 'var(--c3)',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--c2)',
          }}
        >
          Páginas
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              flexShrink: 0,
              background: livres
                ? 'var(--c16)'
                : 'color-mix(in srgb, var(--c2) 55%, transparent)',
            }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{texto}</span>
        </span>

        {paginas.length ? (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {paginas.map((pagina) => {
              const livre = pagina.estado === 'livre';
              return (
                <span
                  key={pagina.modelo_id}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 999,
                    fontSize: 10,
                    letterSpacing: '0.02em',
                    border: `1px solid color-mix(in srgb, ${livre ? 'var(--c16)' : 'var(--c2)'} 42%, transparent)`,
                    background: `color-mix(in srgb, ${livre ? 'var(--c16)' : 'var(--c2)'} 14%, transparent)`,
                    color: livre ? 'var(--c1)' : 'var(--c2)',
                  }}
                >
                  {pagina.modelo_nome || 'sem nome'}
                </span>
              );
            })}
          </span>
        ) : null}
      </button>

      {aberto && <MobilePaginasSheet onFechar={() => setAberto(false)} />}
    </>
  );
}
