import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import { PlusIcon, UsersIcon } from '@/components/icons';
import ModalConvidar from '@/components/chatters/ModalConvidar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/AuthContext';
import { ehAdmin } from '@/lib/chat';
import { guardarNomePendente, nomePendente, normalizarEmail, tirarNomePendente } from '@/lib/convites';
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
  const pequeno = useIsMobile();
  const { user } = useAuth();
  const admin = ehAdmin(user);
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState(new Map());
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [convidando, setConvidando] = useState(false);
  const [aviso, setAviso] = useState('');

  /* Nome digitado num convite anterior, esperando a pessoa aparecer no app. */
  const aplicarNomesPendentes = async (listaUsuarios) => {
    if (!admin) return listaUsuarios;
    const semNome = listaUsuarios.filter(
      (item) => !item.nome_exibicao && nomePendente(item.email)
    );
    if (!semNome.length) return listaUsuarios;
    return Promise.all(
      listaUsuarios.map(async (item) => {
        const pendente = !item.nome_exibicao ? nomePendente(item.email) : '';
        if (!pendente) return item;
        try {
          const salvo = await base44.entities.User.update(item.id, { nome_exibicao: pendente });
          tirarNomePendente(item.email);
          return { ...item, ...(salvo || {}), nome_exibicao: pendente };
        } catch (falha) {
          console.warn('[Chatters] não consegui aplicar o nome do convite', falha);
          return item;
        }
      })
    );
  };

  const carregar = useCallback(async () => {
    try {
      const [listaUsuarios, listaPerfis] = await Promise.all([
        base44.entities.User.list(),
        listarPerfis(),
      ]);
      const comNomes = await aplicarNomesPendentes(asList(listaUsuarios));
      setUsuarios(comNomes);
      setPerfis(mapaDePerfis(listaPerfis));
      setErro('');
    } catch (falha) {
      console.warn('[Chatters] carregar', falha);
      setErro('Não consegui carregar a lista de usuários agora.');
    } finally {
      setCarregando(false);
    }
  }, [admin]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /**
   * Convite: o Base44 manda o e-mail (base44.users.inviteUser) e o nome é
   * aplicado no usuário na hora, se ele já existir na lista. Se ainda não
   * existir, fica guardado e entra sozinho no próximo carregamento.
   */
  const convidar = async ({ nome, email }) => {
    const alvo = normalizarEmail(email);
    try {
      await base44.users.inviteUser(alvo, 'user');
    } catch (falha) {
      console.warn('[Chatters] convite recusado', falha);
      const mensagem =
        falha?.response?.data?.message || falha?.message || 'Não consegui enviar o convite agora.';
      return { erro: `${mensagem} (confira se o e-mail está certo e se você é admin)` };
    }

    setAviso(`Convite enviado para ${nome} (${alvo}).`);
    try {
      const achados = asList(await base44.entities.User.filter({ email: alvo }));
      const alvoUser = achados[0];
      if (alvoUser?.id) {
        await base44.entities.User.update(alvoUser.id, { nome_exibicao: nome });
        tirarNomePendente(alvo);
      } else {
        guardarNomePendente(alvo, nome);
      }
    } catch (falha) {
      console.warn('[Chatters] nome do convite ficou pendente', falha);
      guardarNomePendente(alvo, nome);
    }

    await carregar();
    return { ok: true };
  };

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: pequeno ? 'wrap' : undefined,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c3)' }}>Todos os usuários</span>
          <span style={{ fontSize: 10, color: 'var(--c2)' }}>
            {carregando ? 'carregando…' : `${lista.length} de ${usuarios.length}`}
          </span>
          <div style={{ flex: 1 }} />
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por nome ou e-mail"
            style={{ ...campoBusca, maxWidth: 200 }}
          />
          {admin && (
            <button
              type="button"
              onClick={() => {
                setAviso('');
                setConvidando(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 11px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 14%, transparent)',
                color: 'var(--c1)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <PlusIcon size={12} />
              Convidar chatter
            </button>
          )}
        </div>

        {aviso ? <span style={{ fontSize: 10.5, color: 'var(--c1)' }}>{aviso}</span> : null}

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

      {convidando ? (
        <ModalConvidar onFechar={() => setConvidando(false)} onEnviar={convidar} />
      ) : null}
    </Window>
  );
}
