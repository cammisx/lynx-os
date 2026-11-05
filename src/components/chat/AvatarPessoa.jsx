import { corDaPessoa, iniciais } from '@/lib/chat';

/**
 * Avatar de pessoa: mostra a foto do perfil quando existe e cai nas iniciais
 * quando não existe. A cor de fundo é estável por id, então a mesma pessoa
 * aparece sempre com a mesma cor em qualquer lugar do app.
 */
export default function AvatarPessoa({
  pessoa,
  nome,
  fotoUrl,
  size = 26,
  radius,
  fontSize,
}) {
  const id = pessoa?.id || '';
  const nomeFinal = nome || pessoa?.nome || '';
  const foto = fotoUrl ?? pessoa?.foto_url ?? '';

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size / 2,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontSize: fontSize ?? Math.max(8, Math.round(size * 0.36)),
        fontWeight: 700,
        color: 'var(--c8)',
        background: foto ? 'color-mix(in srgb, var(--c8) 60%, transparent)' : corDaPessoa(id || nomeFinal),
      }}
    >
      {foto ? (
        <img
          src={foto}
          alt={nomeFinal}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        iniciais(nomeFinal)
      )}
    </span>
  );
}
