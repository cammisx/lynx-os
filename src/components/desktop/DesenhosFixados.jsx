import useDesenhosFixos from '@/hooks/useDesenhosFixos';
import DesenhoFixo from '@/components/desktop/DesenhoFixo';

/**
 * Todos os desenhos fixados na mesa de quem está logado.
 * Fica só no desktop: no celular não existe área de trabalho.
 */
export default function DesenhosFixados() {
  const { desenhos, mover, redimensionar, desafixar } = useDesenhosFixos();

  return (
    <>
      {desenhos.map((desenho) => (
        <DesenhoFixo
          key={desenho.id}
          desenho={desenho}
          onMover={(x, y) => mover(desenho.id, x, y)}
          onRedimensionar={(largura, altura) => redimensionar(desenho.id, largura, altura)}
          onDesafixar={() => desafixar(desenho.id)}
        />
      ))}
    </>
  );
}
