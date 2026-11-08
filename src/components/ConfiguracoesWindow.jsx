import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import { useIsMobile } from '@/hooks/use-mobile';
import { GearIcon, MonitorIcon, MoonIcon, SunIcon } from '@/components/icons';
import { useAuth } from '@/lib/AuthContext';
import { iniciaisDe, nomeDe, salvarPerfil, usePerfil } from '@/lib/perfilUsuario';
import { MODO_CLARO, MODO_ESCURO, MODO_SISTEMA, TEMAS, paletaDoTema, resolverModo } from '@/lib/temas';
import { TAMANHOS } from '@/lib/fonte';
import { FONTES_APP } from '@/lib/fontesApp';
import { MODOS_FUNDO } from '@/lib/perfilLogica';
import { CORES_PET, PETS_DISPONIVEIS, spriteDe, temPet } from '@/lib/pets';
import PetSprite from '@/components/desktop/PetSprite';
import { prepararFundo } from '@/lib/fundo';
import { useMarcarSujo } from '@/components/desktop/JanelaContext';
import { AVISO_ABA_CONFIG, consumirAbaConfig } from '@/lib/configAba';
import BlocoSom, { Interruptor } from '@/components/config/BlocoSom';
import { SONS, SOM_PADRAO, formatarDuracaoSom, idSomCustom } from '@/lib/sons';
import usePreferenciaSom from '@/hooks/usePreferenciaSom';
import useSonsCustom from '@/hooks/useSonsCustom';
import CortarSomModal from '@/components/config/CortarSomModal';

const ABAS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'preferencias', label: 'Preferências' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'chat', label: 'Chat' },
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

const botaoPerigo = {
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--erro) 45%, transparent)',
  background: 'color-mix(in srgb, var(--erro) 14%, transparent)',
  color: 'var(--erro)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  fontWeight: 700,
  cursor: 'pointer',
};

const SUBLIMITE = 60;

