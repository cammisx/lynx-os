import { useEffect, useState } from 'react';
import GuiaPixie from '@/components/tutorial/GuiaPixie';
import { assinarChamadoPixie } from '@/lib/pixie';
import {
  SAUDACAO,
  SEM_TUTORIAL,
  falaDoElemento,
  falaDoPonto,
} from '@/lib/pixieTutoriais';

/**
 * A Pixie chamada pelo menu do botão direito, em qualquer lugar do sistema.
 *
 * Se o lugar clicado já tem tutorial escrito, ela chega falando dele. Se não
 * tem, ela se apresenta e espera a pessoa apontar o que quer saber. Depois de
 * responder, fica um tempo na tela e sai sozinha (Esc também dispensa).
 *
 * No tutorial (rota /tutorial) ela não entra: lá quem responde é o roteiro,
 * que já está com ela na tela.
 */

const TEMPO_COM_TUTORIAL = 9000;
const TEMPO_ESPERANDO = 25000;
const TEMPO_SAINDO = 500;

export default function PixieAjuda() {
  /* { fala, apontando } enquanto ela está na tela. */
  const [estado, setEstado] = useState(null);
  const [saindo, setSaindo] = useState(false);

  useEffect(
    () =>
      assinarChamadoPixie(({ x, y, alvo }) => {
        const conhecida = alvo ? falaDoElemento(alvo) : falaDoPonto(x, y);
        setSaindo(false);
        setEstado(
          conhecida
            ? { fala: conhecida, apontando: false }
            : { fala: SAUDACAO, apontando: true }
        );
      }),
    []
  );

  /* Cada fala tem seu tempo: esperando ela pode ficar mais. */
  useEffect(() => {
    if (!estado) return undefined;
    const t = setTimeout(
      () => setSaindo(true),
      estado.apontando ? TEMPO_ESPERANDO : TEMPO_COM_TUTORIAL
    );
    return () => clearTimeout(t);
  }, [estado]);

  useEffect(() => {
    if (!saindo) return undefined;
    const t = setTimeout(() => {
      setEstado(null);
      setSaindo(false);
    }, TEMPO_SAINDO);
    return () => clearTimeout(t);
  }, [saindo]);

  useEffect(() => {
    if (!estado) return undefined;
    const tecla = (evento) => {
      if (evento.key === 'Escape') setSaindo(true);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [estado]);

  if (!estado) return null;

  return (
    <div
      style={{
        opacity: saindo ? 0 : 1,
        transition: `opacity ${TEMPO_SAINDO}ms ease`,
      }}
    >
      <GuiaPixie
        texto={estado.fala}
        capturarClique={estado.apontando && !saindo}
        aoClique={(evento) => {
          const fala =
            falaDoPonto(evento?.clientX ?? 0, evento?.clientY ?? 0) || SEM_TUTORIAL;
          setEstado({ fala, apontando: false });
        }}
      />
    </div>
  );
}
