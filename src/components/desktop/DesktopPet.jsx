import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PetSprite from '@/components/desktop/PetSprite';
import CoracaoPet from '@/components/desktop/CoracaoPet';
import MenuPet from '@/components/desktop/MenuPet';
import PetNomeModal from '@/components/desktop/PetNomeModal';
import PetReacoesModal from '@/components/desktop/PetReacoesModal';
import useReacoesPet from '@/hooks/useReacoesPet';
import {
  CORES_PET,
  PETS_DISPONIVEIS,
  falaAleatoria,
  nomeDoPet,
  petValido,
  spriteDe,
  temPet,
} from '@/lib/pets';

/* Ritmo da animação: cada batida troca o quadro e, se ele estiver andando,
   empurra um passo. Lento de propósito, para não roubar CPU do desktop. */
const BATIDA_MS = 240;
const PASSO = 0.007;
const LIMITE_ESQ = 0.03;
const LIMITE_DIR = 0.97;
const ESCALA = 4;
const DURACAO_FALA = 2600;
const DURACAO_CARINHO = 1500;

const SEPARADOR = { separador: true };

/** Cor normalizada, para marcar no menu a bolinha da cor atual. */
const atualCor = (cor) => (CORES_PET.some((item) => item.id === cor) ? cor : CORES_PET[0].id);

/**
 * O pet do desktop.
 *
 * Gato e cachorro passeiam pela base da tela, param de vez em quando e
 * respondem ao clique com uma fala. O morcego mora de cabeça para baixo,
 * grudado no topo, balançando devagar.
 *
 * Clique esquerdo é o clique normal; o carinho (corações e animação de feliz)
 * fica no botão direito, junto com trocar pet, trocar cor, nomear e, para
 * admin, editar as reações. As frases vêm da entidade PetReacao e, sem
 * registro, caem nas de fábrica do código.
 */
