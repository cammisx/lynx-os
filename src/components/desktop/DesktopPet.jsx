import { useCallback, useEffect, useRef, useState } from 'react';
import PetSprite from '@/components/desktop/PetSprite';
import { falaAleatoria, petValido, spriteDe, temPet } from '@/lib/pets';

/* Ritmo da animação: cada batida troca o quadro e, se ele estiver andando,
   empurra um passo. Lento de propósito, para não roubar CPU do desktop. */
const BATIDA_MS = 240;
const PASSO = 0.007;
const LIMITE_ESQ = 0.03;
const LIMITE_DIR = 0.97;
const ESCALA = 4;
const DURACAO_FALA = 2600;

/**
 * O pet do desktop.
 *
 * Gato e cachorro passeiam pela base da tela, param de vez em quando e
 * respondem a clique com um pulinho e uma fala. O morcego é diferente: mora
 * de cabeça para baixo, grudado no topo da tela, balançando devagar como um
 * morcego de verdade. Clicar nele faz bater as asas e falar.
 *
 * Só aparece se o usuário escolheu um pet nas Preferências, e quem prefere
 * menos animação no sistema vê tudo parado (mas o carinho continua valendo).
 */
export default function DesktopPet({ pet, cor }) {
  const sprite = spriteDe(pet, cor);
  const ativo = temPet(pet);
  /* Morcego fica pendurado: não anda, balança. */
  const pendurado = petValido(pet) === 'morcego';

  const [posicao, setPosicao] = useState({ x: 0.5, dir: 1, andando: false, quadro: 0 });
  const [fala, setFala] = useState('');
  const [carinho, setCarinho] = useState(false);
  const [animado, setAnimado] = useState(true);
  const caladoRef = useRef(null);

  useEffect(() => {
    setAnimado(!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    /* O morcego escolhe um canto do teto e fica lá; os outros começam no meio
       do caminho, indo para um lado qualquer. */
    setPosicao((atual) => ({
      ...atual,
      x: pendurado ? 0.2 + Math.random() * 0.6 : 0.25 + Math.random() * 0.5,
      dir: Math.random() < 0.5 ? -1 : 1,
    }));
  }, [pet, cor, pendurado]);

  useEffect(() => {
    if (!ativo) return undefined;
    const relogio = setInterval(() => {
      setPosicao((atual) => {
        const quadro = atual.quadro === 0 ? 1 : 0;
        if (pendurado || !animado) return { ...atual, quadro, andando: false };

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
  }, [ativo, pet, pendurado, animado]);

  /* Fala e reação duram o suficiente para serem vistas, depois o bicho volta
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

  const balao = fala ? (
    <div
      style={{
        position: 'absolute',
        bottom: pendurado ? undefined : '100%',
        top: pendurado ? '100%' : undefined,
        marginBottom: pendurado ? 0 : 6,
        marginTop: pendurado ? 6 : 0,
        left: '50%',
        transform: 'translateX(-50%)',
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
  ) : null;

  /* Morcego: de cabeça para baixo, preso no topo, balançando. */
  if (pendurado) {
    const balanco = carinho
      ? 'rotate(180deg) scale(1.08)'
      : animado
        ? undefined
        : 'rotate(180deg)';
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${posicao.x * 100}%`,
          transform: 'translateX(-50%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        {balao}
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
            transformOrigin: '50% 0%',
            transform: balanco,
            animation:
              animado && !carinho ? 'lynxPetPendurado 4.6s ease-in-out infinite' : 'none',
            transition: carinho ? 'transform 140ms ease-out' : undefined,
          }}
        >
          <PetSprite
            sprite={sprite}
            acao={carinho || posicao.andando ? 'andando' : 'parado'}
            quadro={posicao.quadro}
            escala={ESCALA}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${posicao.x * 100}%`,
        bottom: 'calc(6.25vh + 2px)',
        transform: 'translateX(-50%)',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      {balao}
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
