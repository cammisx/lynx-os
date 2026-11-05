import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import { GearIcon } from '@/components/icons';
import { useAuth } from '@/lib/AuthContext';
import { iniciaisDe, nomeDe, salvarPerfil, usePerfil } from '@/lib/perfilUsuario';
import { TEMAS } from '@/lib/temas';
import { TAMANHOS } from '@/lib/fonte';

const ABAS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'preferencias', label: 'Preferências' },
];

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  color: 'var(--c3)',
  fontSize: 12,
  padding: '8px 10px',
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

const labelStyle = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

const dicaStyle = { fontSize: 10.5, color: 'var(--c2)', opacity: 0.75, lineHeight: 1.5 };

const botaoStyle = (principal = true, desativado = false) => ({
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  border: principal
    ? '1px solid color-mix(in srgb, var(--c1) 55%, transparent)'
    : '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
  background: principal ? 'color-mix(in srgb, var(--c1) 20%, transparent)' : 'transparent',
  color: principal ? 'var(--c1)' : 'var(--c2)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  fontWeight: 700,
  cursor: desativado ? 'default' : 'pointer',
  opacity: desativado ? 0.55 : 1,
});

const SUBLIMITE = 60;

export default function ConfiguracoesWindow({ onClose }) {
  const { user } = useAuth();
  const perfil = usePerfil(user);
  const [aba, setAba] = useState('perfil');
  const [nome, setNome] = useState(perfil.nomeExibicao);
  const [subnick, setSubnick] = useState(perfil.subnick);
  const [foto, setFoto] = useState(perfil.fotoUrl);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [aviso, setAviso] = useState(null);
  const arquivoRef = useRef(null);

  // Perfil que chega do banco depois do primeiro render.
  useEffect(() => {
    setNome(perfil.nomeExibicao);
    setSubnick(perfil.subnick);
    setFoto(perfil.fotoUrl);
  }, [perfil.nomeExibicao, perfil.subnick, perfil.fotoUrl]);

  const nomeNaTela = nome.trim() || nomeDe(perfil, user);

  const escolherFoto = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type?.startsWith('image/')) {
      setAviso({ erro: true, texto: 'Escolhe um arquivo de imagem.' });
      return;
    }
    setEnviandoFoto(true);
    setAviso(null);
    try {
      const resposta = await base44.integrations.Core.UploadFile({ file: arquivo });
      const url = resposta?.file_url;
      if (!url) throw new Error('upload sem url');
      setFoto(url);
    } catch (erro) {
      setAviso({ erro: true, texto: 'Não consegui subir a foto.' });
    } finally {
      setEnviandoFoto(false);
      if (arquivoRef.current) arquivoRef.current.value = '';
    }
  };

  const salvar = async () => {
    if (salvando) return;
    setSalvando(true);
    setAviso(null);
    const { remoto } = await salvarPerfil(user, {
      nomeExibicao: nome.trim(),
      subnick: subnick.trim(),
      fotoUrl: foto || '',
    });
    setSalvando(false);
    setAviso(
      remoto
        ? { erro: false, texto: 'Perfil salvo.' }
        : {
            erro: false,
            texto: 'Salvo neste navegador. Falta publicar os campos do perfil no Builder pra valer em qualquer lugar.',
          }
    );
  };

  const trocarTema = async (id) => {
    const { remoto } = await salvarPerfil(user, { tema: id });
    setAviso(
      remoto
        ? null
        : { erro: false, texto: 'Tema aplicado neste navegador. Falta publicar o campo tema no Builder.' }
    );
  };

  const trocarFonte = async (id) => {
    const { remoto } = await salvarPerfil(user, { fonte: id });
    setAviso(
      remoto
        ? null
        : { erro: false, texto: 'Tamanho aplicado neste navegador. Falta publicar o campo de fonte no Builder.' }
    );
  };

  const avatarGrande = {
    width: 76,
    height: 76,
    borderRadius: '50%',
    flexShrink: 0,
    background: 'color-mix(in srgb, var(--c1) 22%, transparent)',
    border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--c1)',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  };

  return (
    <Window title="Configurações" icon={GearIcon} onClose={onClose} width={560} height={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
        <div
          style={{
            display: 'flex',
            gap: 6,
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
            paddingBottom: 8,
            flexShrink: 0,
          }}
        >
          {ABAS.map((item) => {
            const ativa = aba === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAba(item.id)}
                style={{
                  height: 26,
                  padding: '0 12px',
                  borderRadius: 7,
                  border: ativa
                    ? '1px solid color-mix(in srgb, var(--c1) 55%, transparent)'
                    : '1px solid transparent',
                  background: ativa ? 'color-mix(in srgb, var(--c1) 18%, transparent)' : 'transparent',
                  color: ativa ? 'var(--c1)' : 'var(--c2)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {aviso && (
          <span style={{ fontSize: 11, color: aviso.erro ? '#ff6b6b' : '#7bd88f', flexShrink: 0 }}>
            {aviso.texto}
          </span>
        )}

        {aba === 'perfil' && (
          <div
            className="glass-scroll"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={avatarGrande}>
                {foto ? (
                  <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  iniciaisDe(nomeNaTela)
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <button
                  type="button"
                  style={botaoStyle(true, enviandoFoto)}
                  disabled={enviandoFoto}
                  onClick={() => arquivoRef.current?.click()}
                >
                  {enviandoFoto ? 'Subindo...' : 'Trocar foto'}
                </button>
                {foto && (
                  <button
                    type="button"
                    style={botaoStyle(false)}
                    onClick={() => {
                      setFoto('');
                      setAviso(null);
                    }}
                  >
                    Remover foto
                  </button>
                )}
                <span style={dicaStyle}>Sem foto, o sistema usa as suas iniciais.</span>
              </div>
              <input
                ref={arquivoRef}
                type="file"
                accept="image/*"
                onChange={escolherFoto}
                style={{ display: 'none' }}
              />
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={labelStyle}>Nome</span>
              <input
                style={inputStyle}
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                placeholder={user?.full_name || 'Seu nome'}
                maxLength={40}
              />
              <span style={dicaStyle}>É o nome que aparece no menu iniciar e no chat.</span>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={labelStyle}>Subnick</span>
              <input
                style={inputStyle}
                value={subnick}
                onChange={(evento) => setSubnick(evento.target.value)}
                placeholder="vendo séries e fingindo que trabalho"
                maxLength={SUBLIMITE}
              />
              <span style={{ ...dicaStyle, color: subnick.length > SUBLIMITE - 10 ? '#e8b93b' : 'var(--c2)' }}>
                {subnick.length}/{SUBLIMITE} · aparece embaixo do seu nome, estilo MSN.
              </span>
            </label>

            <div
              style={{
                border: '1px solid color-mix(in srgb, var(--c1) 18%, transparent)',
                borderRadius: 10,
                padding: '10px 12px',
                background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
              }}
            >
              <span style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Como aparece</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: 'color-mix(in srgb, var(--c1) 25%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--c1)',
                    overflow: 'hidden',
                  }}
                >
                  {foto ? (
                    <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    iniciaisDe(nomeNaTela)
                  )}
                </div>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--c3)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {nomeNaTela}
                  </span>
                  {subnick.trim() && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontStyle: 'italic',
                        color: 'var(--c1)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      — {subnick.trim()}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto', paddingTop: 4 }}>
              <button type="button" style={botaoStyle(true, salvando)} disabled={salvando} onClick={salvar}>
                {salvando ? 'Salvando...' : 'Salvar perfil'}
              </button>
              <span style={dicaStyle}>A foto e o subnick entram na hora que você salvar.</span>
            </div>
          </div>
        )}

        {aba === 'preferencias' && (
          <div
            className="glass-scroll"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <span style={{ ...labelStyle, marginTop: 2 }}>Tamanho da fonte</span>
            <span style={dicaStyle}>
              Vale para o sistema inteiro: chat, janelas, painéis e menus. O Normal é como sempre foi.
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {TAMANHOS.map((tamanho, indice) => {
                const ativo = perfil.fonte === tamanho.id;
                return (
                  <button
                    key={tamanho.id}
                    type="button"
                    onClick={() => trocarFonte(tamanho.id)}
                    title={tamanho.dica}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      padding: '9px 6px',
                      borderRadius: 10,
                      border: ativo
                        ? '1px solid color-mix(in srgb, var(--c1) 70%, transparent)'
                        : '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                      background: ativo
                        ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                        : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-main)',
                      transition: 'border-color 150ms ease, background-color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11 + indice * 2,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: ativo ? 'var(--c1)' : 'var(--c3)',
                      }}
                    >
                      Aa
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        color: ativo ? 'var(--c1)' : 'var(--c2)',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {tamanho.nome}
                    </span>
                  </button>
                );
              })}
            </div>

            <span style={{ ...labelStyle, marginTop: 6 }}>Tema do sistema</span>
            <span style={dicaStyle}>
              Cada perfil veste o sistema inteiro: ícones, vidro, desktop e barras. Escolhe o seu.
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {TEMAS.map((tema) => {
                const ativo = perfil.tema === tema.id;
                return (
                  <button
                    key={tema.id}
                    type="button"
                    onClick={() => trocarTema(tema.id)}
                    title={tema.descricao}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                      alignItems: 'flex-start',
                      padding: '9px 10px',
                      borderRadius: 10,
                      border: ativo
                        ? '1px solid color-mix(in srgb, var(--c1) 70%, transparent)'
                        : '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                      background: ativo
                        ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                        : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-main)',
                      textAlign: 'left',
                      transition: 'border-color 150ms ease, background-color 150ms ease',
                    }}
                  >
                    <span style={{ display: 'flex', gap: 3 }}>
                      {[...tema.cores, tema.fundo].map((cor, indice) => (
                        <span
                          key={`${tema.id}-${indice}`}
                          style={{
                            width: indice === 4 ? 9 : 13,
                            height: 13,
                            borderRadius: indice === 4 ? '50%' : 4,
                            background: cor,
                            border: '1px solid rgba(255,255,255,0.18)',
                          }}
                        />
                      ))}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: ativo ? 'var(--c1)' : 'var(--c3)',
                          lineHeight: 1.25,
                        }}
                      >
                        {tema.nome}
                      </span>
                      <span style={{ fontSize: 9.5, color: 'var(--c2)', lineHeight: 1.3, opacity: 0.85 }}>
                        {tema.descricao}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Window>
  );
}
