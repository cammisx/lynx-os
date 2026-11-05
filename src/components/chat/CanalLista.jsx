import { useCallback, useMemo, useState } from 'react';
import { CheckAllIcon, UsersIcon } from '@/components/icons';
import { useAuth } from '@/lib/AuthContext';
import {
  CANAL_GERAL,
  CANAL_MODELO,
  CANAL_PRIVADO,
  corDaPessoa,
  fotoDoCanal,
  iniciais,
  nomeDoCanal,
  quandoFoi,
  resumoDoCanal,
  tipoDoCanal,
} from '@/lib/chat';
import { useChatPanel } from '@/components/chat/ChatProvider';
import CanalMenu from '@/components/chat/CanalMenu';

const linhaBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid transparent',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'var(--font-main)',
};

function Avatar({ canal, modelos, pessoas, usuario }) {
  const foto = fotoDoCanal(canal, { usuario, pessoas, modelos });
  const arredondado = canal.tipo === CANAL_PRIVADO ? 15 : 9;

  if (foto) {
    return (
      <img
        src={foto}
        alt=""
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: arredondado,
          objectFit: 'cover',
          border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
        }}
      />
    );
  }

  if (canal.tipo === CANAL_GERAL) {
    return (
      <span
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--c1) 16%, transparent)',
          border: '1px solid color-mix(in srgb, var(--c1) 35%, transparent)',
          color: 'var(--c1)',
        }}
      >
        <UsersIcon size={15} />
      </span>
    );
  }

  if (canal.tipo === CANAL_MODELO) {
    const modelo = (modelos || []).find((item) => item.id === canal.modelo_id);
    const nome = modelo?.nome || canal.nome || '?';
    return (
      <span
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: 'var(--c8)',
          background: corDaPessoa(nome),
        }}
      >
        {iniciais(nome)}
      </span>
    );
  }

  const nome = nomeDoCanal(canal, { usuario, pessoas, modelos }) || 'Conversa';
  return (
    <span
      style={{
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--c8)',
        background: corDaPessoa(canal.participantes?.join('-') || nome),
      }}
    >
      {iniciais(nome)}
    </span>
  );
}