export default function ConfiguracoesWindow({ onClose }) {
  const pequeno = useIsMobile();
  const { user, logout } = useAuth();
  const perfil = usePerfil(user);
  const [aba, setAba] = useState(() => consumirAbaConfig() || 'perfil');
  const [confirmarSair, setConfirmarSair] = useState(false);
  const somPref = usePreferenciaSom();
  const galeria = useSonsCustom();
  const [arquivoSom, setArquivoSom] = useState(null);
  const [confirmandoSom, setConfirmandoSom] = useState('');
  const arquivoSomRef = useRef(null);
  const [nome, setNome] = useState(perfil.nomeExibicao);
  const [subnick, setSubnick] = useState(perfil.subnick);
  const [foto, setFoto] = useState(perfil.fotoUrl);
  /* Clique direito na área de trabalho pode pedir uma aba específica. */
  useEffect(() => {
    const ouvir = (evento) => {
      if (evento.detail) setAba(evento.detail);
    };
    window.addEventListener(AVISO_ABA_CONFIG, ouvir);
    return () => window.removeEventListener(AVISO_ABA_CONFIG, ouvir);
  }, []);

  /* Texto digitado que ainda não foi para o banco se perde ao fechar. */
  useMarcarSujo(
    nome !== (perfil.nomeExibicao || '') ||
      subnick !== (perfil.subnick || '') ||
      foto !== (perfil.fotoUrl || '')
  );
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviandoFundo, setEnviandoFundo] = useState(false);
  const arquivoFundoRef = useRef(null);
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

  const subirFundo = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type?.startsWith('image/')) {
      setAviso({ erro: true, texto: 'Escolhe um arquivo de imagem.' });
      return;
    }
    setEnviandoFundo(true);
    setAviso(null);
    try {
      /* Reduz antes de subir: papel de parede não precisa de 4000px. */
      const leve = await prepararFundo(arquivo);
      const resposta = await base44.integrations.Core.UploadFile({ file: leve });
      const url = resposta?.file_url;
      if (!url) throw new Error('upload sem url');
      const { remoto } = await salvarPerfil(user, { fundoUrl: url });
      setAviso(
        remoto
          ? null
          : { erro: false, texto: 'Fundo aplicado neste navegador. Falta publicar o campo fundo_url no Builder.' }
      );
    } catch (erro) {
      setAviso({ erro: true, texto: 'Não consegui subir a imagem de fundo.' });
    } finally {
      setEnviandoFundo(false);
      if (arquivoFundoRef.current) arquivoFundoRef.current.value = '';
    }
  };

  const removerFundo = async () => {
    const { remoto } = await salvarPerfil(user, { fundoUrl: '' });
    setAviso(
      remoto
        ? null
        : { erro: false, texto: 'Fundo removido neste navegador. Falta publicar o campo fundo_url no Builder.' }
    );
  };

  const escolherCorDoPet = async (petCor) => {
    if ((perfil.petCor || 'original') === petCor) return;
    const { remoto } = await salvarPerfil(user, { petCor });
    setAviso(
      remoto
        ? null
        : { erro: false, texto: 'Cor escolhida neste navegador. Falta publicar o campo pet_cor no Builder.' }
    );
  };

  const escolherPet = async (pet) => {
    if ((perfil.pet || 'nenhum') === pet) return;
    const { remoto } = await salvarPerfil(user, { pet });
    setAviso(
      remoto
        ? null
        : { erro: false, texto: 'Pet escolhido neste navegador. Falta publicar o campo pet no Builder.' }
    );
  };

  const escolherFundo = async (fundoModo) => {
    if ((perfil.fundoModo || 'animado') === fundoModo) return;
    const { remoto } = await salvarPerfil(user, {
      fundoModo,
      fundoEstatico: fundoModo === 'parado',
    });
    setAviso(
      remoto
        ? null
        : { erro: false, texto: 'Preferência aplicada neste navegador. Falta publicar o campo no Builder.' }
    );
  };

  const trocarModo = async (modo) => {
    const { remoto } = await salvarPerfil(user, { modo });
    setAviso(
      remoto
        ? null
        : { erro: false, texto: 'Modo aplicado neste navegador. Falta publicar o campo modo no Builder.' }
    );
  };

  const trocarFonteApp = async (id) => {
    const { remoto } = await salvarPerfil(user, { fonteApp: id });
    setAviso(
      remoto
        ? null
        : { erro: false, texto: 'Fonte aplicada neste navegador. Falta publicar o campo fonte_app no Builder.' }
    );
  };

  /* Os quatro sons do código mais os áudios da galeria. O id do áudio enviado
     é montado aqui para não depender da ordem dos efeitos do hook. */
  const listaDeSons = useMemo(
    () => [
      ...SONS,
      ...galeria.todos
        .filter((item) => item?.id && item?.url)
        .map((item) => ({
          id: idSomCustom(item.id),
          nome: item.nome || 'Meu som',
          personalizado: true,
          compartilhado: item.compartilhado === true,
        })),
    ],
    [galeria.todos]
  );

  /* Enviar o próprio áudio fica colado em cada bloco de som: no sino e no
     chat. O input mora fora das abas para o botão funcionar em qualquer uma. */
  const botaoEnviarAudio = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => arquivoSomRef.current?.click()}
        style={{
          height: 28,
          padding: '0 11px',
          flexShrink: 0,
          borderRadius: 8,
          border: '1px solid color-mix(in srgb, var(--c1) 48%, transparent)',
          background: 'color-mix(in srgb, var(--c1) 16%, transparent)',
          color: 'var(--c1)',
          fontFamily: 'var(--font-main)',
          fontSize: 10.5,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Enviar áudio
      </button>
      <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.35 }}>
        mp3, m4a ou wav. Até 4s; mais longo, corta na hora.
      </span>
    </div>
  );

  const escolherArquivoSom = (evento) => {
    const arquivo = evento.target.files?.[0];
    if (arquivoSomRef.current) arquivoSomRef.current.value = '';
    if (!arquivo) return;
    if (!arquivo.type?.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|oga|aac|flac|opus)$/i.test(arquivo.name || '')) {
      setAviso({ erro: true, texto: 'Escolhe um arquivo de áudio.' });
      return;
    }
    setArquivoSom(arquivo);
  };

  const removerSom = async (registro) => {
    if (confirmandoSom !== registro.id) {
      setConfirmandoSom(registro.id);
      setTimeout(() => setConfirmandoSom((atual) => (atual === registro.id ? '' : atual)), 4000);
      return;
    }
    setConfirmandoSom('');
    const alvo = idSomCustom(registro.id);
    await galeria.excluir(registro);
    /* Se era o som escolhido, volta para o do código em vez de ficar mudo. */
    if (somPref.pref.som === alvo) somPref.escolherSom(SOM_PADRAO);
    if (somPref.pref.som_chat === alvo) somPref.escolherSomChat('mensagem');
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
            overflowX: pequeno ? 'auto' : undefined,
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
                  height: pequeno ? 34 : 26,
                  padding: pequeno ? '0 14px' : '0 12px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
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
          <span style={{ fontSize: 11, color: aviso.erro ? 'var(--erro)' : 'var(--ok)', flexShrink: 0 }}>
            {aviso.texto}
          </span>
        )}

        <input
          ref={arquivoSomRef}
          type="file"
          accept="audio/*"
          onChange={escolherArquivoSom}
          style={{ display: 'none' }}
        />

        {aba === 'notificacoes' && (
          <div
            className="glass-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingRight: 2,
            }}
          >
            <BlocoSom
              titulo="Som das notificações"
              dica={
                pequeno
                  ? 'Avisos do sistema no celular: turno, ponto, vaga livre, menção.'
                  : 'Avisos do sistema no computador: turno, ponto, vaga livre, menção.'
              }
              ligado={somPref.pref.ativo}
              rotuloInterruptor="Ligar ou desligar o som das notificações"
              onAlternar={somPref.alternarSom}
              sons={listaDeSons}
              escolhido={somPref.pref.som}
              onEscolher={somPref.escolherSom}
              volume={somPref.pref.volume}
              onVolume={somPref.mudarVolume}
              rodape={`Vale só para o ${pequeno ? 'celular' : 'computador'}. O outro aparelho tem o som dele.`}
              extra={botaoEnviarAudio}
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 12,
                borderRadius: 12,
                border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 40%, transparent)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={labelStyle}>Meus áudios</span>
                  <span style={dicaStyle}>
                    Até 4 segundos. Aparecem nos dois aparelhos; a escolha de qual tocar é de cada um.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => arquivoSomRef.current?.click()}
                  style={{
                    height: 30,
                    padding: '0 12px',
                    flexShrink: 0,
                    borderRadius: 8,
                    border: '1px solid color-mix(in srgb, var(--c1) 48%, transparent)',
                    background: 'color-mix(in srgb, var(--c1) 16%, transparent)',
                    color: 'var(--c1)',
                    fontFamily: 'var(--font-main)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Enviar áudio
                </button>
              </div>

              {galeria.meus.length === 0 ? (
                <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.45 }}>
                  Nenhum áudio enviado ainda. mp3, m4a ou wav de até 4 segundos, ou mais longo com o
                  corte na hora.
                </span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {galeria.meus.map((registro) => {
                    const confirmando = confirmandoSom === registro.id;
                    return (
                      <div
                        key={registro.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '7px 9px',
                          borderRadius: 9,
                          border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
                          background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => somPref.escolherSom(idSomCustom(registro.id))}
                          title="Ouvir"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            textAlign: 'left',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--c3)',
                            fontFamily: 'var(--font-main)',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {registro.nome || 'Meu som'}
                            {somPref.pref.som === idSomCustom(registro.id) ||
                            somPref.pref.som_chat === idSomCustom(registro.id)
                              ? ' ·'
                              : ''}
                          </span>
                          <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.75 }}>
                            {formatarDuracaoSom(registro.duracao)}
                            {registro.compartilhado ? ' · compartilhado' : ''}
                          </span>
                        </button>

                        <Interruptor
                          ligado={registro.compartilhado === true}
                          onMudar={() => galeria.alternarCompartilhado(registro)}
                          rotulo={`Compartilhar ${registro.nome || 'áudio'}`}
                        />

                        <button
                          type="button"
                          onClick={() => removerSom(registro)}
                          style={{
                            height: 24,
                            padding: '0 8px',
                            flexShrink: 0,
                            borderRadius: 7,
                            border: `1px solid color-mix(in srgb, var(--erro) ${confirmando ? 70 : 32}%, transparent)`,
                            background: confirmando
                              ? 'color-mix(in srgb, var(--erro) 22%, transparent)'
                              : 'transparent',
                            color: 'var(--erro)',
                            fontFamily: 'var(--font-main)',
                            fontSize: 9.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {confirmando ? 'Confirmar?' : 'Remover'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {galeria.compartilhados.filter((item) => item.usuario_id !== user?.id).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ ...dicaStyle, opacity: 0.85 }}>Da galeria compartilhada</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {galeria.compartilhados
                      .filter((item) => item.usuario_id !== user?.id)
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => somPref.escolherSom(idSomCustom(item.id))}
                          title={`${item.nome || 'Som'}${item.autor ? ` · ${item.autor}` : ''}`}
                          style={{
                            maxWidth: 150,
                            padding: '5px 9px',
                            borderRadius: 999,
                            border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                            background: 'color-mix(in srgb, var(--c2) 10%, transparent)',
                            color: 'var(--c2)',
                            fontFamily: 'var(--font-main)',
                            fontSize: 9.5,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.nome || 'Som'} · {item.autor || 'alguém'}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {aba === 'chat' && (
          <div
            className="glass-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingRight: 2,
            }}
          >
            <BlocoSom
              titulo="Som das mensagens"
              dica="Quando chega mensagem nova no chat."
              ligado={somPref.pref.chat_ativo}
              rotuloInterruptor="Ligar ou desligar o som das mensagens"
              onAlternar={somPref.alternarSomChat}
              sons={listaDeSons}
              escolhido={somPref.pref.som_chat}
              onEscolher={somPref.escolherSomChat}
              volume={somPref.pref.volume_chat}
              onVolume={somPref.mudarVolumeChat}
              rodape="Independente do som das notificações, e independente do outro aparelho."
              extra={botaoEnviarAudio}
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 12,
                borderRadius: 12,
                border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 40%, transparent)',
              }}
            >
              <span style={labelStyle}>Avisos por e-mail</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--c3)' }}>Quando me mencionarem</span>
                  <span style={dicaStyle}>Chega no e-mail da sua conta.</span>
                </div>
                <Interruptor
                  ligado={somPref.pref.notificar_email}
                  onMudar={somPref.alternarEmailMencoes}
                  rotulo="Avisar por e-mail quando me mencionarem"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--c3)' }}>Todas as mensagens</span>
                  <span style={dicaStyle}>Dos canais que eu participo. Enche a caixa, use com critério.</span>
                </div>
                <Interruptor
                  ligado={somPref.pref.email_todas}
                  onMudar={somPref.alternarEmailTodas}
                  rotulo="Avisar por e-mail em todas as mensagens"
                />
              </div>
              <span style={{ ...dicaStyle, opacity: 0.6 }}>
                E-mail vale para a conta inteira: vale no computador e no celular.
              </span>
            </div>

            <span style={{ ...dicaStyle, opacity: 0.6 }}>
              Os áudios que você envia aparecem na galeria da aba Notificações.
            </span>
          </div>
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
              <span style={{ ...dicaStyle, color: subnick.length > SUBLIMITE - 10 ? 'var(--aviso)' : 'var(--c2)' }}>
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

            <div
              style={{
                borderTop: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
                paddingTop: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <span style={labelStyle}>Sessão</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" style={botaoPerigo} onClick={() => setConfirmarSair(true)}>
                  Sair da conta
                </button>
                <span style={dicaStyle}>Encerra a sessão neste aparelho e volta para a tela de entrada.</span>
              </div>
            </div>
          </div>
        )}

        {aba === 'preferencias' && (
          <div
            className="glass-scroll"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <span
              style={{
                fontSize: 9.5,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--c2)',
                opacity: 0.85,
              }}
            >
              {pequeno ? 'Ajustes do celular' : 'Ajustes do computador'}
            </span>
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

            <span style={{ ...labelStyle, marginTop: 6 }}>Fonte do sistema</span>
            <span style={dicaStyle}>
              Três famílias para o app inteiro: texto das janelas, chat e títulos. Vale só para você.
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {FONTES_APP.map((fonte) => {
                const ativo = perfil.fonteApp === fonte.id;
                return (
                  <button
                    key={fonte.id}
                    type="button"
                    onClick={() => trocarFonteApp(fonte.id)}
                    title={fonte.dica}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      padding: '10px 6px',
                      borderRadius: 10,
                      border: ativo
                        ? '1px solid color-mix(in srgb, var(--c1) 70%, transparent)'
                        : '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                      background: ativo
                        ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                        : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                      cursor: 'pointer',
                      transition: 'border-color 150ms ease, background-color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fonte.familia,
                        fontSize: 16,
                        fontWeight: 700,
                        lineHeight: 1.1,
                        color: ativo ? 'var(--c1)' : 'var(--c3)',
                      }}
                    >
                      Aa
                    </span>
                    <span
                      style={{
                        fontFamily: fonte.familia,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        color: ativo ? 'var(--c1)' : 'var(--c2)',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {fonte.nome}
                    </span>
                  </button>
                );
              })}
            </div>

            <span style={{ ...labelStyle, marginTop: 6 }}>Modo de cor</span>
            <span style={dicaStyle}>
              Diurno e noturno usam a mesma paleta do tema, uma clara e uma escura. No automático, o
              sistema decide junto com o Windows.
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {[
                { id: MODO_CLARO, nome: 'Diurno', Icone: SunIcon, dica: 'Fundo claro' },
                { id: MODO_ESCURO, nome: 'Noturno', Icone: MoonIcon, dica: 'Breu do Lynx' },
                { id: MODO_SISTEMA, nome: 'Automático', Icone: MonitorIcon, dica: 'Segue o sistema' },
              ].map(({ id, nome, Icone, dica }) => {
                const ativo = perfil.modo === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => trocarModo(id)}
                    title={dica}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 10px',
                      borderRadius: 10,
                      border: ativo
                        ? '1px solid color-mix(in srgb, var(--c1) 70%, transparent)'
                        : '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                      background: ativo
                        ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                        : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                      color: ativo ? 'var(--c1)' : 'var(--c3)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-main)',
                      textAlign: 'left',
                    }}
                  >
                    <Icone size={15} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>{nome}</span>
                      <span style={{ fontSize: 9.5, color: 'var(--c2)', lineHeight: 1.2 }}>{dica}</span>
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
                const paleta = paletaDoTema(tema.id, resolverModo(perfil.modo));
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
                      {[...paleta.cores, paleta.fundo].map((cor, indice) => (
                        <span
                          key={`${tema.id}-${indice}`}
                          style={{
                            width: indice === 4 ? 9 : 13,
                            height: 13,
                            borderRadius: indice === 4 ? '50%' : 4,
                            background: cor,
                            border: '1px solid color-mix(in srgb, var(--ink-hex) 22%, transparent)',
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

            <span style={{ ...labelStyle, marginTop: 6 }}>Fundo do desktop</span>
            <span style={dicaStyle}>
              Sua imagem entra no lugar do fundo liso. Ela é reduzida antes de subir, então não pesa
              no carregamento.
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div
                style={{
                  width: 92,
                  height: 52,
                  borderRadius: 8,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
                  background: 'color-mix(in srgb, var(--c8) 70%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c2)',
                  fontSize: 9,
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {perfil.fundoUrl ? (
                  <img
                    src={perfil.fundoUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span>Sem imagem</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <button
                  type="button"
                  onClick={() => arquivoFundoRef.current?.click()}
                  disabled={enviandoFundo}
                  style={botaoStyle(true, enviandoFundo)}
                >
                  {enviandoFundo ? 'Subindo...' : perfil.fundoUrl ? 'Trocar imagem' : 'Escolher imagem'}
                </button>
                {perfil.fundoUrl ? (
                  <button
                    type="button"
                    onClick={removerFundo}
                    style={{ ...botaoStyle(false), height: 26, padding: '0 10px' }}
                  >
                    Remover
                  </button>
                ) : null}
              </div>
              <input
                ref={arquivoFundoRef}
                type="file"
                accept="image/*"
                onChange={subirFundo}
                style={{ display: 'none' }}
              />
            </div>

            <span style={{ ...labelStyle, marginTop: 6 }}>Linhas do fundo</span>
            <span style={dicaStyle}>
              A seda em movimento é bonita, mas gasta CPU. Parada, o fundo fica congelado no mesmo
              desenho. Sem linhas, sobra só a cor do tema: a opção mais leve.
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {MODOS_FUNDO.map(({ id, nome, dica }) => {
                const ativo = (perfil.fundoModo || 'animado') === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => escolherFundo(id)}
                    title={dica}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      alignItems: 'flex-start',
                      padding: '9px 10px',
                      borderRadius: 10,
                      border: ativo
                        ? '1px solid color-mix(in srgb, var(--c1) 70%, transparent)'
                        : '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                      background: ativo
                        ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                        : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                      color: ativo ? 'var(--c1)' : 'var(--c3)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-main)',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>{nome}</span>
                    <span style={{ fontSize: 9.5, color: 'var(--c2)', lineHeight: 1.2 }}>{dica}</span>
                  </button>
                );
              })}
            </div>

            {/* Cada aparelho escolhe o seu bicho: o pet_celular não mexe no pet do desktop. */}
            {(
              <>
            <span style={{ ...labelStyle, marginTop: 6 }}>
              {pequeno ? 'Pet do celular' : 'Pet do desktop'}
            </span>
            <span style={dicaStyle}>
              {pequeno
                ? 'O bicho passeia pela tela do Mais. Um toque faz carinho e o toque duplo abre as opções dele. Quem não quiser, deixa em "Sem pet".'
                : 'Um bicho de estimação em pixel art passeia pela base da tela. Clique nele para fazer carinho. Quem não quiser, deixa em "Sem pet".'}
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {PETS_DISPONIVEIS.map(({ id, nome, dica }) => {
                const ativo = (perfil.pet || 'nenhum') === id;
                const sprite = spriteDe(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => escolherPet(id)}
                    title={dica}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '8px 6px',
                      borderRadius: 10,
                      border: ativo
                        ? '1px solid color-mix(in srgb, var(--c1) 70%, transparent)'
                        : '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                      background: ativo
                        ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                        : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                      color: ativo ? 'var(--c1)' : 'var(--c3)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-main)',
                    }}
                  >
                    <span style={{ height: 32, display: 'flex', alignItems: 'flex-end' }}>
                      {sprite ? (
                        <PetSprite sprite={sprite} acao="parado" quadro={0} escala={2} />
                      ) : (
                        <span style={{ fontSize: 15, opacity: 0.45, lineHeight: '32px' }}>–</span>
                      )}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.2 }}>{nome}</span>
                  </button>
                );
              })}
            </div>

            {temPet(perfil.pet) && (
              <>
                <span style={{ ...labelStyle, marginTop: 6 }}>Cor do pet</span>
                <span style={dicaStyle}>
                  Vale para o bicho escolhido acima. As cores são as mesmas para os três.
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                    gap: 6,
                  }}
                >
                  {CORES_PET.map(({ id, nome }) => {
                    const ativo = (perfil.petCor || 'original') === id;
                    const sprite = spriteDe(perfil.pet, id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => escolherCorDoPet(id)}
                        title={nome}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 3,
                          padding: '6px 4px',
                          borderRadius: 9,
                          border: ativo
                            ? '1px solid color-mix(in srgb, var(--c1) 70%, transparent)'
                            : '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                          background: ativo
                            ? 'color-mix(in srgb, var(--c1) 14%, transparent)'
                            : 'color-mix(in srgb, var(--c8) 45%, transparent)',
                          color: ativo ? 'var(--c1)' : 'var(--c3)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-main)',
                        }}
                      >
                        <PetSprite sprite={sprite} acao="parado" quadro={0} escala={2} />
                        <span style={{ fontSize: 9, lineHeight: 1.2 }}>{nome}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
              </>
            )}
          </div>
        )}
      </div>

      {arquivoSom && (
        <CortarSomModal
          arquivo={arquivoSom}
          usuarioId={user?.id}
          autor={perfil.nomeExibicao || user?.full_name || ''}
          onFechar={() => setArquivoSom(null)}
          onSalvo={() => {
            setArquivoSom(null);
            galeria.recarregar();
            setAviso({ erro: false, texto: 'Som adicionado à galeria.' });
          }}
        />
      )}

      {confirmarSair &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: 'rgba(10,10,16,0.45)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              fontFamily: 'var(--font-main)',
            }}
            onMouseDown={(evento) => {
              if (evento.target === evento.currentTarget) setConfirmarSair(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sair-conta-titulo"
              style={{
                width: 'min(380px, calc(100vw - 40px))',
                borderRadius: 14,
                border: '1px solid color-mix(in srgb, var(--c1) 30%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 82%, transparent)',
                backdropFilter: 'blur(22px)',
                WebkitBackdropFilter: 'blur(22px)',
                boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <span
                id="sair-conta-titulo"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                  color: 'var(--c1)',
                }}
              >
                Sair da conta?
              </span>
              <span style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--c3)' }}>
                Você volta para a tela de entrada do Lynx OS e precisa entrar de novo para usar o sistema.
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setConfirmarSair(false)}
                  style={{
                    height: 30,
                    padding: '0 14px',
                    borderRadius: 9,
                    border: '1px solid color-mix(in srgb, var(--c2) 25%, transparent)',
                    background: 'transparent',
                    color: 'var(--c3)',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmarSair(false);
                    logout();
                  }}
                  style={{
                    height: 30,
                    padding: '0 14px',
                    borderRadius: 9,
                    border: '1px solid color-mix(in srgb, var(--erro) 45%, transparent)',
                    background: 'color-mix(in srgb, var(--erro) 18%, transparent)',
                    color: 'var(--erro)',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Sair
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </Window>
  );
}
