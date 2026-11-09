import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { CloseIcon } from '@/components/icons';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import {
  CANAL_GERAL,
  CANAL_GRUPO,
  CANAL_MODELO,
  CANAL_PRIVADO,
  asList,
  canalVisivel,
  nomeDoCanal,
  tipoDoCanal,
} from '@/lib/chat';
import { cargoDaPessoa, nomeDaPessoa } from '@/lib/pessoas';
import { paraArquivo } from '@/lib/paint';

/**
 * Escolher para onde vai o desenho.
 *
 * A lista é a mesma que a pessoa enxerga no chat: geral, os canais das modelos
 * dela, as conversas privadas e os grupos. O desenho vai como imagem.
 */

const ORDEM = [
  { tipo: CANAL_GERAL, titulo: 'GERAL' },
  { tipo: CANAL_MODELO, titulo: 'MODELOS' },
  { tipo: CANAL_PRIVADO, titulo: 'CONVERSAS' },
  { tipo: CANAL_GRUPO, titulo: 'GRUPOS' },
];

export default function EnviarDesenhoModal({ blob, nome = 'desenho', onFechar, onEnviado }) {
  const { user } = useAuth();
  const [canais, setCanais] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const [listaCanais, listaModelos, listaUsuarios] = await Promise.all([
          asList(await base44.entities.ChatCanal.list('-ultima_mensagem_em', 200, 0).catch(() => [])),
          asList(await base44.entities.Modelo.list('-created_date', 200, 0).catch(() => [])),
          asList(await base44.entities.User.list().catch(() => [])),
        ]);
        if (!ativo) return;
        setModelos(listaModelos);
        setPessoas(
          listaUsuarios.map((item) => ({
            id: item.id,
            nome: nomeDaPessoa(item),
            email: item.email,
            foto_url: item.foto_url,
          }))
        );
        setCanais(listaCanais);
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape' && !enviando) onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [enviando, onFechar]);

  const visiveis = useMemo(
    () => canais.filter((canal) => canalVisivel(canal, user, modelos)),
    [canais, modelos, user]
  );

  const grupos = useMemo(
    () =>
      ORDEM.map((grupo) => ({
        ...grupo,
        canais: visiveis.filter((canal) => canal.tipo === grupo.tipo),
      })).filter((grupo) => grupo.canais.length),
    [visiveis]
  );

  const enviar = async (canal) => {
    if (enviando) return;
    setErro('');
    setEnviando(canal.id);
    try {
      const arquivo = paraArquivo(blob, `${nome}.png`);
      const resposta = await base44.integrations.Core.UploadFile({ file: arquivo });
      if (!resposta?.file_url) throw new Error('O upload não devolveu a imagem.');

      await base44.entities.ChatMensagem.create({
        canal_id: canal.id,
        autor_id: user?.id,
        autor_nome: nomeDaPessoa(user) || 'Eu',
        autor_cargo: cargoDaPessoa(user),
        tipo: 'imagem',
        texto: '',
        anexo_url: resposta.file_url,
        anexo_nome: arquivo.name,
        anexo_tipo: arquivo.type,
        anexo_tamanho: arquivo.size,
      });

      const destino = nomeDoCanal(canal, { usuario: user, pessoas, modelos });
      if (onEnviado) onEnviado(destino);
      onFechar();
    } catch (falha) {
      console.warn('[Desenho] enviar', falha);
      setErro('Não consegui enviar o desenho agora.');
    } finally {
      setEnviando('');
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9450,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !enviando) onFechar();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Enviar desenho" style={{ ...MODAL_CAIXA, width: 460 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 12.5,
                letterSpacing: '0.04em',
                color: 'var(--c1)',
              }}
            >
              ENVIAR PARA
            </span>
            <span style={{ fontSize: 10, color: 'var(--c2)' }}>
              O desenho vai como imagem, no canal escolhido
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={Boolean(enviando)}
            aria-label="Fechar"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 7,
              border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
              background: 'color-mix(in srgb, var(--c8) 50%, transparent)',
              color: 'var(--c3)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={12} />
          </button>
        </div>

        <div
          className="glass-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '10px 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {erro ? <span style={{ fontSize: 11, color: 'var(--erro)' }}>{erro}</span> : null}
          {carregando ? (
            <span style={{ fontSize: 11, color: 'var(--c2)' }}>Carregando canais…</span>
          ) : null}
          {!carregando && !grupos.length ? (
            <span style={{ fontSize: 11, color: 'var(--c2)' }}>Nenhum canal disponível.</span>
          ) : null}

          {grupos.map((grupo) => (
            <div key={grupo.tipo} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 8.5, letterSpacing: '0.1em', color: 'var(--c2)', opacity: 0.75 }}>
                {grupo.titulo}
              </span>
              {grupo.canais.map((canal) => (
                <button
                  key={canal.id}
                  type="button"
                  disabled={Boolean(enviando)}
                  onClick={() => enviar(canal)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
                    background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
                    color: 'var(--c3)',
                    fontFamily: 'var(--font-main)',
                    fontSize: 11.5,
                    textAlign: 'left',
                    cursor: enviando ? 'default' : 'pointer',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {nomeDoCanal(canal, { usuario: user, pessoas, modelos })}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.8 }}>
                    {enviando === canal.id ? 'enviando…' : tipoDoCanal(canal)}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
