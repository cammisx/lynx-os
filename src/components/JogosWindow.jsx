import { useCallback, useRef, useState } from 'react';
import Window from '@/components/Window';
import { GamepadIcon } from '@/components/icons';
import { useAuth } from '@/lib/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { salvarJogosConfig, usePerfil } from '@/lib/perfilUsuario';
import {
  JOGOS_PADRAO,
  apagarRecordes,
  gravarPartida,
  gravarRecorde,
  normalizarJogos,
  partidaDoJogo,
  recordeDaConfig,
} from '@/lib/jogosConfig';
import { IconeEngrenagem, PainelConfig, dourado, escuro, formatarTempo } from '@/components/jogos/EstruturaJogo';
import { Icone2048, IconeCampo, IconeCobrinha, IconePokemon } from '@/components/jogos/icones';
import Jogo2048 from '@/components/jogos/Jogo2048';
import JogoSolicitacaoMidia from '@/components/jogos/JogoSolicitacaoMidia';
import JogoCampoMinado from '@/components/jogos/JogoCampoMinado';
import QuemEhEssePokemon from '@/components/jogos/QuemEhEssePokemon';

/**
 * Janela de Jogos: a pausa do time.
 *
 * Todo mundo ve, inclusive chatter. A janela e uma grade de cards: cada jogo
 * mostra o proprio recorde, e entrar num jogo abre a tela dele com um "‹ Jogos"
 * para voltar.
 *
 * As regras e os recordes vivem no perfil (campo `jogos_config` do User), com um
 * bloco por jogo. Assim o que foi ajustado no computador abre igual no celular,
 * e o recorde acompanha a pessoa em vez de ficar preso num aparelho.
 */
const JOGOS = [
  {
    id: '2048',
    nome: 'SEXTING',
    dica: 'Siga os passos e venda o máximo que puder',
    Icone: Icone2048,
    Componente: Jogo2048,
    rotuloRecorde: 'recorde',
  },
  {
    id: 'snake',
    nome: 'SOLICITAÇÃO DE MÍDIA',
    dica: 'Vai, amor, deixa eu ver a sua cobrinha',
    Icone: IconeCobrinha,
    Componente: JogoSolicitacaoMidia,
    rotuloRecorde: 'recorde',
  },
  {
    id: 'campo',
    nome: 'EJACULAÇÃO PRECOCE',
    dica: 'Tente vender todas as mídias antes que o cara goze',
    Icone: IconeCampo,
    Componente: JogoCampoMinado,
    rotuloRecorde: 'tempo',
  },
  {
    id: 'pokemon',
    nome: 'QUEM É ESSE POKÉMON?',
    dica: 'Esse aqui é só pokemon mesmo',
    Icone: IconePokemon,
    Componente: QuemEhEssePokemon,
    rotuloRecorde: 'recorde',
  },
];

const textoRecorde = (jogo, recorde) => {
  if (recorde == null) return 'sem recorde';
  if (jogo.rotuloRecorde === 'tempo') return formatarTempo(recorde);
  return String(recorde);
};

