/**
 * Perfis de cor do sistema, em dois modos.
 *
 * Cada tema tem duas paletas com a mesma identidade:
 *   escuro  o breu original do Lynx
 *   claro   fundo pálido do mesmo matiz, com os acentos escurecidos só o
 *           necessário para o contraste continuar legível (4.5:1 no acento e
 *           no detalhe, 3:1 no apoio, 2.3:1 na superfície).
 *
 * As quatro cores são as mesmas do shell inteiro:
 *   c1  acento principal (ícones, bordas, destaque)
 *   c5  cor de superfície (painéis, vidro, bordas)
 *   c6  cor de apoio (gradientes, brilho, hover)
 *   c14 cor de contraste (seda do desktop, detalhes)
 * c8 é o fundo e ink é a cor do texto (branco no escuro, quase preto tingido
 * no claro). As variantes c2/c3/c4/c7/c9/c11/c12/c13 saem dessas no theme.css.
 */
export const MODOS = ['claro', 'escuro'];
export const MODO_PADRAO = 'escuro';
export const MODO_SISTEMA = 'sistema';
export const MODO_CLARO = 'claro';
export const MODO_ESCURO = 'escuro';

export const TEMAS = [
  {
    id: 'seda-cosmica',
    nome: 'Seda Cósmica',
    descricao: 'O clássico do Lynx: âmbar derretendo em violeta.',
    escuro: { cores: ['#F0943A', '#C8387A', '#E8604A', '#9B3FA8'], fundo: '#1A0510', ink: '#FFFFFF' },
    claro: { cores: ['#A6590D', '#DE87AF', '#E75841', '#9B3FA8'], fundo: '#FBF0F6', ink: '#2E1522' },
  },
  {
    id: 'mare-de-vidro',
    nome: 'Maré de Vidro',
    descricao: 'Azul de mar fundo, com vidro frio e uma ponta de lilás.',
    escuro: { cores: ['#6FB6FF', '#1F4E8A', '#3B7BC4', '#9C7BFF'], fundo: '#030E1A', ink: '#FFFFFF' },
    claro: { cores: ['#006CDC', '#7CA6DC', '#3B7BC4', '#7649FF'], fundo: '#F0F6FB', ink: '#13212F' },
  },
  {
    id: 'floresta-neon',
    nome: 'Floresta Neon',
    descricao: 'Mata fechada iluminada por placa de lanchonete.',
    escuro: { cores: ['#8EF05A', '#1F7A3F', '#2FAE6B', '#57C46A'], fundo: '#04140B', ink: '#FFFFFF' },
    claro: { cores: ['#34810C', '#32BD63', '#2B9E61', '#2D813C'], fundo: '#F0FBF5', ink: '#152D20' },
  },
  {
    id: 'cafe-com-codigo',
    nome: 'Café com Código',
    descricao: 'Pra quem debuga às três da manhã na terceira xícara.',
    escuro: { cores: ['#E2A661', '#6B3F2A', '#B5713C', '#8C5A34'], fundo: '#140B06', ink: '#FFFFFF' },
    claro: { cores: ['#9D611D', '#CD9981', '#B5713C', '#8C5A34'], fundo: '#FAF5F1', ink: '#2B1E17' },
  },
  {
    id: 'vampira-corporativa',
    nome: 'Vampira Corporativa',
    descricao: 'Vinho, dourado e um contrato assinado com sangue.',
    escuro: { cores: ['#D9A441', '#6E1030', '#B01E3C', '#8E1B4E'], fundo: '#12040A', ink: '#FFFFFF' },
    claro: { cores: ['#8F671D', '#DF88A6', '#B01E3C', '#8E1B4E'], fundo: '#FBF1F5', ink: '#2D161F' },
  },
  {
    id: 'acai-overclock',
    nome: 'Açaí Overclock',
    descricao: 'Roxo de açaí com o processador gritando por socorro.',
    escuro: { cores: ['#B98CFF', '#4B1E7A', '#7A2FD0', '#9B3FD0'], fundo: '#0A0418', ink: '#FFFFFF' },
    claro: { cores: ['#8536FF', '#B890E2', '#7A2FD0', '#9B3FD0'], fundo: '#F4F0FB', ink: '#1C142E' },
  },
  {
    id: 'ferrugem-eletrica',
    nome: 'Ferrugem Elétrica',
    descricao: 'Metal velho passando corrente na sua frente.',
    escuro: { cores: ['#FF9147', '#8A3B12', '#C25B1E', '#C9A227'], fundo: '#160A04', ink: '#FFFFFF' },
    claro: { cores: ['#BB4B00', '#D99470', '#C25B1E', '#886D1A'], fundo: '#FBF4F0', ink: '#2E1D15' },
  },
  {
    id: 'menta-fantasma',
    nome: 'Menta Fantasma',
    descricao: 'Verde gelado que aparece no canto do olho e some.',
    escuro: { cores: ['#79F2C8', '#1D6B57', '#35A98A', '#56C6A5'], fundo: '#04120E', ink: '#FFFFFF' },
    claro: { cores: ['#0C7F57', '#33BB98', '#319C80', '#2B7F67'], fundo: '#F1FBF8', ink: '#162D26' },
  },
  {
    id: 'sunset-no-caps',
    nome: 'Pôr do Sol no CAPS',
    descricao: 'Laranja, rosa e roxo naquele horário em que nada é real.',
    escuro: { cores: ['#FF8A5C', '#C93A6B', '#E0553F', '#C24FD8'], fundo: '#1A0709', ink: '#FFFFFF' },
    claro: { cores: ['#CA3900', '#DF89A6', '#E0553F', '#B42DCD'], fundo: '#FBF1F2', ink: '#2C1719' },
  },
  {
    id: 'abacaxi-radioativo',
    nome: 'Abacaxi Radioativo',
    descricao: 'Amarelo ácido pra brilhar no escuro do seu quarto.',
    escuro: { cores: ['#D6F24A', '#5E7A12', '#9CBF20', '#19BFA6'], fundo: '#0D1204', ink: '#FFFFFF' },
    claro: { cores: ['#667809', '#90B330', '#7A9619', '#118170'], fundo: '#F7FBF1', ink: '#242D16' },
  },
  {
    id: 'brisa-de-cemiterio',
    nome: 'Brisa de Cemitério',
    descricao: 'Prata, musgo e neblina: elegante e levemente fúnebre.',
    escuro: { cores: ['#C9CFD9', '#3A4A42', '#566B5E', '#7E6E9A'], fundo: '#0A0D0B', ink: '#FFFFFF' },
    claro: { cores: ['#607089', '#92AA9E', '#566B5E', '#796996'], fundo: '#F5F7F5', ink: '#1F2420' },
  },
  {
    id: 'cyber-sertao',
    nome: 'Cyber Sertão',
    descricao: 'Forró no metaverso, com areia na ventoinha.',
    escuro: { cores: ['#F2A03C', '#1F3B8A', '#2D5FD0', '#B0459E'], fundo: '#060A18', ink: '#FFFFFF' },
    claro: { cores: ['#A05D0B', '#8AA1E0', '#2D5FD0', '#B0459E'], fundo: '#F1F3FB', ink: '#161B2C' },
  },
  {
    id: 'chiclete-de-garagem',
    nome: 'Chiclete de Garagem',
    descricao: 'Banda ruim, luz colorida e chiclete no sapato.',
    escuro: { cores: ['#FF7AC6', '#7B2FA8', '#B84AD0', '#4A6BE8'], fundo: '#140618', ink: '#FFFFFF' },
    claro: { cores: ['#D20078', '#C28FE0', '#B84AD0', '#4164E7'], fundo: '#F9F1FB', ink: '#27162C' },
  },
  {
    id: 'meia-noite-de-domingo',
    nome: 'Meia-Noite de Domingo',
    descricao: 'O silêncio azul de quando a semana ainda não começou.',
    escuro: { cores: ['#8FA6D9', '#2A3560', '#45538F', '#6C63B0'], fundo: '#070A14', ink: '#FFFFFF' },
    claro: { cores: ['#456BC0', '#95A1D0', '#45538F', '#6C63B0'], fundo: '#F2F4FA', ink: '#181C2A' },
  },
  {
    id: 'orkut-saudade',
    nome: 'Orkut Saudade',
    descricao: 'Azul de recado, verde de comunidade e coral de recado triste.',
    escuro: { cores: ['#56C7D8', '#2F7D5E', '#48A9A6', '#E0693F'], fundo: '#05141A', ink: '#FFFFFF' },
    claro: { cores: ['#1F7987', '#46B98B', '#409794', '#C24A1F'], fundo: '#F0F8FB', ink: '#15262E' },
  },];

