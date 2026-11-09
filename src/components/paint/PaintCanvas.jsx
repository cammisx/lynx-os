import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import MenuFlutuante from '@/components/desktop/MenuFlutuante';
import { CloseIcon } from '@/components/icons';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import useAviso from '@/components/ui/Aviso';
import useDesenhosFixos from '@/hooks/useDesenhosFixos';
import { useAuth } from '@/lib/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import EnviarDesenhoModal from '@/components/paint/EnviarDesenhoModal';
import RodaCromatica from '@/components/paint/RodaCromatica';
import {
  CORES,
  COM_PREENCHIMENTO,
  FERRAMENTAS,
  LIMITE_CORES_CUSTOM,
  LIMITE_HISTORICO,
  TRANSPARENTE,
  baixarJpg,
  canvasParaBlob,
  compor,
  contraste,
  corDoPixel,
  criarCanvas,
  hexParaHsv,
  hsvParaHex,
  normalizarRetangulo,
  novoId,
  paraArquivo,
  preencherArea,
  reduzirCanvas,
} from '@/lib/paint';

/**
 * Editor de pintura do app Paint.
 *
 * O desenho é feito de camadas, cada uma um canvas fora da tela. Na tela
 * existe um canvas só, que recebe a composição das camadas visíveis: assim
 * esconder camada, mudar opacidade ou desfazer é só recompor.
 *
 * O menu do botão direito é o mesmo da área de trabalho: salvar, limpar,
 * enviar para o chat e fixar na mesa. No celular ele abre pelo botão "⋮".
 */

/* Teto de caracteres da miniatura embutida no registro. O banco recusa campos
   acima de ~24 mil caracteres, então 12 mil deixa folga para o resto do
   registro. Acima disso a imagem sobe para o armazenamento e vai como link. */
const TETO_MINIATURA_EMBUTIDA = 12000;

const BOTAO = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  height: 28,
  minWidth: 28,
  padding: '0 9px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const camadaNova = (nome, comFundo, largura, altura) => {
  const canvas = criarCanvas(largura, altura);
  if (comFundo) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = comFundo;
    ctx.fillRect(0, 0, largura, altura);
  }
  return { id: novoId(), nome, visivel: true, opacidade: 1, canvas };
};

