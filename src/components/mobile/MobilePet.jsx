import { useCallback, useEffect, useRef, useState } from 'react';
import PetSprite from '@/components/desktop/PetSprite';
import CoracaoPet from '@/components/desktop/CoracaoPet';
import PetNomeModal from '@/components/desktop/PetNomeModal';
import PetReacoesModal from '@/components/desktop/PetReacoesModal';
import MobileSheet from '@/components/mobile/MobileSheet';
import useReacoesPet from '@/hooks/useReacoesPet';
import { salvarPerfil } from '@/lib/perfilUsuario';
import {
  CORES_PET,
  PETS_DISPONIVEIS,
  falaAleatoria,
  nomeDoPet,
  petValido,
  spriteDe,
  temPet,
} from '@/lib/pets';

/* No celular o bicho é menor e a faixa de passeio é curta: a área entre a
   barra de status e o dock, que é o miolo da tela do Mais. */
const BATIDA_MS = 260;
const PASSO = 0.009;
const LIMITE_ESQ = 0.08;
const LIMITE_DIR = 0.92;
const ESCALA = 3;
const DURACAO_FALA = 2400;
const DURACAO_CARINHO = 1400;
const DURACAO_CORACOES = 2400;
const ESPERA_DUPLO = 260;

const atualCor = (cor) => (CORES_PET.some((item) => item.id === cor) ? cor : CORES_PET[0].id);