export const TEMA_PADRAO = 'seda-cosmica';

export const temaPorId = (id) => TEMAS.find((tema) => tema.id === id) || TEMAS[0];

export const paletaDoTema = (id, modo = MODO_PADRAO) => {
  const tema = temaPorId(id);
  return tema[modo === MODO_CLARO ? 'claro' : 'escuro'] || tema.escuro;
};

/** O que o sistema operacional está pedindo agora. */
export const modoDoSistema = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return MODO_ESCURO;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? MODO_CLARO : MODO_ESCURO;
};

/** 'sistema' vira o modo real; qualquer coisa estranha cai no escuro. */
export const resolverModo = (modo) => {
  if (modo === MODO_SISTEMA) return modoDoSistema();
  return modo === MODO_CLARO ? MODO_CLARO : MODO_ESCURO;
};

/** Aceita claro/escuro/sistema; o que não for reconhecido volta ao padrão. */
export const modoValido = (modo) =>
  [MODO_CLARO, MODO_ESCURO, MODO_SISTEMA].includes(modo) ? modo : MODO_PADRAO;

export const CACHE_TEMA = 'lynx:tema-atual';

const paraRgb = (hex) => {
  const h = String(hex || '').replace('#', '');
  const inteiro = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  if (Number.isNaN(inteiro)) return '255, 255, 255';
  return `${(inteiro >> 16) & 255}, ${(inteiro >> 8) & 255}, ${inteiro & 255}`;
};