export default function CanalLista({ onNovo }) {
  const { user } = useAuth();
  const {
    canais,
    modelos,
    pessoas,
    mensagensPorCanal,
    naoLidasPorCanal,
    canalAtivo,
    abrirCanal,
    carregando,
    marcarTudoLido,
  } = useChatPanel();

  const admin = user?.role === 'admin';
  const totalNaoLidas = useMemo(
    () => [...naoLidasPorCanal.values()].reduce((soma, valor) => soma + valor, 0),
    [naoLidasPorCanal]
  );
  const [menu, setMenu] = useState(null);
  const [salvandoImagem, setSalvandoImagem] = useState(false);
  const [erroImagem, setErroImagem] = useState('');
  const { definirFotoDoCanal } = useChatPanel();

  const fecharMenu = useCallback(() => setMenu(null), []);

  const abrirMenu = (event, canal) => {
    if (!admin) return;
    event.preventDefault();
    event.stopPropagation();
    setErroImagem('');
    setMenu({ canal, x: event.clientX, y: event.clientY });
  };

  const trocarImagem = async (arquivo) => {
    if (!menu?.canal || !arquivo) return;
    if (!String(arquivo.type || '').startsWith('image/')) {
      setErroImagem('Escolha um arquivo de imagem.');
      return;
    }
    if (arquivo.size > 8 * 1024 * 1024) {
      setErroImagem('Imagem muito grande (até 8 MB).');
      return;
    }
    setSalvandoImagem(true);
    setErroImagem('');
    try {
      await definirFotoDoCanal(menu.canal.id, arquivo);
      setMenu(null);
    } catch (falha) {
      console.error('[Chat] não consegui trocar a imagem do canal', falha);
      setErroImagem('Não consegui salvar a imagem.');
    } finally {
      setSalvandoImagem(false);
    }
  };

  const removerImagem = async () => {
    if (!menu?.canal) return;
    setSalvandoImagem(true);
    setErroImagem('');
    try {
      await definirFotoDoCanal(menu.canal.id, null);
      setMenu(null);
    } catch (falha) {
      console.error('[Chat] não consegui remover a imagem do canal', falha);
      setErroImagem('Não consegui remover a imagem.');
    } finally {
      setSalvandoImagem(false);
    }
  };

  const { fixos, conversas } = useMemo(() => {
    const ordenaModelo = (a, b) =>
      nomeDoCanal(a, { usuario: user, modelos }).localeCompare(
        nomeDoCanal(b, { usuario: user, modelos }),
        'pt-BR'
      );
    return {
      fixos: [
        ...canais.filter((canal) => canal.tipo === CANAL_GERAL),
        ...canais.filter((canal) => canal.tipo === CANAL_MODELO).sort(ordenaModelo),
      ],
      conversas: canais.filter((canal) => canal.tipo === 'privado' || canal.tipo === 'grupo'),
    };
  }, [canais, modelos, user]);

  const item = (canal) => {
    const nome = nomeDoCanal(canal, { usuario: user, pessoas, modelos });
    const naoLidas = naoLidasPorCanal.get(canal.id) || 0;
    const ativo = canalAtivo?.id === canal.id;
    const ultima = [...(mensagensPorCanal.get(canal.id) || [])].filter((m) => !m.apagada).slice(-1)[0];
    const quando = quandoFoi(ultima?.created_date || canal.ultima_mensagem_em);

    return (
      <button
        key={canal.id}
        type="button"
        className={`chat-canal${ativo ? ' is-ativo' : ''}${naoLidas ? ' tem-novidade' : ''}`}
        style={linhaBase}
        onClick={() => abrirCanal(canal.id)}
        onContextMenu={(event) => abrirMenu(event, canal)}
        title={admin ? 'Botão direito para trocar a imagem do canal' : undefined}
      >
        <Avatar canal={canal} modelos={modelos} pessoas={pessoas} usuario={user} />
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12,
                fontWeight: naoLidas ? 700 : 500,
                color: 'var(--c3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nome}
            </span>
            <span style={{ fontSize: 9, color: 'var(--c2)', flexShrink: 0 }}>{quando}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 10,
                color: naoLidas ? 'var(--c3)' : 'var(--c2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {resumoDoCanal(canal, mensagensPorCanal.get(canal.id), pessoas)}
            </span>
            {naoLidas > 0 && (
              <span
                style={{
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--c8)',
                  background: 'var(--c1)',
                }}
              >
                {naoLidas > 99 ? '99+' : naoLidas}
              </span>
            )}
          </span>
          <span style={{ fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c12)' }}>
            {tipoDoCanal(canal)}
          </span>
        </span>
      </button>
    );
  };

  const secao = {
    fontSize: 9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--c2)',
    padding: '12px 10px 4px',
  };

  if (carregando) {
    return (
      <div style={{ padding: 16, fontSize: 11, color: 'var(--c2)' }}>carregando conversas…</div>
    );
  }

  return (
    <div className="glass-scroll" style={{ flex: 1, overflowY: 'auto', padding: '2px 6px 10px' }}>
      {fixos.length > 0 && <div style={secao}>canais</div>}
      {fixos.map(item)}

      <div style={{ ...secao, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          conversas
          {totalNaoLidas > 0 && (
            <button
              type="button"
              onClick={() => marcarTudoLido?.()}
              aria-label="Marcar tudo como lido"
              title={`Marcar tudo como lido (${totalNaoLidas})`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                border: 'none',
                borderRadius: 5,
                background: 'transparent',
                color: 'var(--c1)',
                cursor: 'pointer',
                padding: '1px 3px',
                fontFamily: 'var(--font-main)',
                fontSize: 9,
                letterSpacing: '0.04em',
              }}
            >
              <CheckAllIcon size={11} />
            </button>
          )}
        </span>
        {onNovo && (
          <button
            type="button"
            className="chat-novo"
            onClick={onNovo}
            aria-label="Nova conversa"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: 'none',
              background: 'transparent',
              color: 'var(--c1)',
              fontSize: 9,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              fontFamily: 'var(--font-main)',
            }}
          >
            + nova
          </button>
        )}
      </div>
      {conversas.length === 0 && (
        <div style={{ padding: '4px 10px 8px', fontSize: 10, color: 'var(--c12)', lineHeight: 1.5 }}>
          Nenhuma conversa ainda. Use “+ nova” para chamar alguém ou criar um grupo.
        </div>
      )}
      {conversas.map(item)}

      {menu && (
        <CanalMenu
          canal={menu.canal}
          nome={nomeDoCanal(menu.canal, { usuario: user, pessoas, modelos })}
          posicao={{ x: menu.x, y: menu.y }}
          salvando={salvandoImagem}
          erro={erroImagem}
          onAlterar={trocarImagem}
          onRemover={removerImagem}
          onFechar={fecharMenu}
        />
      )}
    </div>
  );
}