export default function JogosWindow({ onClose }) {
  const pequeno = useIsMobile();
  const { user } = useAuth();
  const perfil = usePerfil(user);

  const config = perfil.jogosConfig || normalizarJogos();
  /* Guarda a ultima configuracao numa ref: dois cliques rapidos (recorde e
     regra, por exemplo) nao podem partir de uma copia velha e apagar o outro. */
  const configRef = useRef(config);
  configRef.current = config;

  const [aberto, setAberto] = useState(null);
  const [painelGeral, setPainelGeral] = useState(false);

  const aplicar = useCallback(
    (novo) => {
      salvarJogosConfig(user, novo);
    },
    [user]
  );

  const mudarJogo = useCallback(
    (id, parcial) => {
      const atual = configRef.current;
      aplicar({ ...atual, [id]: { ...atual[id], ...parcial } });
    },
    [aplicar]
  );

  const restaurarJogo = useCallback(
    (id) => {
      const atual = configRef.current;
      aplicar({ ...atual, [id]: { ...JOGOS_PADRAO[id] } });
    },
    [aplicar]
  );

  const registrar = useCallback(
    (id, valor) => {
      const atual = configRef.current;
      const novo = gravarRecorde(atual, id, valor);
      if (novo !== atual) aplicar(novo);
    },
    [aplicar]
  );

  /* Partida em andamento (tabuleiro, pontos e quando foi mexida). Nulo apaga
     o que estava salvo, como quando a pessoa comeca de novo. */
  const salvarPartida = useCallback(
    (id, partida) => {
      const atual = configRef.current;
      const novo = gravarPartida(atual, id, atual[id]?.tamanho, partida);
      if (novo !== atual) aplicar(novo);
    },
    [aplicar]
  );

  const limparRecordes = useCallback(() => {
    aplicar(apagarRecordes(configRef.current));
  }, [aplicar]);

  const jogoAberto = JOGOS.find((jogo) => jogo.id === aberto) || null;

  return (
    <Window title="Jogos" icon={GamepadIcon} onClose={onClose} width={880} height={660}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        {jogoAberto ? (
          jogoAberto.id === 'pokemon' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => setAberto(null)} style={botaoVoltar}>
                  ‹ Jogos
                </button>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <QuemEhEssePokemon
                  recordeExterno={recordeDaConfig('pokemon', config)}
                  aoRecorde={(valor) => registrar('pokemon', valor)}
                />
              </div>
            </div>
          ) : (
            <jogoAberto.Componente
              valores={config[jogoAberto.id]}
              geral={config.geral}
              recorde={recordeDaConfig(jogoAberto.id, config)}
              partida={partidaDoJogo(config, jogoAberto.id, config[jogoAberto.id]?.tamanho)}
              vistos={config[jogoAberto.id]?.vistos || []}
              aoPartida={(partida) => salvarPartida(jogoAberto.id, partida)}
              aoRecorde={(valor) => registrar(jogoAberto.id, valor)}
              aoMudar={(parcial) => mudarJogo(jogoAberto.id, parcial)}
              aoVoltar={() => setAberto(null)}
              aoRestaurar={() => restaurarJogo(jogoAberto.id)}
              aoApagarRecordes={limparRecordes}
            />
          )
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 10,
                marginBottom: 12,
                borderBottom: `1px solid ${escuro(10)}`,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-main)',
                  fontSize: 11,
                  color: escuro(55),
                  letterSpacing: '0.02em',
                }}
              >
                Escolha um jogo. Recordes e regras ficam na sua conta.
              </span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setPainelGeral(true)}
                title="Preferencias dos jogos"
                aria-label="Preferencias dos jogos"
                style={{ ...botaoVoltar, width: 28, height: 28, padding: 0 }}
              >
                <IconeEngrenagem />
              </button>
            </div>

            <div
              className="glass-scroll"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${pequeno ? 108 : 132}px, 1fr))`,
                gap: 10,
                overflowY: 'auto',
                alignContent: 'start',
                paddingRight: 2,
              }}
            >
              {JOGOS.map((jogo) => {
                const recorde = recordeDaConfig(jogo.id, config);
                return (
                  <button
                    key={jogo.id}
                    type="button"
                    onClick={() => setAberto(jogo.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 6,
                      padding: '14px 12px',
                      minHeight: pequeno ? 104 : 116,
                      borderRadius: 12,
                      border: `1px solid ${escuro(13)}`,
                      background: 'color-mix(in srgb, var(--c8) 48%, transparent)',
                      color: 'var(--c2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 140ms ease, transform 140ms ease',
                    }}
                    onMouseEnter={(evento) => {
                      evento.currentTarget.style.borderColor = dourado(40);
                      evento.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(evento) => {
                      evento.currentTarget.style.borderColor = escuro(13);
                      evento.currentTarget.style.transform = 'none';
                    }}
                  >
                    <span style={{ color: 'var(--c1)', display: 'flex' }}>
                      <jogo.Icone tamanho={pequeno ? 20 : 22} />
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-main)',
                        fontSize: pequeno ? 11.5 : 12,
                        fontWeight: 800,
                        color: 'var(--c3)',
                        lineHeight: 1.25,
                      }}
                    >
                      {jogo.nome}
                    </span>
                    <span style={{ fontFamily: 'var(--font-main)', fontSize: 9.5, color: escuro(50), lineHeight: 1.3 }}>
                      {jogo.dica}
                    </span>
                    <span
                      style={{
                        marginTop: 'auto',
                        fontFamily: 'var(--font-main)',
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: recorde == null ? escuro(35) : 'var(--c1)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {textoRecorde(jogo, recorde)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {painelGeral ? (
          <PainelConfig
            titulo="Preferencias dos jogos"
            campos={[
              {
                chave: 'direcional',
                rotulo: 'Setas de vidro na tela',
                tipo: 'toggle',
              },
              {
                chave: 'pausarFora',
                rotulo: 'Pausar ao sair da aba',
                tipo: 'toggle',
              },
            ]}
            valores={config.geral}
            aoMudar={(parcial) => aplicar({ ...configRef.current, geral: { ...configRef.current.geral, ...parcial } })}
            aoFechar={() => setPainelGeral(false)}
            aoRestaurar={() => aplicar({ ...configRef.current, geral: { ...JOGOS_PADRAO.geral } })}
            aoApagarRecordes={limparRecordes}
            nota="Vale para todos os jogos e acompanha sua conta nos dois aparelhos."
          />
        ) : null}
      </div>
    </Window>
  );
}

const botaoVoltar = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 28,
  padding: '0 10px',
  borderRadius: 8,
  border: `1px solid ${escuro(14)}`,
  background: 'color-mix(in srgb, var(--c8) 52%, transparent)',
  color: 'var(--c2)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  fontWeight: 700,
  cursor: 'pointer',
};