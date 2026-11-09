import { useState } from 'react';
import Window from '@/components/Window';
import { GamepadIcon } from '@/components/icons';
import { useIsMobile } from '@/hooks/use-mobile';
import XadrezLichess from '@/components/jogos/XadrezLichess';
import QuemEhEssePokemon from '@/components/jogos/QuemEhEssePokemon';

const JOGOS = [
  { id: 'xadrez', label: 'Xadrez (Lichess)' },
  { id: 'pokemon', label: 'Quem é esse Pokémon?' },
];

/**
 * Janela de Jogos: a pausa do time.
 *
 * Todo mundo vê, inclusive chatter. Os dois jogos usam APIs públicas e
 * gratuitas (Lichess embed e PokeAPI), então a janela não depende de nada pra
 * funcionar além de internet.
 */
export default function JogosWindow({ onClose }) {
  const pequeno = useIsMobile();
  const [jogo, setJogo] = useState('xadrez');

  return (
    <Window title="Jogos" icon={GamepadIcon} onClose={onClose} width={860} height={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
        <div
          style={{
            display: 'flex',
            gap: 6,
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
            paddingBottom: 8,
            flexShrink: 0,
            overflowX: pequeno ? 'auto' : undefined,
          }}
        >
          {JOGOS.map((item) => {
            const ativa = jogo === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setJogo(item.id)}
                style={{
                  height: pequeno ? 34 : 26,
                  padding: pequeno ? '0 14px' : '0 12px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  borderRadius: 7,
                  border: ativa
                    ? '1px solid color-mix(in srgb, var(--c1) 55%, transparent)'
                    : '1px solid transparent',
                  background: ativa ? 'color-mix(in srgb, var(--c1) 18%, transparent)' : 'transparent',
                  color: ativa ? 'var(--c1)' : 'var(--c2)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {jogo === 'xadrez' ? <XadrezLichess /> : <QuemEhEssePokemon />}
      </div>
    </Window>
  );
}
