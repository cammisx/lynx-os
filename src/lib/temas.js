/**
 * Perfis de cor do sistema.
 *
 * Cada tema traz as quatro cores que o shell inteiro usa:
 *   c1  acento principal (o "dourado" do sistema: ícones, bordas, destaque)
 *   c5  cor de superfície (fundo dos painéis e do vidro)
 *   c6  cor de apoio (gradientes, brilhos, hover)
 *   c14 cor de contraste (seda do desktop, detalhes)
 * e o `fundo` (c8), que é o breu atrás de tudo.
 *
 * Todos são escuros de propósito: o vidro, o texto claro e as sombras do shell
 * foram desenhados em cima de fundo escuro.
 */
export const TEMAS = [
  {
    id: 'seda-cosmica',
    nome: 'Seda Cósmica',
    descricao: 'O clássico do Lynx: âmbar derretendo em violeta.',
    cores: ['#F0943A', '#C8387A', '#E8604A', '#9B3FA8'],
    fundo: '#1A0510',
  },
  {
    id: 'mare-de-vidro',
    nome: 'Maré de Vidro',
    descricao: 'Azul de mar fundo, com vidro frio e uma ponta de lilás.',
    cores: ['#6FB6FF', '#1F4E8A', '#3B7BC4', '#9C7BFF'],
    fundo: '#030E1A',
  },
  {
    id: 'floresta-neon',
    nome: 'Floresta Neon',
    descricao: 'Mata fechada iluminada por placa de lanchonete.',
    cores: ['#8EF05A', '#1F7A3F', '#2FAE6B', '#57C46A'],
    fundo: '#04140B',
  },
  {
    id: 'cafe-com-codigo',
    nome: 'Café com Código',
    descricao: 'Pra quem debuga às três da manhã na terceira xícara.',
    cores: ['#E2A661', '#6B3F2A', '#B5713C', '#8C5A34'],
    fundo: '#140B06',
  },
  {
    id: 'vampira-corporativa',
    nome: 'Vampira Corporativa',
    descricao: 'Vinho, dourado e um contrato assinado com sangue.',
    cores: ['#D9A441', '#6E1030', '#B01E3C', '#8E1B4E'],
    fundo: '#12040A',
  },
  {
    id: 'acai-overclock',
    nome: 'Açaí Overclock',
    descricao: 'Roxo de açaí com o processador gritando por socorro.',
    cores: ['#B98CFF', '#4B1E7A', '#7A2FD0', '#9B3FD0'],
    fundo: '#0A0418',
  },
  {
    id: 'ferrugem-eletrica',
    nome: 'Ferrugem Elétrica',
    descricao: 'Metal velho passando corrente na sua frente.',
    cores: ['#FF9147', '#8A3B12', '#C25B1E', '#C9A227'],
    fundo: '#160A04',
  },
  {
    id: 'menta-fantasma',
    nome: 'Menta Fantasma',
    descricao: 'Verde gelado que aparece no canto do olho e some.',
    cores: ['#79F2C8', '#1D6B57', '#35A98A', '#56C6A5'],
    fundo: '#04120E',
  },
  {
    id: 'sunset-no-caps',
    nome: 'Pôr do Sol no CAPS',
    descricao: 'Laranja, rosa e roxo naquele horário em que nada é real.',
    cores: ['#FF8A5C', '#C93A6B', '#E0553F', '#C24FD8'],
    fundo: '#1A0709',
  },
  {
    id: 'abacaxi-radioativo',
    nome: 'Abacaxi Radioativo',
    descricao: 'Amarelo ácido pra brilhar no escuro do seu quarto.',
    cores: ['#D6F24A', '#5E7A12', '#9CBF20', '#19BFA6'],
    fundo: '#0D1204',
  },
  {
    id: 'brisa-de-cemiterio',
    nome: 'Brisa de Cemitério',
    descricao: 'Prata, musgo e neblina: elegante e levemente fúnebre.',
    cores: ['#C9CFD9', '#3A4A42', '#566B5E', '#7E6E9A'],
    fundo: '#0A0D0B',
  },
  {
    id: 'cyber-sertao',
    nome: 'Cyber Sertão',
    descricao: 'Forró no metaverso, com areia na ventoinha.',
    cores: ['#F2A03C', '#1F3B8A', '#2D5FD0', '#B0459E'],
    fundo: '#060A18',
  },
  {
    id: 'chiclete-de-garagem',
    nome: 'Chiclete de Garagem',
    descricao: 'Banda ruim, luz colorida e chiclete no sapato.',
    cores: ['#FF7AC6', '#7B2FA8', '#B84AD0', '#4A6BE8'],
    fundo: '#140618',
  },
  {
    id: 'meia-noite-de-domingo',
    nome: 'Meia-Noite de Domingo',
    descricao: 'O silêncio azul de quando a semana ainda não começou.',
    cores: ['#8FA6D9', '#2A3560', '#45538F', '#6C63B0'],
    fundo: '#070A14',
  },
  {
    id: 'orkut-saudade',
    nome: 'Orkut Saudade',
    descricao: 'Azul de recado, verde de comunidade e coral de recado triste.',
    cores: ['#56C7D8', '#2F7D5E', '#48A9A6', '#E0693F'],
    fundo: '#05141A',
  },
];

export const TEMA_PADRAO = 'seda-cosmica';

export const temaPorId = (id) => TEMAS.find((tema) => tema.id === id) || TEMAS[0];

/**
 * Troca o tema na marra: o atributo `data-theme` avisa quem observa (o fundo do
 * desktop), e as variáveis inline vestem o resto do shell na hora.
 */
export const aplicarTema = (id) => {
  const tema = temaPorId(id);
  const root = document.documentElement;
  root.setAttribute('data-theme', tema.id);
  root.style.setProperty('--c1', tema.cores[0]);
  root.style.setProperty('--c5', tema.cores[1]);
  root.style.setProperty('--c6', tema.cores[2]);
  root.style.setProperty('--c14', tema.cores[3]);
  root.style.setProperty('--c8', tema.fundo);
  root.style.setProperty('--ink', '255, 255, 255');
  root.style.setProperty('--ink-hex', '#ffffff');
  return tema;
};