/**
 * Troca o tema na marra: `data-theme`/`data-mode` avisam quem observa (o fundo
 * do desktop, o CSS) e as variáveis inline vestem o resto do shell na hora.
 */
export const aplicarTema = (id, modo = MODO_PADRAO) => {
  const tema = temaPorId(id);
  const escolhido = resolverModo(modo);
  const paleta = tema[escolhido] || tema.escuro;
  const [c1, c5, c6, c14] = paleta.cores;
  const root = document.documentElement;

  root.setAttribute('data-theme', tema.id);
  root.setAttribute('data-mode', escolhido === MODO_CLARO ? 'light' : 'dark');
  root.style.colorScheme = escolhido === MODO_CLARO ? 'light' : 'dark';
  root.style.setProperty('--c1', c1);
  root.style.setProperty('--c5', c5);
  root.style.setProperty('--c6', c6);
  root.style.setProperty('--c14', c14);
  root.style.setProperty('--c8', paleta.fundo);
  root.style.setProperty('--ink', paraRgb(paleta.ink));
  root.style.setProperty('--ink-hex', paleta.ink);

  /* A última paleta fica guardada para o próximo carregamento pintar certo no
     primeiro frame, sem piscar o breu em quem usa o diurno. */
  try {
    window.localStorage.setItem(
      CACHE_TEMA,
      JSON.stringify({ tema: tema.id, modo: escolhido, paleta })
    );
  } catch (erro) {
    // navegador sem storage: só perde o anti-flash, nada quebra
  }

  return { ...tema, modo: escolhido };
};
