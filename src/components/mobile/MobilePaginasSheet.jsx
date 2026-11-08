import { useState } from 'react';
import MobileSheet from '@/components/mobile/MobileSheet';
import PaginaLinha from '@/components/paginas/PaginaLinha';
import usePaginas from '@/hooks/usePaginas';
import { useAuth } from '@/lib/AuthContext';

/**
 * Páginas ao vivo no celular: quais estão livres agora e o botão de bater
 * entrada (turno espontâneo). Usa o mesmo hook e a mesma linha do desktop,
 * então o que aparece aqui é exatamente o que o widget mostra na mesa.
 */
export default function MobilePaginasSheet({ onFechar }) {
  const { user } = useAuth();
  const { paginas, carregando, erro, entrando, entrar, recarregar } = usePaginas();
  const [avisos, setAvisos] = useState({});

  const livres = paginas.filter((pagina) => pagina.estado === 'livre').length;
  const agora = Date.now();

  const tentarEntrar = async (pagina) => {
    setAvisos((atual) => ({ ...atual, [pagina.modelo_id]: '' }));
    const resultado = await entrar(pagina.modelo_id);
    if (resultado?.ok) {
      onFechar?.();
      return;
    }
    setAvisos((atual) => ({
      ...atual,
      [pagina.modelo_id]: resultado?.error || 'Não foi possível entrar agora',
    }));
  };

  return (
    <MobileSheet
      titulo="Páginas"
      subtitulo={
        carregando && !paginas.length
          ? 'Lendo as páginas...'
          : paginas.length
            ? `${livres} de ${paginas.length} ${paginas.length === 1 ? 'livre' : 'livres'} agora`
            : 'Nenhuma página atribuída a você'
      }
      onFechar={onFechar}
      alturaMax="84dvh"
    >
      <div
        className="glass-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '4px 14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}
      >
        {erro && <span style={{ fontSize: 11.5, lineHeight: 1.45, color: '#ff8a8a' }}>{erro}</span>}

        {paginas.map((pagina) => (
          <PaginaLinha
            key={pagina.modelo_id}
            pagina={pagina}
            usuarioId={user?.id}
            agora={agora}
            entrando={entrando}
            onEntrar={tentarEntrar}
            avisoTexto={avisos[pagina.modelo_id] || ''}
            ondeBaterSaida="relógio"
            compacto
          />
        ))}

        {!paginas.length && !carregando && !erro && (
          <span style={{ fontSize: 11.5, color: 'var(--c2)' }}>
            Você não está atribuída a nenhuma página.
          </span>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: 2,
          }}
        >
          <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.7 }}>
            Atualiza sozinho a cada 15 segundos.
          </span>
          <button
            type="button"
            onClick={() => recarregar()}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              fontSize: 11,
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            Atualizar
          </button>
        </div>
      </div>
    </MobileSheet>
  );
}
