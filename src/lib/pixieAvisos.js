/**
 * O passeio das notificações.
 *
 * Duas metades, nesta ordem (decisão da Chloë): primeiro as configurações de
 * som, que ficam na janela de Configurações já aberta pelo passeio da mesa;
 * depois o sino, o painel e o aviso que a pessoa abre. Termina no aviso porque
 * o próximo passeio do primeiro acesso engata dali.
 *
 * Cada passo é { fala, acao, area, alvo, espera }:
 * - `acao` roda quando o passo começa (trocar a aba, garantir um aviso);
 * - `area` é um bloco das Configurações (a moldura mede o bloco inteiro);
 * - `alvo` é um elemento solto (sino, painel, linha de aviso);
 * - `espera` é o seletor que precisa aparecer para o passo sair sozinho: nesse
 *   passo quem age é a pessoa, então o clique da tela continua livre.
 */
import { abrirConfigNaAba } from '@/lib/configAba';

export const SELETOR_AVISOS = {
  /* As abas que ela mostra depois dos sons, ainda na mesma janela. */
  abaPerfil: '[data-config-painel="perfil"]',
  abaDesempenho: '[data-config-painel="desempenho"]',
  sino: '[data-pixie-alvo="icone-notificacoes"]',
  painel: '[data-pixie-alvo="notificacoes"]',
  primeiraLinha: '[data-pixie-alvo="notificacao"]',
  dialogo: '[role="dialog"]',
};

/* O aviso que o passeio escolheu abrir (o de resposta, ou o de boas-vindas). */
let avisoDoPasseio = null;

export const definirAvisoDoPasseio = (aviso) => {
  avisoDoPasseio = aviso ? { id: aviso.id || null, tipo: aviso.tipo || null } : null;
};

export const avisoDoPasseioAgora = () => avisoDoPasseio;

/* A linha certa do painel: a do aviso escolhido, senão a primeira da lista. */
export const linhaDoAviso = () =>
  avisoDoPasseio?.id ? `[data-notif-id="${avisoDoPasseio.id}"]` : SELETOR_AVISOS.primeiraLinha;

/** O que cada tipo de aviso oferece quando abre. */
export const ACOES_POR_TIPO = {
  novo_shift: 'Turno novo chega assim: com o dia e o horário. Aqui dentro você aceita o turno ou recusa.',
  turno_esquecido: 'Turno esquecido pede explicação: aqui você conta o que aconteceu e envia a justificativa.',
  cutucada: 'Cutucada é alguém chamando a sua atenção: aqui você cutuca de volta ou fecha.',
  folga_pendente: 'Pedido de folga: aqui você aprova o pedido ou confirma a recusa.',
  horario_disponivel: 'Horário vago: aqui você confirma a cobertura e assume a página.',
  venda_pendente: 'Venda para conferência: aqui você aprova o registro ou confirma a recusa.',
  saida_automatica: 'Saída pendente: aqui você corrige a entrada e a saída do seu ponto.',
  saida_pendente: 'Saída pendente: aqui você corrige a entrada e a saída do seu ponto.',
  mencao: 'Menção leva direto para a conversa onde você foi chamado, com a mensagem marcada.',
};

/* Sem janela de resposta: o aviso só conta o que aconteceu. */
export const FALA_SEM_ACOES =
  'Esse aviso não pede resposta: ele só conta o que aconteceu. Quando chegar um que pede (turno, folga, venda), ele abre com os botões de resposta aqui dentro.';

/* Deixa o texto do passo pronto: o do aviso depende do que ela acabou de ver. */
export const falaDoPasso = (indice, aberta) => {
  const passo = PASSEIO_AVISOS[indice];
  if (!passo) return null;
  if (passo.fala !== 'ACOES') return passo.fala;
  const tipo = aberta?.tipo || avisoDoPasseio?.tipo;
  return ACOES_POR_TIPO[tipo] || FALA_SEM_ACOES;
};

/* ---------------- ações que o roteiro dispara ---------------- */

/* `garantirAviso` não mora aqui: quem cria o aviso é o hook, que tem o user. */
const ACOES = {
  /* A janela de Configurações já está aberta: isto troca a aba. */
  abaAvisos: () => abrirConfigNaAba('notificacoes'),
  abaPerfil: () => abrirConfigNaAba('perfil'),
  abaDesempenho: () => abrirConfigNaAba('desempenho'),
};

export const executarAcaoDeAvisos = (acao) => {
  const fazer = ACOES[acao];
  if (fazer) fazer();
};

export const PASSEIO_AVISOS = [
  {
    acao: 'abaAvisos',
    area: 'som',
    fala: 'Aqui é o som das notificações: você liga ou desliga, escolhe entre os sons padrão (clique em um para ouvir) e regula o volume. Vale só para o computador; o celular tem o som dele.',
  },
  {
    area: 'audios',
    fala: 'Nenhum deles serve? Em Enviar áudio você põe o seu: até 4 segundos, ou mais longo com o corte na hora.',
  },
  {
    area: 'audios',
    fala: 'O que você envia fica em Meus áudios, só para você, nos seus dois aparelhos. A chavinha compartilhado põe o áudio na galeria de todo mundo; os dos outros aparecem embaixo.',
  },
  {
    acao: 'abaPerfil',
    alvo: SELETOR_AVISOS.abaPerfil,
    fala: 'Esta é a aba Perfil: sua foto, o nome que aparece no menu iniciar e no chat, e o subnick, aquela frase embaixo do nome no estilo MSN. O que mudar aqui vale quando você salvar.',
  },
  {
    acao: 'abaDesempenho',
    alvo: SELETOR_AVISOS.abaDesempenho,
    fala: 'E esta é a aba Desempenho: se o computador engasgar, ligue o Modo leve e ele desliga o vidro fosco, os brilhos, as animações, a imagem do fundo e o pet de uma vez. Eu continuo aqui, só fico parada em vez de voar.',
  },
  {
    acao: 'garantirAviso',
    alvo: SELETOR_AVISOS.sino,
    espera: SELETOR_AVISOS.painel,
    fala: 'Agora feche as configurações e clique no sino, aqui embaixo, para ver os seus avisos.',
  },
  {
    alvo: SELETOR_AVISOS.painel,
    fala: 'Essas são as suas notificações: em Não lidas fica só o que ainda não abriu, e em Ver todas aparece o histórico inteiro.',
  },
  {
    alvo: linhaDoAviso,
    espera: SELETOR_AVISOS.dialogo,
    esperaMaxima: 2400,
    fala: 'Esse é o seu aviso: clique nele para ver o que ele quer.',
  },
  {
    alvo: SELETOR_AVISOS.dialogo,
    fala: 'ACOES',
  },
];
