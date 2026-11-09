import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import { CloseIcon, PencilIcon, PlusIcon, TrashIcon, UsersIcon } from '@/components/icons';
import ModalConvidar from '@/components/chatters/ModalConvidar';
import ModalExcluirAcesso from '@/components/chatters/ModalExcluirAcesso';
import FichaChatterModal from '@/components/chatters/FichaChatterModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/AuthContext';
import { ehAdmin } from '@/lib/chat';
import { guardarNomePendente, nomePendente, normalizarEmail } from '@/lib/convites';
import {
  cancelarConvite,
  criarConvite,
  enviarConviteBase44,
  listarConvitesPendentes,
  removerAcesso,
} from '@/lib/convitesChatter';
import { emitChattersChanged, emitModelsChanged } from '@/lib/desktopEvents';
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

const botaoIcone = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: 7,
  border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
  background: 'transparent',
  color: 'var(--c2)',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
};

/**
 * Chatters: quem tem conta no app.
 *
 * Convite completo (cargo, modelos com ID e turnos), ficha de cadastro por
 * pessoa e remoção de acesso. O convite pendente aparece com o selo de quem
 * ainda não criou a conta.
 */
export default function ChattersWindow({ onClose }) {
  const pequeno = useIsMobile();
  const { user } = useAuth();
  const admin = ehAdmin(user);
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState(new Map());
  const [modelos, setModelos] = useState([]);
  const [convites, setConvites] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [convidando, setConvidando] = useState(false);
  const [fichaAberta, setFichaAberta] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
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
      /* Modelos só o admin enxerga (RLS), e só ele convida. */
      if (admin) {
        setModelos(asList(await base44.entities.Modelo.list().catch(() => [])));
      }
      if (admin) {
        setConvites(await listarConvitesPendentes().catch(() => []));
      }
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
   * Convite: o Base44 manda o e-mail com o cargo certo e o convite completo
   * fica guardado para nascer junto com a conta.
   */
  const convidar = async ({ nome, email, cargo, modelos: vinculos, turnos }) => {
    const alvo = normalizarEmail(email);
    try {
      await enviarConviteBase44(alvo, cargo);
    } catch (falha) {
      console.warn('[Chatters] convite recusado', falha);
      const mensagem =
        falha?.response?.data?.message || falha?.message || 'Não consegui enviar o convite agora.';
      return { erro: `${mensagem} (confira se o e-mail está certo e se você é admin)` };
    }

    try {
      await criarConvite({
        nome,
        email: alvo,
        cargo,
        modelos: vinculos,
        turnos,
        convidadoPor: user?.id || '',
      });
    } catch (falha) {
      console.warn('[Chatters] convite não ficou guardado', falha);
      return {
        erro: 'O e-mail do convite saiu, mas não consegui guardar os modelos e turnos. Abra o convite de novo.',
      };
    }

    /* O nome digitado espera a pessoa entrar: quem aplica o convite é a sessão dela. */
    if (nome) guardarNomePendente(alvo, nome);

    setAviso(
      `Convite enviado para ${nome} (${alvo}). Modelos, turnos e a notificação para aprovar entram no primeiro acesso dela.`
    );
    await carregar();
    return { ok: true };
  };

  const cancelar = async (convite) => {
    try {
      await cancelarConvite(convite.id, 'Cancelado pelo admin');
      setConvites((prev) => prev.filter((item) => item.id !== convite.id));
      setAviso(`Convite de ${convite.email} cancelado.`);
    } catch (falha) {
      console.warn('[Chatters] cancelar convite', falha);
      setErro('Não consegui cancelar esse convite.');
    }
  };

  const excluir = async (motivo) => {
    if (!excluindo?.id) return { erro: 'Ninguém selecionado.' };
    try {
      const resultado = await removerAcesso(excluindo.id, motivo);
      const resumo = resultado?.resumo || {};
      setAviso(
        `Acesso de ${resumo.nome || excluindo.email} removido. Modelos: ${resumo.modelos || 0} · Turnos cancelados: ${
          resumo.turnos_cancelados || 0
        }${resultado?.apagado === false ? ' · o cadastro do usuário não foi apagado, confira no painel' : ''}.`
      );
      emitChattersChanged();
      emitModelsChanged();
      await carregar();
      return { ok: true };
    } catch (falha) {
      console.warn('[Chatters] remover acesso', falha);
      return { erro: falha?.message || 'Não consegui remover o acesso agora.' };
    }
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
              Convidar
            </button>
          )}
        </div>

        {aviso ? <span style={{ fontSize: 10.5, color: 'var(--c1)' }}>{aviso}</span> : null}

        {erro ? <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{erro}</span> : null}

        {admin && convites.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              padding: '7px 9px',
              borderRadius: 9,
              border: '1px dashed color-mix(in srgb, var(--c1) 30%, transparent)',
              background: 'color-mix(in srgb, var(--c1) 6%, transparent)',
            }}
          >
            <span style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c1)' }}>
              Convites esperando a conta
            </span>
            {convites.map((convite) => (
              <div key={convite.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 10.5,
                    color: 'var(--c3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {convite.nome || convite.email}
                  <span style={{ color: 'var(--c2)' }}> · {convite.cargo === 'admin' ? 'admin' : 'chatter'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => cancelar(convite)}
                  aria-label={`Cancelar convite de ${convite.email}`}
                  style={botaoIcone}
                >
                  <CloseIcon size={10} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

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

              {admin ? (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setFichaAberta(usuario)}
                    aria-label={`Abrir a ficha de ${usuario.nome}`}
                    title="Ficha de cadastro"
                    style={botaoIcone}
                  >
                    <PencilIcon size={11} />
                  </button>
                  {usuario.id !== user?.id ? (
                    <button
                      type="button"
                      onClick={() => setExcluindo(usuario)}
                      aria-label={`Remover o acesso de ${usuario.nome}`}
                      title="Remover acesso"
                      style={{ ...botaoIcone, color: 'var(--erro)' }}
                    >
                      <TrashIcon size={11} />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {convidando ? (
        <ModalConvidar
          modelos={modelos}
          onFechar={() => setConvidando(false)}
          onEnviar={convidar}
        />
      ) : null}

      {fichaAberta ? (
        <FichaChatterModal
          usuario={fichaAberta}
          onFechar={() => setFichaAberta(null)}
          onSalvo={() => emitChattersChanged()}
        />
      ) : null}

      {excluindo ? (
        <ModalExcluirAcesso
          usuario={excluindo}
          onFechar={() => setExcluindo(null)}
          onConfirmar={excluir}
        />
      ) : null}
    </Window>
  );
}