export default function PaintCanvas() {
  const pequeno = useIsMobile();
  const { user } = useAuth();
  const { avisar, Aviso } = useAviso();
  const { fixar } = useDesenhosFixos();
  const chaveCores = `lynx:paint:cores:${user?.id || 'anon'}`;

  const [tamanho, setTamanho] = useState({ largura: 900, altura: 620 });
  const [camadas, setCamadas] = useState(() => [
    camadaNova('Fundo', '#ffffff', 900, 620),
    camadaNova('Camada 1', null, 900, 620),
  ]);
  const [ativaId, setAtivaId] = useState(() => '');
  const [ferramenta, setFerramenta] = useState('pincel');
  const [cor, setCor] = useState('#111111');
  const [corFundo, setCorFundo] = useState(TRANSPARENTE);
  const [alvo, setAlvo] = useState('traco');
  const [coresCustom, setCoresCustom] = useState([]);
  const [painelCor, setPainelCor] = useState(false);
  const [brilho, setBrilho] = useState(1);
  const [espessura, setEspessura] = useState(8);
  const [opacidade, setOpacidade] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [menu, setMenu] = useState(null);
  const [painelCamadas, setPainelCamadas] = useState(false);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [envio, setEnvio] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const [selecao, setSelecao] = useState(null);
  const [, setVersao] = useState(0);

  const raizRef = useRef(null);
  const telaRef = useRef(null);
  const previewRef = useRef(null);
  const selecaoRef = useRef(null);
  const areaRef = useRef(null);
  const clipboard = useRef(null);
  const entradaArquivo = useRef(null);
  const desenho = useRef({ ativo: false, inicio: null, anterior: null, antes: null, selecionando: false });
  const historia = useRef({ passos: [], indice: -1 });

  const camadaAtiva = camadas.find((item) => item.id === ativaId) || camadas[camadas.length - 1] || null;

  /* Garante uma camada ativa válida sem depender de efeito. */
  useEffect(() => {
    if (!ativaId && camadas.length) setAtivaId(camadas[camadas.length - 1].id);
  }, [ativaId, camadas]);

  const mapa = useCallback(
    () =>
      camadas.map((camada) => ({
        id: camada.id,
        visivel: camada.visivel,
        opacidade: camada.opacidade,
        canvas: camada.canvas,
      })),
    [camadas]
  );

  const recompor = useCallback(() => {
    const tela = telaRef.current;
    if (!tela) return;
    const ctx = tela.getContext('2d');
    ctx.clearRect(0, 0, tela.width, tela.height);
    const desenhoFinal = compor(mapa(), tela.width, tela.height);
    ctx.drawImage(desenhoFinal, 0, 0);
    setVersao((n) => n + 1);
  }, [mapa]);

  useEffect(() => {
    recompor();
  }, [recompor, camadas, tamanho]);

  /* Põe o foco no editor ao abrir, para os atalhos funcionarem de primeira.
     Só não rouba o foco de quem está digitando em outro lugar. */
  useEffect(() => {
    const ativo = document.activeElement;
    const digitando =
      ativo && (/^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName) || ativo.isContentEditable);
    if (!digitando) raizRef.current?.focus?.();
  }, []);

  /* As cores que a pessoa salva ficam guardadas no aparelho dela. */
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveCores);
      const lista = bruto ? JSON.parse(bruto) : [];
      setCoresCustom(
        Array.isArray(lista)
          ? lista.filter((tom) => /^#[0-9a-f]{6}$/i.test(tom)).slice(-LIMITE_CORES_CUSTOM)
          : []
      );
    } catch {
      setCoresCustom([]);
    }
  }, [chaveCores]);

  /* No celular a tela é estreita: abre já com o desenho inteiro à vista. */
  useEffect(() => {
    if (!pequeno) return undefined;
    const id = requestAnimationFrame(() => setZoom(selectZoomAjuste(tamanho, areaRef)));
    return () => cancelAnimationFrame(id);
  }, [pequeno, tamanho]);

  /* Cada traço guarda o antes e o depois da camada mexida. */
  const guardarPasso = (camadaId, antes, depois) => {
    const pilha = historia.current;
    pilha.passos = pilha.passos.slice(0, pilha.indice + 1);
    pilha.passos.push({ camadaId, antes, depois });
    if (pilha.passos.length > LIMITE_HISTORICO) pilha.passos.shift();
    pilha.indice = pilha.passos.length - 1;
    setVersao((n) => n + 1);
  };

  const aplicarPasso = (passo, lado) => {
    const camada = camadas.find((item) => item.id === passo.camadaId);
    if (!camada) return;
    const ctx = camada.canvas.getContext('2d');
    const dados = passo[lado];
    if (dados) ctx.putImageData(dados, 0, 0);
    recompor();
  };

  const desfazer = () => {
    const pilha = historia.current;
    if (pilha.indice < 0) return;
    aplicarPasso(pilha.passos[pilha.indice], 'antes');
    pilha.indice -= 1;
    setVersao((n) => n + 1);
  };

  const refazer = () => {
    const pilha = historia.current;
    if (pilha.indice >= pilha.passos.length - 1) return;
    pilha.indice += 1;
    aplicarPasso(pilha.passos[pilha.indice], 'depois');
    setVersao((n) => n + 1);
  };

  /* Todo desenho novo nasce com o fundo e uma camada vazia por cima, que é
     onde a pessoa desenha: o fundo fica intocado. */
  const reiniciar = (largura, altura, comFundo = '#ffffff') => {
    const base = camadaNova('Fundo', comFundo, largura, altura);
    const cima = camadaNova('Camada 1', null, largura, altura);
    historia.current = { passos: [], indice: -1 };
    setTamanho({ largura, altura });
    setCamadas([base, cima]);
    setAtivaId(cima.id);
    setSelecao(null);
    setZoom(1);
    setVersao((n) => n + 1);
  };

  /* ---------- desenho ---------- */

  const ponto = (evento) => {
    const tela = telaRef.current;
    const caixa = tela.getBoundingClientRect();
    return {
      x: ((evento.clientX - caixa.left) / caixa.width) * tela.width,
      y: ((evento.clientY - caixa.top) / caixa.height) * tela.height,
    };
  };

  const pincelar = (ctx, de, para, apagar = false) => {
    ctx.save();
    ctx.globalAlpha = opacidade;
    ctx.globalCompositeOperation = apagar ? 'destination-out' : 'source-over';
    ctx.strokeStyle = apagar ? '#000000' : cor;
    ctx.lineWidth = espessura;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(de.x, de.y);
    ctx.lineTo(para.x, para.y);
    ctx.stroke();
    ctx.restore();
  };

  const desenharForma = (ctx, inicio, fim) => {
    ctx.save();
    ctx.globalAlpha = opacidade;
    ctx.lineWidth = espessura;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (ferramenta === 'linha') {
      ctx.moveTo(inicio.x, inicio.y);
      ctx.lineTo(fim.x, fim.y);
    } else if (ferramenta === 'retangulo') {
      ctx.rect(inicio.x, inicio.y, fim.x - inicio.x, fim.y - inicio.y);
    } else {
      ctx.ellipse(
        (inicio.x + fim.x) / 2,
        (inicio.y + fim.y) / 2,
        Math.abs(fim.x - inicio.x) / 2,
        Math.abs(fim.y - inicio.y) / 2,
        0,
        0,
        Math.PI * 2
      );
    }
    if (COM_PREENCHIMENTO.includes(ferramenta) && corFundo !== TRANSPARENTE) {
      ctx.fillStyle = corFundo;
      ctx.fill();
    }
    if (ferramenta === 'linha' || espessura > 0) {
      ctx.strokeStyle = cor;
      ctx.stroke();
    }
    ctx.restore();
  };

  const aoPressionar = (evento) => {
    if (evento.button === 2) return;
    const tela = telaRef.current;
    if (!tela || !camadaAtiva) return;
    evento.preventDefault();
    tela.setPointerCapture?.(evento.pointerId);

    const pos = ponto(evento);

    if (ferramenta === 'selecionar') {
      desenho.current = {
        ativo: true,
        inicio: pos,
        anterior: pos,
        antes: null,
        selecionando: true,
      };
      trocarSelecao({ x: pos.x, y: pos.y, w: 0, h: 0 });
      return;
    }

    if (ferramenta === 'conta-gotas') {
      const composta = compor(mapa(), tamanho.largura, tamanho.altura);
      const amostra = corDoPixel(composta, pos.x, pos.y);
      if (amostra) {
        setCor(amostra);
        avisar(`Cor ${amostra} escolhida`);
      }
      return;
    }

    const ctx = camadaAtiva.canvas.getContext('2d');
    const antes = ctx.getImageData(0, 0, camadaAtiva.canvas.width, camadaAtiva.canvas.height);

    if (ferramenta === 'balde') {
      const pintou = preencherArea(ctx, tamanho.largura, tamanho.altura, pos.x, pos.y, cor);
      if (pintou) {
        guardarPasso(
          camadaAtiva.id,
          antes,
          ctx.getImageData(0, 0, camadaAtiva.canvas.width, camadaAtiva.canvas.height)
        );
        recompor();
      }
      return;
    }

    desenho.current = { ativo: true, inicio: pos, anterior: pos, antes };

    if (['linha', 'retangulo', 'elipse'].includes(ferramenta)) return;

    /* Um ponto também pinta: um clique sem arrastar deixa a marca. */
    pincelar(ctx, pos, { x: pos.x + 0.01, y: pos.y + 0.01 }, ferramenta === 'borracha');
    recompor();
  };

  const aoMover = (evento) => {
    const estado = desenho.current;
    if (!estado.ativo) return;
    if (!camadaAtiva) return;
    const pos = ponto(evento);

    if (estado.selecionando) {
      desenho.current.anterior = pos;
      trocarSelecao(normalizarRetangulo(estado.inicio, pos));
      return;
    }

    if (['linha', 'retangulo', 'elipse'].includes(ferramenta)) {
      desenho.current.anterior = pos;
      const preview = previewRef.current;
      if (!preview) return;
      const ctx = preview.getContext('2d');
      ctx.clearRect(0, 0, preview.width, preview.height);
      desenharForma(ctx, estado.inicio, pos);
      return;
    }

    const ctx = camadaAtiva.canvas.getContext('2d');
    pincelar(ctx, estado.anterior, pos, ferramenta === 'borracha');
    desenho.current.anterior = pos;
    recompor();
  };

  const aoSoltar = () => {
    const estado = desenho.current;
    if (!estado.ativo) return;
    desenho.current = { ativo: false, inicio: null, anterior: null, antes: null };

    if (estado.selecionando) {
      const area = estado.inicio && estado.anterior
        ? normalizarRetangulo(estado.inicio, estado.anterior)
        : null;
      trocarSelecao(area && area.w >= 4 && area.h >= 4 ? area : null);
      return;
    }
    if (!camadaAtiva) {
      recompor();
      return;
    }

    const preview = previewRef.current;
    if (preview) preview.getContext('2d').clearRect(0, 0, preview.width, preview.height);

    if (['linha', 'retangulo', 'elipse'].includes(ferramenta) && estado.inicio) {
      const ctx = camadaAtiva.canvas.getContext('2d');
      desenharForma(ctx, estado.inicio, estado.anterior || estado.inicio);
      recompor();
    }

    if (estado.antes) {
      const ctx = camadaAtiva.canvas.getContext('2d');
      guardarPasso(
        camadaAtiva.id,
        estado.antes,
        ctx.getImageData(0, 0, camadaAtiva.canvas.width, camadaAtiva.canvas.height)
      );
      recompor();
    }
  };

  /* ---------- cores ---------- */

  const corAtiva = alvo === 'preenchimento' && corFundo !== TRANSPARENTE ? corFundo : cor;

  const definirCor = (hex) => {
    const tom = String(hex || '').toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(tom)) return;
    if (alvo === 'preenchimento') setCorFundo(tom);
    else setCor(tom);
  };

  const salvarCorCustom = (hex) => {
    const tom = String(hex || '').toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(tom)) return;
    setCoresCustom((atual) => {
      /* Passou de dez, a mais antiga sai sozinha. */
      const lista = [...atual.filter((item) => item !== tom), tom].slice(-LIMITE_CORES_CUSTOM);
      try {
        localStorage.setItem(chaveCores, JSON.stringify(lista));
      } catch {
        /* sem espaço no aparelho: a cor vale só nesta sessão */
      }
      return lista;
    });
    avisar(`Cor ${tom.toUpperCase()} salva`);
  };

  const mudarBrilho = (valor) => {
    setBrilho(valor);
    const { h, s } = hexParaHsv(corAtiva);
    definirCor(hsvParaHex(h, s, valor));
  };

  /* ---------- seleção, copiar e colar ---------- */

  const desenharSelecao = (area) => {
    const tela = selecaoRef.current;
    if (!tela) return;
    const ctx = tela.getContext('2d');
    ctx.clearRect(0, 0, tela.width, tela.height);
    if (!area || area.w < 1 || area.h < 1) return;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeRect(area.x + 0.5, area.y + 0.5, area.w - 1, area.h - 1);
    ctx.lineDashOffset = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeRect(area.x + 0.5, area.y + 0.5, area.w - 1, area.h - 1);
    ctx.restore();
  };

  const trocarSelecao = (area) => {
    setSelecao(area);
    desenharSelecao(area);
  };

  const selecionarTudo = () => {
    setFerramenta('selecionar');
    trocarSelecao({ x: 0, y: 0, w: tamanho.largura, h: tamanho.altura });
  };

  const copiarSelecao = () => {
    if (!selecao || selecao.w < 2 || selecao.h < 2) {
      avisar('Marque uma área antes de copiar.');
      return false;
    }
    const composta = compor(mapa(), tamanho.largura, tamanho.altura);
    const pedaco = criarCanvas(Math.round(selecao.w), Math.round(selecao.h));
    pedaco
      .getContext('2d')
      .drawImage(composta, selecao.x, selecao.y, selecao.w, selecao.h, 0, 0, pedaco.width, pedaco.height);
    clipboard.current = pedaco;
    return true;
  };

  const recortarSelecao = () => {
    if (!copiarSelecao() || !camadaAtiva) return;
    const ctx = camadaAtiva.canvas.getContext('2d');
    const antes = ctx.getImageData(0, 0, camadaAtiva.canvas.width, camadaAtiva.canvas.height);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    ctx.fillRect(selecao.x, selecao.y, selecao.w, selecao.h);
    ctx.restore();
    guardarPasso(
      camadaAtiva.id,
      antes,
      ctx.getImageData(0, 0, camadaAtiva.canvas.width, camadaAtiva.canvas.height)
    );
    recompor();
    avisar('Área recortada');
  };

  const colarSelecao = () => {
    const pedaco = clipboard.current;
    if (!pedaco) {
      avisar('Copie uma área antes de colar.');
      return;
    }
    if (!camadaAtiva) return;
    const ctx = camadaAtiva.canvas.getContext('2d');
    const antes = ctx.getImageData(0, 0, camadaAtiva.canvas.width, camadaAtiva.canvas.height);
    const destino = selecao ? { x: selecao.x, y: selecao.y } : { x: 12, y: 12 };
    ctx.drawImage(pedaco, destino.x, destino.y);
    guardarPasso(
      camadaAtiva.id,
      antes,
      ctx.getImageData(0, 0, camadaAtiva.canvas.width, camadaAtiva.canvas.height)
    );
    setFerramenta('selecionar');
    trocarSelecao({ x: destino.x, y: destino.y, w: pedaco.width, h: pedaco.height });
    recompor();
    avisar('Área colada');
  };

  /* Atalhos de teclado: só valem com o foco dentro do Paint. */
  useEffect(() => {
    const atalhos = (evento) => {
      if (!(evento.ctrlKey || evento.metaKey) || evento.altKey) return;
      const alvo = evento.target;
      if (
        alvo &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName) || alvo.isContentEditable)
      ) {
        return;
      }
      const raiz = raizRef.current;
      if (!raiz || !(raiz === document.activeElement || raiz.contains(document.activeElement))) return;

      const tecla = String(evento.key || '').toLowerCase();
      if (tecla === 'z') {
        evento.preventDefault();
        desfazer();
      } else if (tecla === 'y') {
        evento.preventDefault();
        refazer();
      } else if (tecla === 'a') {
        evento.preventDefault();
        selecionarTudo();
      } else if (tecla === 'c') {
        evento.preventDefault();
        copiarSelecao();
      } else if (tecla === 'x') {
        evento.preventDefault();
        recortarSelecao();
      } else if (tecla === 'v') {
        evento.preventDefault();
        colarSelecao();
      }
    };

    window.addEventListener('keydown', atalhos);
    return () => window.removeEventListener('keydown', atalhos);
  }, [selecao, camadas, ativaId, tamanho]);

  /* ---------- menu do botão direito ---------- */

  const abrirMenu = (evento) => {
    evento.preventDefault();
    evento.stopPropagation();
    setMenu({ x: evento.clientX, y: evento.clientY });
  };

  const desenhoComposto = () => compor(mapa(), tamanho.largura, tamanho.altura);

  const salvarJpg = async () => {
    setOcupado('salvando');
    try {
      await baixarJpg(desenhoComposto(), 'paint');
      avisar('Desenho salvo em .jpg');
    } catch (falha) {
      console.warn('[Paint] salvar', falha);
      avisar('Não consegui salvar o desenho agora.');
    } finally {
      setOcupado('');
    }
  };

  const limparTudo = () => {
    const base = camadaNova('Fundo', '#ffffff', tamanho.largura, tamanho.altura);
    const cima = camadaNova('Camada 1', null, tamanho.largura, tamanho.altura);
    historia.current = { passos: [], indice: -1 };
    setCamadas([base, cima]);
    setAtivaId(cima.id);
    setSelecao(null);
    setConfirmarLimpar(false);
    setVersao((n) => n + 1);
  };

  const prepararEnvio = async () => {
    setOcupado('enviando');
    try {
      const blob = await canvasParaBlob(desenhoComposto());
      setEnvio({ blob });
    } catch (falha) {
      console.warn('[Paint] preparar envio', falha);
      avisar('Não consegui preparar o desenho.');
    } finally {
      setOcupado('');
    }
  };

  const fixarNaMesa = async () => {
    setOcupado('fixando');
    try {
      /* A miniatura tenta ir embutida no registro (não depende de upload). Só
         que campo de texto tem teto de tamanho: foto aberta no editor gera
         base64 grande demais e o banco recusa. Nesse caso a imagem sobe para o
         armazenamento e o registro guarda o link. */
      const miniatura = reduzirCanvas(desenhoComposto(), 720);
      let url = miniatura.toDataURL('image/jpeg', 0.82);
      if (!url || url.length < 200) throw new Error('miniatura vazia');

      if (url.length > TETO_MINIATURA_EMBUTIDA) {
        const blob = await canvasParaBlob(miniatura, 'image/jpeg');
        const envio = await base44.integrations.Core.UploadFile({
          file: paraArquivo(blob, 'desenho.jpg'),
        });
        if (!envio?.file_url) throw new Error('o upload da miniatura não devolveu o link');
        url = envio.file_url;
      }

      const resultado = await fixar({
        url,
        largura: tamanho.largura,
        altura: tamanho.altura,
        nome: 'Desenho',
      });
      if (!resultado?.ok) {
        avisar(resultado?.erro || 'Não consegui fixar o desenho agora.');
        return;
      }
      avisar(
        pequeno
          ? 'Desenho fixado na área de trabalho do computador'
          : 'Desenho fixado na área de trabalho'
      );
    } catch (falha) {
      console.warn('[Paint] fixar', falha);
      const texto = String(falha?.message || falha || '');
      const semCadastro = /DesenhoFixo|não foi publicado/.test(texto);
      avisar(
        semCadastro
          ? 'Para fixar desenhos falta publicar a entidade DesenhoFixo no Builder.'
          : 'Não consegui fixar o desenho agora.'
      );
    } finally {
      setOcupado('');
    }
  };

  const itensMenu = [
    { id: 'salvar', rotulo: 'Salvar (.jpg)', atalho: ocupado === 'salvando' ? '…' : '', acao: salvarJpg },
    { separador: true },
    { id: 'enviar', rotulo: 'Enviar para…', atalho: ocupado === 'enviando' ? '…' : '', acao: prepararEnvio },
    {
      id: 'fixar',
      rotulo: pequeno ? 'Fixar na área de trabalho do computador' : 'Fixar na área de trabalho',
      atalho: ocupado === 'fixando' ? '…' : '',
      acao: fixarNaMesa,
    },
    { separador: true },
    { id: 'selecionar-tudo', rotulo: 'Selecionar tudo', atalho: 'Ctrl+A', acao: selecionarTudo },
    { id: 'copiar', rotulo: 'Copiar seleção', atalho: 'Ctrl+C', acao: copiarSelecao },
    { id: 'recortar', rotulo: 'Recortar seleção', atalho: 'Ctrl+X', acao: recortarSelecao },
    { id: 'colar', rotulo: 'Colar', atalho: 'Ctrl+V', acao: colarSelecao },
    { separador: true },
    { id: 'limpar', rotulo: 'Limpar tudo', perigo: true, acao: () => setConfirmarLimpar(true) },
  ];

  /* ---------- abrir imagem ---------- */

  const abrirImagem = (arquivo) => {
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onload = () => {
        const largura = imagem.naturalWidth;
        const altura = imagem.naturalHeight;
        const fundo = camadaNova('Fundo', '#ffffff', largura, altura);
        const foto = camadaNova('Imagem', null, largura, altura);
        foto.canvas.getContext('2d').drawImage(imagem, 0, 0);
        const cima = camadaNova('Camada 1', null, largura, altura);
        historia.current = { passos: [], indice: -1 };
        setTamanho({ largura, altura });
        setCamadas([fundo, foto, cima]);
        setAtivaId(cima.id);
        setSelecao(null);
        setZoom(1);
        setVersao((n) => n + 1);
        avisar('Imagem aberta no editor');
      };
      imagem.onerror = () => avisar('Não consegui abrir essa imagem.');
      imagem.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  };

  /* ---------- camadas ---------- */

  const adicionarCamada = () => {
    const nova = camadaNova(`Camada ${camadas.length}`, null, tamanho.largura, tamanho.altura);
    setCamadas((atual) => [...atual, nova]);
    setAtivaId(nova.id);
  };

  const duplicarCamada = () => {
    if (!camadaAtiva) return;
    const copia = camadaNova(`${camadaAtiva.nome} cópia`, null, tamanho.largura, tamanho.altura);
    copia.canvas.getContext('2d').drawImage(camadaAtiva.canvas, 0, 0);
    setCamadas((atual) => [...atual, copia]);
    setAtivaId(copia.id);
  };

  const removerCamada = (id) => {
    if (camadas.length <= 1) {
      avisar('O desenho precisa de pelo menos uma camada.');
      return;
    }
    setCamadas((atual) => atual.filter((camada) => camada.id !== id));
    if (ativaId === id) {
      const restante = camadas.filter((camada) => camada.id !== id);
      setAtivaId(restante[restante.length - 1]?.id || '');
    }
  };

  const alternarVisivel = (id) => {
    setCamadas((atual) =>
      atual.map((camada) => (camada.id === id ? { ...camada, visivel: !camada.visivel } : camada))
    );
  };

  const mudarOpacidadeCamada = (id, valor) => {
    setCamadas((atual) =>
      atual.map((camada) => (camada.id === id ? { ...camada, opacidade: valor } : camada))
    );
  };

  const zoomSeguro = (valor) => Math.min(4, Math.max(0.25, Number(valor.toFixed(2))));

  return (
    <div
      ref={raizRef}
      tabIndex={0}
      onPointerDownCapture={() => {
        const raiz = raizRef.current;
        if (raiz && !raiz.contains(document.activeElement)) raiz.focus();
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        outline: 'none',
      }}
    >
      {/* barra de ferramentas */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: pequeno ? 'nowrap' : 'wrap',
          overflowX: pequeno ? 'auto' : 'visible',
          padding: '8px 10px',
          borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
          flexShrink: 0,
        }}
      >
        {FERRAMENTAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFerramenta(item.id)}
            title={item.rotulo}
            style={{
              ...BOTAO,
              color: ferramenta === item.id ? 'var(--c1)' : 'var(--c3)',
              borderColor:
                ferramenta === item.id
                  ? 'color-mix(in srgb, var(--c1) 45%, transparent)'
                  : 'color-mix(in srgb, var(--c2) 16%, transparent)',
              background:
                ferramenta === item.id ? 'color-mix(in srgb, var(--c1) 16%, transparent)' : BOTAO.background,
            }}
          >
            {item.rotulo}
          </button>
        ))}

        <span style={{ width: 1, height: 20, background: 'color-mix(in srgb, var(--c2) 18%, transparent)' }} />

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <button
            type="button"
            onClick={() => setAlvo('traco')}
            title="Cor do traço"
            aria-label="Cor do traço"
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              cursor: 'pointer',
              background: cor,
              border:
                alvo === 'traco'
                  ? '2px solid var(--c1)'
                  : '1px solid color-mix(in srgb, var(--ink-hex) 25%, transparent)',
            }}
          />

          {COM_PREENCHIMENTO.includes(ferramenta) ? (
            <button
              type="button"
              onClick={() => setAlvo('preenchimento')}
              title="Preenchimento da forma"
              aria-label="Preenchimento da forma"
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                cursor: 'pointer',
                background:
                  corFundo === TRANSPARENTE
                    ? 'repeating-conic-gradient(rgba(255,255,255,0.35) 0% 25%, rgba(0,0,0,0.35) 0% 50%) 50% / 8px 8px'
                    : corFundo,
                border:
                  alvo === 'preenchimento'
                    ? '2px solid var(--c1)'
                    : '1px solid color-mix(in srgb, var(--ink-hex) 25%, transparent)',
              }}
            />
          ) : null}

          {CORES.map((tom) => {
            const atual =
              (alvo === 'preenchimento' ? corFundo : cor).toLowerCase() === tom.toLowerCase();
            return (
              <button
                key={tom}
                type="button"
                onClick={() => definirCor(tom)}
                aria-label={`Cor ${tom}`}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  cursor: 'pointer',
                  background: tom,
                  border: atual
                    ? '2px solid var(--c1)'
                    : '1px solid color-mix(in srgb, var(--ink-hex) 25%, transparent)',
                }}
              />
            );
          })}

          <button
            type="button"
            onClick={() => setPainelCor((valor) => !valor)}
            style={{
              ...BOTAO,
              color: painelCor ? 'var(--c1)' : 'var(--c3)',
              borderColor: painelCor
                ? 'color-mix(in srgb, var(--c1) 45%, transparent)'
                : BOTAO.borderColor,
            }}
          >
            Cores
          </button>

          {alvo === 'preenchimento' ? (
            <button
              type="button"
              onClick={() => setCorFundo(TRANSPARENTE)}
              style={{
                ...BOTAO,
                color: corFundo === TRANSPARENTE ? 'var(--c1)' : 'var(--c3)',
              }}
            >
              Sem cor
            </button>
          ) : null}
        </span>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--c2)' }}>
          Traço
          <input
            type="range"
            min="1"
            max="80"
            value={espessura}
            onChange={(evento) => setEspessura(Number(evento.target.value))}
            style={{ width: 74 }}
          />
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--c2)' }}>
          Opacidade
          <input
            type="range"
            min="5"
            max="100"
            value={Math.round(opacidade * 100)}
            onChange={(evento) => setOpacidade(Number(evento.target.value) / 100)}
            style={{ width: 74 }}
          />
        </label>

        <span style={{ width: 1, height: 20, background: 'color-mix(in srgb, var(--c2) 18%, transparent)' }} />

        <button type="button" onClick={() => setZoom((z) => zoomSeguro(z - 0.25))} style={BOTAO} aria-label="Diminuir zoom">
          −
        </button>
        <span style={{ fontSize: 10.5, color: 'var(--c2)', minWidth: 38, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" onClick={() => setZoom((z) => zoomSeguro(z + 0.25))} style={BOTAO} aria-label="Aumentar zoom">
          +
        </button>
        <button type="button" onClick={() => setZoom(selectZoomAjuste(tamanho, areaRef))} style={BOTAO}>
          Ajustar
        </button>

        <span style={{ width: 1, height: 20, background: 'color-mix(in srgb, var(--c2) 18%, transparent)' }} />

        <button
          type="button"
          onClick={desfazer}
          disabled={historia.current.indice < 0}
          style={{ ...BOTAO, opacity: historia.current.indice < 0 ? 0.45 : 1 }}
        >
          Desfazer
        </button>
        <button
          type="button"
          onClick={refazer}
          disabled={historia.current.indice >= historia.current.passos.length - 1}
          style={{
            ...BOTAO,
            opacity: historia.current.indice >= historia.current.passos.length - 1 ? 0.45 : 1,
          }}
        >
          Refazer
        </button>

        <button type="button" onClick={() => setPainelCamadas((v) => !v)} style={BOTAO}>
          Camadas ({camadas.length})
        </button>
        <button type="button" onClick={() => entradaArquivo.current?.click()} style={BOTAO}>
          Abrir imagem
        </button>
        <button type="button" onClick={() => setNovoAberto(true)} style={BOTAO}>
          Novo
        </button>

        <button
          type="button"
          onClick={(evento) => {
            const caixa = evento.currentTarget.getBoundingClientRect();
            setMenu({ x: caixa.right, y: caixa.bottom + 4 });
          }}
          style={{ ...BOTAO, marginLeft: 'auto' }}
          aria-label="Mais opções"
        >
          ⋮
        </button>
      </div>

      {painelCor ? (
        <>
          <div
            onMouseDown={() => setPainelCor(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 24 }}
            aria-hidden="true"
          />
          <div
            style={{
              position: 'fixed',
              top: 62,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              display: 'flex',
              gap: 14,
              padding: 12,
              borderRadius: 12,
              border: '1px solid color-mix(in srgb, var(--c1) 28%, transparent)',
              background: 'color-mix(in srgb, var(--c8) 90%, transparent)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
              fontFamily: 'var(--font-main)',
              maxWidth: 'calc(100vw - 24px)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <RodaCromatica cor={corAtiva} brilho={brilho} onChange={definirCor} />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10,
                  color: 'var(--c2)',
                }}
              >
                Brilho
                <input
                  type="range"
                  min="15"
                  max="100"
                  value={Math.round(brilho * 100)}
                  onChange={(evento) => mudarBrilho(Number(evento.target.value) / 100)}
                  style={{ width: 110 }}
                />
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                width: 158,
                minWidth: 0,
                paddingTop: 2,
              }}
            >
              <span style={{ fontSize: 9, letterSpacing: '0.09em', color: 'var(--c2)' }}>
                {alvo === 'preenchimento' ? 'PREENCHIMENTO' : 'TRAÇO'}
              </span>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: corAtiva,
                    border: '1px solid rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 7,
                    color: contraste(corAtiva),
                  }}
                />
                <span style={{ fontSize: 10.5, color: 'var(--c3)' }}>
                  {corAtiva.toUpperCase()}
                </span>
              </div>

              <span style={{ fontSize: 9, letterSpacing: '0.09em', color: 'var(--c2)' }}>
                PADRÃO
              </span>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {CORES.map((tom) => (
                  <button
                    key={`padrao-${tom}`}
                    type="button"
                    onClick={() => definirCor(tom)}
                    aria-label={`Cor padrão ${tom}`}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      cursor: 'pointer',
                      background: tom,
                      border:
                        (alvo === 'preenchimento' ? corFundo : cor).toLowerCase() ===
                        tom.toLowerCase()
                          ? '2px solid var(--c1)'
                          : '1px solid rgba(0,0,0,0.25)',
                    }}
                  />
                ))}
              </div>

              <span style={{ fontSize: 9, letterSpacing: '0.09em', color: 'var(--c2)' }}>
                SALVAS
              </span>

              <button type="button" onClick={() => salvarCorCustom(corAtiva)} style={BOTAO}>
                Salvar cor
              </button>

              <span style={{ fontSize: 9, lineHeight: 1.4, color: 'var(--c2)', opacity: 0.85 }}>
                Até {LIMITE_CORES_CUSTOM} cores salvas. Passando disso, a mais antiga sai.
              </span>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {coresCustom.map((tom) => (
                  <button
                    key={tom}
                    type="button"
                    onClick={() => definirCor(tom)}
                    aria-label={`Cor salva ${tom}`}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      cursor: 'pointer',
                      background: tom,
                      border: '1px solid rgba(0,0,0,0.25)',
                    }}
                  />
                ))}
                {!coresCustom.length ? (
                  <span style={{ fontSize: 9.5, color: 'var(--c2)' }}>Nenhuma cor salva ainda.</span>
                ) : null}
              </div>

              {alvo === 'preenchimento' ? (
                <button
                  type="button"
                  onClick={() => setCorFundo(TRANSPARENTE)}
                  style={BOTAO}
                >
                  Sem preenchimento
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {/* área do desenho */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
        <div
          ref={areaRef}
          className="glass-scroll"
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            padding: 16,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: tamanho.largura * zoom,
              height: tamanho.altura * zoom,
              flexShrink: 0,
              boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
              background:
                'repeating-conic-gradient(#3b3b46 0% 25%, #2b2b33 0% 50%) 50% / 18px 18px',
            }}
          >
            <canvas
              ref={telaRef}
              width={tamanho.largura}
              height={tamanho.altura}
              onContextMenu={abrirMenu}
              onPointerDown={aoPressionar}
              onPointerMove={aoMover}
              onPointerUp={aoSoltar}
              onPointerLeave={aoSoltar}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
                touchAction: 'none',
                cursor: ferramenta === 'selecionar' ? 'cell' : 'crosshair',
                imageRendering: zoom >= 3 ? 'pixelated' : 'auto',
              }}
            />
            <canvas
              ref={previewRef}
              width={tamanho.largura}
              height={tamanho.altura}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            />
            <canvas
              ref={selecaoRef}
              width={tamanho.largura}
              height={tamanho.altura}
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {painelCamadas ? (
          <div
            className="glass-scroll"
            style={{
              width: pequeno ? 176 : 208,
              flexShrink: 0,
              position: pequeno ? 'absolute' : 'static',
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 6,
              borderLeft: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
              background: 'color-mix(in srgb, var(--c8) 82%, transparent)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              padding: '10px 10px 14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
            }}
          >
            <div style={{ display: 'flex', gap: 5 }}>
              <button type="button" onClick={adicionarCamada} style={{ ...BOTAO, flex: 1 }}>
                + Camada
              </button>
              <button type="button" onClick={duplicarCamada} style={BOTAO} aria-label="Duplicar camada">
                ⧉
              </button>
            </div>

            {[...camadas].reverse().map((camada) => (
              <div
                key={camada.id}
                onClick={() => setAtivaId(camada.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  padding: '7px 8px',
                  borderRadius: 9,
                  border: `1px solid ${
                    camada.id === camadaAtiva?.id
                      ? 'color-mix(in srgb, var(--c1) 45%, transparent)'
                      : 'color-mix(in srgb, var(--c2) 12%, transparent)'
                  }`,
                  background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={(evento) => {
                      evento.stopPropagation();
                      alternarVisivel(camada.id);
                    }}
                    aria-label={camada.visivel ? 'Esconder camada' : 'Mostrar camada'}
                    style={{ ...BOTAO, height: 22, minWidth: 24, padding: '0 5px', fontSize: 10 }}
                  >
                    {camada.visivel ? '◉' : '○'}
                  </button>
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
                    {camada.nome}
                  </span>
                  <button
                    type="button"
                    onClick={(evento) => {
                      evento.stopPropagation();
                      removerCamada(camada.id);
                    }}
                    aria-label="Apagar camada"
                    style={{ ...BOTAO, height: 22, minWidth: 24, padding: '0 5px', fontSize: 10 }}
                  >
                    <CloseIcon size={10} />
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(camada.opacidade * 100)}
                  onClick={(evento) => evento.stopPropagation()}
                  onChange={(evento) => mudarOpacidadeCamada(camada.id, Number(evento.target.value) / 100)}
                  style={{ width: '100%' }}
                  aria-label={`Opacidade da camada ${camada.nome}`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <input
        ref={entradaArquivo}
        type="file"
        accept="image/*"
        onChange={(evento) => abrirImagem(evento.target.files?.[0])}
        style={{ display: 'none' }}
      />

      {menu ? (
        <MenuFlutuante x={menu.x} y={menu.y} itens={itensMenu} onFechar={() => setMenu(null)} />
      ) : null}

      {confirmarLimpar ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9400,
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
            if (evento.target === evento.currentTarget) setConfirmarLimpar(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Limpar tudo" style={{ ...MODAL_CAIXA, width: 380 }}>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12.5,
                  letterSpacing: '0.04em',
                  color: 'var(--c1)',
                }}
              >
                LIMPAR TUDO
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--c2)', lineHeight: 1.5 }}>
                Isso apaga todas as camadas do desenho atual. Não dá pra desfazer depois.
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
                <button type="button" onClick={() => setConfirmarLimpar(false)} style={BOTAO}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={limparTudo}
                  style={{
                    ...BOTAO,
                    color: 'var(--erro)',
                    borderColor: 'color-mix(in srgb, var(--erro) 40%, transparent)',
                  }}
                >
                  Limpar tudo
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {novoAberto ? (
        <NovoDesenho
          inicial={tamanho}
          onFechar={() => setNovoAberto(false)}
          onCriar={(largura, altura) => {
            reiniciar(largura, altura);
            setNovoAberto(false);
          }}
        />
      ) : null}

      {envio ? (
        <EnviarDesenhoModal
          blob={envio.blob}
          nome="desenho"
          onFechar={() => setEnvio(null)}
          onEnviado={(destino) => avisar(`Desenho enviado para ${destino}`)}
        />
      ) : null}

      {Aviso}
    </div>
  );
}

/* Ajusta o zoom para o desenho caber na área visível. */
function selectZoomAjuste(tamanho, areaRef) {
  const area = areaRef.current;
  if (!area) return 1;
  const escala = Math.min(
    (area.clientWidth - 32) / tamanho.largura,
    (area.clientHeight - 32) / tamanho.altura
  );
  if (!Number.isFinite(escala) || escala <= 0) return 1;
  return Math.min(4, Math.max(0.25, Number(escala.toFixed(2))));
}

/* Diálogo de desenho novo: largura e altura em pixels. */
function NovoDesenho({ inicial, onFechar, onCriar }) {
  const [largura, setLargura] = useState(inicial?.largura || 900);
  const [altura, setAltura] = useState(inicial?.altura || 620);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar]);

  const campo = {
    width: 84,
    height: 28,
    padding: '0 8px',
    borderRadius: 7,
    border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
    background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
    color: 'var(--c3)',
    fontFamily: 'var(--font-main)',
    fontSize: 11.5,
    outline: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9400,
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
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Novo desenho" style={{ ...MODAL_CAIXA, width: 360 }}>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12.5,
              letterSpacing: '0.04em',
              color: 'var(--c1)',
            }}
          >
            NOVO DESENHO
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 10.5, color: 'var(--c2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Largura
              <input
                type="number"
                min="64"
                max="4000"
                value={largura}
                onChange={(evento) => setLargura(Number(evento.target.value))}
                style={campo}
              />
            </label>
            <label style={{ fontSize: 10.5, color: 'var(--c2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Altura
              <input
                type="number"
                min="64"
                max="4000"
                value={altura}
                onChange={(evento) => setAltura(Number(evento.target.value))}
                style={campo}
              />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button type="button" onClick={onFechar} style={BOTAO}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onCriar(Math.min(4000, Math.max(64, largura)), Math.min(4000, Math.max(64, altura)))}
              style={{ ...BOTAO, color: 'var(--c1)' }}
            >
              Criar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