export default function DesktopPet({
  pet,
  cor,
  nome = '',
  admin = false,
  onTrocarPet,
  onTrocarCor,
  onNomear,
}) {
  const sprite = spriteDe(pet, cor);
  const ativo = temPet(pet);
  /* Morcego fica pendurado: não anda, balança. */
  const pendurado = petValido(pet) === 'morcego';
  const { reacoes, recarregar } = useReacoesPet();

  const [posicao, setPosicao] = useState({ x: 0.5, dir: 1, andando: false, quadro: 0 });
  const [fala, setFala] = useState('');
  const [reacao, setReacao] = useState(null);
  const [coracoes, setCoracoes] = useState(false);
  const [animado, setAnimado] = useState(true);
  const [menu, setMenu] = useState(null);
  const [modalNome, setModalNome] = useState(false);
  const [modalReacoes, setModalReacoes] = useState(false);
  const caladoRef = useRef(null);
  const coracoesRef = useRef(null);
  const voltaRef = useRef(null);

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
     ao normal. O carinho solta corações e uma animação de feliz. */
  const reagir = useCallback(
    (tipo) => {
      if (!ativo) return;
      setFala(falaAleatoria(pet, tipo, reacoes));
      setReacao(tipo);
      setCoracoes(tipo === 'carinho' && animado);
      if (caladoRef.current) clearTimeout(caladoRef.current);
      caladoRef.current = setTimeout(() => setFala(''), DURACAO_FALA);
      if (coracoesRef.current) clearTimeout(coracoesRef.current);
      coracoesRef.current = setTimeout(() => setCoracoes(false), DURACAO_CARINHO);
      if (voltaRef.current) clearTimeout(voltaRef.current);
      voltaRef.current = setTimeout(
        () => setReacao(null),
        tipo === 'carinho' ? DURACAO_CARINHO : 900
      );
    },
    [ativo, pet, reacoes, animado]
  );

  useEffect(
    () => () => {
      if (caladoRef.current) clearTimeout(caladoRef.current);
      if (coracoesRef.current) clearTimeout(coracoesRef.current);
      if (voltaRef.current) clearTimeout(voltaRef.current);
    },
    []
  );

  /* Menu do botão direito. */
  const itensMenu = useMemo(() => {
    const filhosPet = PETS_DISPONIVEIS.map((item) => ({
      id: item.id,
      rotulo: item.nome,
      marcado: item.id === petValido(pet),
      acao: () => onTrocarPet?.(item.id),
    }));
    const filhosCor = CORES_PET.map((item) => ({
      id: item.id,
      rotulo: item.nome,
      marcado: item.id === atualCor(cor),
      /* A bolinha mostra a cor de verdade no pet escolhido. */
      cor: spriteDe(temPet(pet) ? pet : 'gato', item.id)?.paleta?.b,
      acao: () => onTrocarCor?.(item.id),
    }));

    return [
      { id: 'carinho', rotulo: 'Fazer carinho', acao: () => reagir('carinho') },
      SEPARADOR,
      { id: 'pet', rotulo: 'Alterar pet', filhos: filhosPet },
      { id: 'cor', rotulo: 'Alterar cor', filhos: filhosCor },
      { id: 'nomear', rotulo: nome ? 'Renomear…' : 'Nomear…', acao: () => setModalNome(true) },
      ...(admin
        ? [
            SEPARADOR,
            { id: 'reacoes', rotulo: 'Editar reações…', acao: () => setModalReacoes(true) },
          ]
        : []),
    ];
  }, [pet, cor, nome, admin, onTrocarPet, onTrocarCor, reagir]);

  if (!ativo || !sprite) return null;

  const abrirMenu = (evento) => {
    evento.preventDefault();
    evento.stopPropagation();
    setMenu({ x: evento.clientX, y: evento.clientY });
  };

  const balao = fala ? (
    <div
      style={{
        position: 'absolute',
        bottom: pendurado ? undefined : '100%',
        top: pendurado ? '100%' : undefined,
        marginTop: pendurado ? 6 : 0,
        marginBottom: pendurado ? 0 : 6,
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
      {nome ? (
        <span
          style={{
            display: 'block',
            fontSize: 8.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--c1)',
          }}
        >
          {nome}
        </span>
      ) : null}
      {fala}
    </div>
  ) : null;

  const coracoesVoando = coracoes ? (
    <div
      style={{
        position: 'absolute',
        bottom: pendurado ? undefined : '100%',
        top: pendurado ? '100%' : undefined,
        left: '50%',
        width: 0,
        height: 0,
        pointerEvents: 'none',
      }}
    >
      {[0, 1, 2].map((indice) => (
        <span
          key={indice}
          style={{
            position: 'absolute',
            left: [-16, 2, 16][indice],
            bottom: 0,
            animation: `lynxPetCoracao 1200ms ease-out ${indice * 140}ms forwards`,
          }}
        >
          <CoracaoPet paleta={sprite.paleta} escala={2} />
        </span>
      ))}
    </div>
  ) : null;

  const animacao = () => {
    if (!animado) {
      return pendurado ? 'rotate(180deg)' : 'none';
    }
    if (reacao === 'carinho') {
      return pendurado
        ? 'lynxPetFelizPendurado 900ms ease-in-out'
        : 'lynxPetFeliz 900ms ease-in-out';
    }
    if (pendurado) {
      return reacao ? 'none' : 'lynxPetPendurado 4.6s ease-in-out infinite';
    }
    return 'none';
  };

  const transformar = () => {
    if (pendurado) {
      return reacao === 'clique' && animado ? 'rotate(180deg) scale(1.08)' : undefined;
    }
    if (reacao === 'clique' && animado) return 'translateY(-7px) scale(1.06)';
    return undefined;
  };

  const interagir = (
    <div
      onClick={() => reagir('clique')}
      onContextMenu={abrirMenu}
      role="button"
      tabIndex={0}
      title={nome ? `${nome} · clique direito abre o menu` : 'Clique direito abre o menu'}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          reagir('clique');
        }
      }}
      style={{
        pointerEvents: 'auto',
        cursor: 'pointer',
        lineHeight: 0,
        position: 'relative',
        transform: transformar(),
        animation: animacao(),
        transition:
          animado && reacao !== 'carinho' ? 'transform 140ms ease-out' : undefined,
      }}
    >
      {coracoesVoando}
      <PetSprite
        sprite={sprite}
        acao={reacao || posicao.andando ? 'andando' : 'parado'}
        quadro={posicao.quadro}
        escala={ESCALA}
        virado={!pendurado && posicao.dir < 0}
      />
    </div>
  );

  return (
    <>
      <div
        style={
          pendurado
            ? {
                position: 'absolute',
                top: 0,
                left: `${posicao.x * 100}%`,
                transform: 'translateX(-50%)',
                zIndex: 2,
                pointerEvents: 'none',
              }
            : {
                position: 'absolute',
                left: `${posicao.x * 100}%`,
                bottom: 'calc(6.25vh + 2px)',
                transform: 'translateX(-50%)',
                zIndex: 2,
                pointerEvents: 'none',
              }
        }
      >
        {balao}
        {interagir}
      </div>

      {menu ? (
        <MenuPet
          x={menu.x}
          y={menu.y}
          itens={itensMenu}
          cabecalho={nome || nomeDoPet(pet)}
          onFechar={() => setMenu(null)}
        />
      ) : null}

      {modalNome ? (
        <PetNomeModal
          pet={pet}
          nome={nome}
          onFechar={() => setModalNome(false)}
          onSalvar={(valor) => onNomear?.(valor)}
        />
      ) : null}

      {modalReacoes ? (
        <PetReacoesModal
          onFechar={() => setModalReacoes(false)}
          onSalvo={() => {
            recarregar();
            setFala('');
          }}
        />
      ) : null}
    </>
  );
}
