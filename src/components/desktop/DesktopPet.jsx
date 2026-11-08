import { useCallback, useEffect, useRef, useState } from 'react';
import PetSprite from '@/components/desktop/PetSprite';
import { falaAleatoria, spriteDe, temPet } from '@/lib/pets';

/* Ritmo da animação: cada batida troca o quadro e, se ele estiver andando,
   empurra um passo. Lento de propósito, para não roubar CPU do desktop. */
const BATIDA_MS = 240;
const PASSO = 0.007;
const LIMITE_ESQ = 0.03;
const LIMITE_DIR = 0.97;
const ESCALA = 4;
const DURACAO_FALA = 2600;

/**
 * O pet do desktop: passeia pela base da tela, para de vez em quando e
 * responde a clique com um pulinho e uma fala. Só aparece se o usuário
 * escolheu um pet nas Preferências.
 *
 * Quem prefere menos animação no sistema vê o pet parado, mas ele ainda
 * responde ao carinho.
 */
export default function DesktopPet({ pet, cor }) {
  const sprite = spriteDe(pet, cor);
  const ativo = temPet(pet);

  const [posicao, setPosicao] = useState({ x: 0.5, dir: 1, andando: false, quadro: 0 });
  const [fala, setFala] = useState('');
  const [carinho, setCarinho] = useState(false);
  const caladoRef = useRef(null);
  const animadoRef = useRef(true);

  useEffect(() => {
    animadoRef.current = !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    setPosicao((atual) => ({ ...atual, x: 0.25 + Math.random() * 0.5, dir: Math.random() < 0.5 ? -1 : 1 }));
  }, [pet, cor]);

  useEffect(() => {
    if (!ativo) return undefined;
    const relogio = setInterval(() => {
      setPosicao((atual) => {
        const quadro = atual.quadro === 0 ? 1 : 0;
        if (!animadoRef.current) return { ...atual, quadro, andando: false };

        /* Troca de ideia: às vezes para, às vezes volta a andar. */
        let andando = atual.andando;
        if (andando && Math.random() < 0.06) andando = false;
        else if (!andando && Math.random() < 0.18) andando = true;

        if (!andando) return { ...atual, quadro, andando };

        let dir = atual.dir;
        let x = atual.x + dir * PASSO;
        if (x <= LIMITE_ESQ) {
          x = LIMITE_ESQ;
          dir = 1;
        } else if (x >= LIMITE_DIR) {
          x = LIMITE_DIR;
          dir = -1;
        }
        return { x, dir, andando, quadro };
      });
    }, BATIDA_MS);
    return () => clearInterval(relogio);
  }, [ativo, pet]);

  /* Fala e pulinho duram o suficiente para serem vistos, depois o bicho volta
     ao normal. */
  const acariciar = useCallback(() => {
    if (!ativo) return;
    setFala(falaAleatoria(pet));
    setCarinho(true);
    if (caladoRef.current) clearTimeout(caladoRef.current);
    caladoRef.current = setTimeout(() => {
      setFala('');
      setCarinho(false);
    }, DURACAO_FALA);
  }, [ativo, pet]);

  useEffect(() => () => {
    if (caladoRef.current) clearTimeout(caladoRef.current);
  }, []);

  if (!ativo || !sprite) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${posicao.x * 100}%`,
        bottom: 'calc(6.25vh + 2px)',
        transform: 'translateX(-50%)',
        zIndex: 2,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {fala ? (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            marginBottom: 6,
            padding: '5px 9px',
            borderRadius: 9,
            whiteSpace: 'nowrap',
            fontSize: 10.5,
            color: 'var(--c3)',
            fontFamily: 'var(--font-main)',
            background: 'color-mix(in srgb, var(--c8) 78%, transparent)',
            border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)',
          }}
        >
          {fala}
        </div>
      ) : null}

      <div
        onClick={acariciar}
        role="button"
        tabIndex={0}
        title="Fazer carinho"
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            acariciar();
          }
        }}
        style={{
          pointerEvents: 'auto',
          cursor: 'pointer',
          lineHeight: 0,
          transform: `translateY(${carinho ? -7 : 0}px) scale(${carinho ? 1.06 : 1})`,
          transition: 'transform 140ms ease-out',
        }}
      >
        <PetSprite
          sprite={sprite}
          acao={posicao.andando ? 'andando' : 'parado'}
          quadro={posicao.quadro}
          escala={ESCALA}
          virado={posicao.dir < 0}
        />
      </div>
    </div>
  );
}
