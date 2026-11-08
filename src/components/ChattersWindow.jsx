import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import { UsersIcon } from '@/components/icons';
import { cargoDaPessoa, fotoDaPessoa, iniciaisDe, nomeDaPessoa } from '@/lib/perfilLogica';
import { listarPerfis, mapaDePerfis } from '@/lib/perfis';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const semAcento = (texto) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const campoBusca = {
  flex: 1,
  minWidth: 0,
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  outline: 'none',
  boxSizing: 'border-box',
};

const avatar = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--c1)',
  background: 'color-mix(in srgb, var(--c1) 16%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
  overflow: 'hidden',
};

/**
 * Chatters: a relação de todo mundo que tem conta no app.
 *
 * Só leitura por enquanto: nome de exibição, e-mail e cargo de cada pessoa,
 * com busca por nome ou e-mail. As ações daqui (comissões, edição) voltam
 * quando a tela for definida.
 */
export default function ChattersWindow({ onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState(new Map());
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const [listaUsuarios, listaPerfis] = await Promise.all([
          base44.entities.User.list(),
          listarPerfis(),
        ]);
        if (!ativo) return;
        setUsuarios(asList(listaUsuarios));
        setPerfis(mapaDePerfis(listaPerfis));
      } catch (falha) {
        console.warn('[Chatters] carregar', falha);
        if (ativo) setErro('Não consegui carregar a lista de usuários agora.');
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const lista = useMemo(() => {
    const termo = semAcento(busca).trim();
    return usuarios
      .map((usuario) => {
        const perfil = perfis.get(usuario.id) || null;
        return {
          ...usuario,
          perfil,
          nome: nomeDaPessoa(usuario, perfil),
          email: usuario.email || perfil?.usuario_email || '',
          cargo: cargoDaPessoa(usuario),
          foto: perfil?.foto_url || fotoDaPessoa(usuario),
        };
      })
      .filter((usuario) => {
        if (!termo) return true;
        return semAcento(`${usuario.nome} ${usuario.email}`).includes(termo);
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [usuarios, perfis, busca]);

  return (
    <Window title="Chatters" icon={UsersIcon} onClose={onClose} width={620} height={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c3)' }}>Todos os usuários</span>
          <span style={{ fontSize: 10, color: 'var(--c2)' }}>
            {carregando ? 'carregando…' : `${lista.length} de ${usuarios.length}`}
          </span>
          <div style={{ flex: 1 }} />
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por nome ou e-mail"
            style={{ ...campoBusca, maxWidth: 220 }}
          />
        </div>

        {erro ? <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{erro}</span> : null}

        <div
          className="glass-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            paddingRight: 4,
          }}
        >
          {!carregando && !lista.length && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.75 }}>
              {usuarios.length ? 'Ninguém com esse nome ou e-mail.' : 'Nenhum usuário no app ainda.'}
            </span>
          )}

          {lista.map((usuario) => (
            <div
              key={usuario.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '7px 9px',
                borderRadius: 9,
                border: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
              }}
            >
              <div style={avatar}>
                {usuario.foto ? (
                  <img
                    src={usuario.foto}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  iniciaisDe(usuario.nome)
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--c3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {usuario.nome}
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    color: 'var(--c2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {usuario.email || 'sem e-mail'}
                </span>
              </div>

              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 6,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: usuario.cargo === 'admin' ? 'var(--c1)' : 'var(--c2)',
                  background:
                    usuario.cargo === 'admin'
                      ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                      : 'transparent',
                  border: `1px solid ${
                    usuario.cargo === 'admin'
                      ? 'color-mix(in srgb, var(--c1) 35%, transparent)'
                      : 'color-mix(in srgb, var(--c2) 18%, transparent)'
                  }`,
                  flexShrink: 0,
                }}
              >
                {usuario.cargo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}