const rotuloSecao = {
  fontSize: 9.5,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

/**
 * Pet do celular.
 *
 * Mesmo bicho desenhado no desktop, mas com vida própria: a escolha aqui é
 * gravada no conjunto do celular (pet_celular no User), então o gato do
 * telefone não mexe no gato do computador.
 *
 * Um toque faz carinho no bicho (fala e pulinho). Toque duplo abre o menu de
 * opções numa folha de rodapé: carinho, trocar pet, trocar cor, nomear e, para
 * admin, editar as reações.
 */
export default function MobilePet({ user, perfil, admin = false }) {
  const pet = perfil?.pet;
  const cor = perfil?.petCor;
  const nome = perfil?.petNome || '';
  const sprite = spriteDe(pet, cor);
  const ativo = temPet(pet);
  /* O morcego fica pendurado no topo da tela; os outros passeiam na base. */
  const pendurado = petValido(pet) === 'morcego';
  const { reacoes, recarregar } = useReacoesPet();

  const [posicao, setPosicao] = useState({ x: 0.5, dir: 1, andando: false, quadro: 0 });
  const [fala, setFala] = useState('');
  const [reacao, setReacao] = useState(null);
  const [coracoes, setCoracoes] = useState(false);
  const [animado, setAnimado] = useState(true);
  const [menu, setMenu] = useState(false);
  const [modalNome, setModalNome] = useState(false);
  const [modalReacoes, setModalReacoes] = useState(false);
  const caladoRef = useRef(null);
  const coracoesRef = useRef(null);
  const voltaRef = useRef(null);
  const duploRef = useRef(null);

  useEffect(() => {
    setAnimado(!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  }, []);

  useEffect(() => {
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

  const reagir = useCallback(
    (tipo) => {
      if (!ativo) return;
      setFala(falaAleatoria(pet, tipo, reacoes));
      setReacao(tipo);
      setCoracoes(tipo === 'carinho' && animado);
      if (caladoRef.current) clearTimeout(caladoRef.current);
      caladoRef.current = setTimeout(() => setFala(''), DURACAO_FALA);
      if (coracoesRef.current) clearTimeout(coracoesRef.current);
      coracoesRef.current = setTimeout(() => setCoracoes(false), DURACAO_CORACOES);
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
      if (duploRef.current) clearTimeout(duploRef.current);
    },
    []
  );

  if (!ativo || !sprite) return null;

  /* Um toque espera a janela do duplo toque: se o segundo chegar, vira menu
     em vez de dois pulinhos. */
  const tocar = () => {
    if (duploRef.current) {
      clearTimeout(duploRef.current);
      duploRef.current = null;
      setMenu(true);
      return;
    }
    duploRef.current = setTimeout(() => {
      duploRef.current = null;
      reagir('clique');
    }, ESPERA_DUPLO);
  };

  const animacao = () => {
    if (!animado) return pendurado ? 'rotate(180deg)' : 'none';
    if (reacao === 'carinho') {
      return pendurado ? 'lynxPetFelizPendurado 900ms ease-in-out' : 'lynxPetFeliz 900ms ease-in-out';
    }
    if (pendurado) return reacao ? 'none' : 'lynxPetPendurado 4.6s ease-in-out infinite';
    return 'none';
  };

  const transformar = () => {
    if (pendurado) {
      return reacao === 'clique' && animado ? 'rotate(180deg) scale(1.08)' : undefined;
    }
    if (reacao === 'clique' && animado) return 'translateY(-6px) scale(1.06)';
    return undefined;
  };

  const titulo = nome || nomeDoPet(pet);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${posicao.x * 100}%`,
            ...(pendurado ? { top: 0 } : { bottom: 2 }),
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        >
          {fala ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                ...(pendurado ? { top: '100%', marginTop: 6 } : { bottom: '100%', marginBottom: 6 }),
                transform: 'translateX(-50%)',
                padding: '5px 9px',
                borderRadius: 9,
                whiteSpace: 'nowrap',
                fontSize: 10.5,
                color: 'var(--c3)',
                fontFamily: 'var(--font-main)',
                background: 'color-mix(in srgb, var(--c8) 82%, transparent)',
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
          ) : null}

          <button
            type="button"
            onClick={tocar}
            aria-label={`${titulo} · toque para brincar, toque duplo para as opções`}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              lineHeight: 0,
              position: 'relative',
              padding: 0,
              border: 'none',
              background: 'transparent',
              transform: transformar(),
              animation: animacao(),
              transition: animado && reacao !== 'carinho' ? 'transform 140ms ease-out' : undefined,
            }}
          >
            <PetSprite
              sprite={sprite}
              acao={reacao === 'clique' || reacao === 'carinho' || posicao.andando ? 'andando' : 'parado'}
              quadro={posicao.quadro}
              escala={ESCALA}
              virado={pendurado ? false : posicao.dir < 0}
            />
          </button>

          {coracoes ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                ...(pendurado ? { top: '100%' } : { bottom: '100%' }),
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
                    left: [-12, 1, 12][indice],
                    ...(pendurado ? { top: 0 } : { bottom: 0 }),
                    animation: pendurado
                      ? `lynxPetCoracaoPendurado 1900ms ease-out ${indice * 160}ms forwards`
                      : `lynxPetCoracao 1200ms ease-out ${indice * 140}ms forwards`,
                  }}
                >
                  <CoracaoPet paleta={sprite.paleta} escala={2} />
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {menu && (
        <MobileSheet
          titulo={titulo}
          subtitulo="Toque duplo no bicho abre estas opções"
          onFechar={() => setMenu(false)}
          alturaMax="80dvh"
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
              gap: 14,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                reagir('carinho');
              }}
              style={{
                height: 40,
                borderRadius: 12,
                border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 16%, transparent)',
                color: 'var(--c1)',
                fontFamily: 'inherit',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fazer carinho
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={rotuloSecao}>Pet do celular</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {PETS_DISPONIVEIS.map((item) => {
                  const escolhido = (pet || 'nenhum') === item.id;
                  const desenho = spriteDe(item.id, cor);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => salvarPerfil(user, { pet: item.id })}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '8px 3px',
                        borderRadius: 12,
                        border: escolhido
                          ? '1px solid color-mix(in srgb, var(--c1) 70%, transparent)'
                          : '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                        background: escolhido
                          ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                          : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                        color: escolhido ? 'var(--c1)' : 'var(--c3)',
                        fontFamily: 'inherit',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 40,
                          fontSize: 16,
                          color: 'var(--c2)',
                        }}
                      >
                        {desenho ? <PetSprite sprite={desenho} acao="parado" quadro={0} escala={2} /> : '∅'}
                      </span>
                      {item.nome}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={rotuloSecao}>Cor</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
                {CORES_PET.map((item) => {
                  const escolhida = atualCor(cor) === item.id;
                  const desenho = spriteDe(temPet(pet) ? pet : 'gato', item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => salvarPerfil(user, { petCor: item.id })}
                      title={item.nome}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        padding: '6px 3px',
                        borderRadius: 10,
                        border: escolhida
                          ? '1px solid color-mix(in srgb, var(--c1) 70%, transparent)'
                          : '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                        background: escolhida
                          ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                          : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                        color: 'var(--c2)',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <PetSprite sprite={desenho} acao="parado" quadro={0} escala={1} />
                      <span style={{ fontSize: 8.5, lineHeight: 1.2 }}>{item.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setMenu(false);
                  setModalNome(true);
                }}
                style={{
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1px solid color-mix(in srgb, var(--c2) 24%, transparent)',
                  background: 'transparent',
                  color: 'var(--c3)',
                  fontFamily: 'inherit',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {nome ? 'Renomear…' : 'Nomear…'}
              </button>

              {admin && (
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setModalReacoes(true);
                  }}
                  style={{
                    height: 34,
                    padding: '0 14px',
                    borderRadius: 10,
                    border: '1px dashed color-mix(in srgb, var(--c2) 28%, transparent)',
                    background: 'transparent',
                    color: 'var(--c2)',
                    fontFamily: 'inherit',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Editar reações…
                </button>
              )}
            </div>
          </div>
        </MobileSheet>
      )}

      {modalNome && (
        <PetNomeModal
          pet={pet}
          nome={nome}
          onFechar={() => setModalNome(false)}
          onSalvar={(valor) => salvarPerfil(user, { petNome: valor })}
        />
      )}

      {modalReacoes && (
        <PetReacoesModal
          onFechar={() => setModalReacoes(false)}
          onSalvo={() => {
            recarregar();
            setFala('');
          }}
        />
      )}
    </>
  );
}
