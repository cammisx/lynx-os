import { useRef, useState } from 'react';
import MenuFlutuante from '@/components/desktop/MenuFlutuante';
import { itemChamarPixie } from '@/lib/pixie';
import useAviso from '@/components/ui/Aviso';
import EnviarDesenhoModal from '@/components/paint/EnviarDesenhoModal';
import { baixarJpg, urlParaBlob } from '@/lib/paint';

/**
 * Desenho fixado na área de trabalho.
 *
 * Arrasta pelo desenho, redimensiona pelas bordas e cantos, e o botão direito
 * abre o mesmo menu do editor, com "desafixar" no lugar de "fixar".
 */

const MIN = 120;
const ALCAS = [
  { dir: 'n', style: { top: -3, left: 10, right: 10, height: 7 }, cursor: 'ns-resize' },
  { dir: 's', style: { bottom: -3, left: 10, right: 10, height: 7 }, cursor: 'ns-resize' },
  { dir: 'w', style: { left: -3, top: 10, bottom: 10, width: 7 }, cursor: 'ew-resize' },
  { dir: 'e', style: { right: -3, top: 10, bottom: 10, width: 7 }, cursor: 'ew-resize' },
  { dir: 'nw', style: { top: -3, left: -3, width: 14, height: 14 }, cursor: 'nwse-resize' },
  { dir: 'ne', style: { top: -3, right: -3, width: 14, height: 14 }, cursor: 'nesw-resize' },
  { dir: 'sw', style: { bottom: -3, left: -3, width: 14, height: 14 }, cursor: 'nesw-resize' },
  { dir: 'se', style: { bottom: -3, right: -3, width: 14, height: 14 }, cursor: 'nwse-resize' },
];

const limitar = (valor, minimo, maximo) => Math.min(Math.max(minimo, valor), Math.max(minimo, maximo));

/* O registro no banco guarda a imagem em `desenho_url`; `url` é o formato
   antigo de quem foi fixado antes da mudança para o banco. */
const imagemDe = (desenho) => desenho?.desenho_url || desenho?.url || '';

export default function DesenhoFixo({ desenho, onMover, onRedimensionar, onDesafixar }) {
  const { avisar, Aviso } = useAviso();
  const [menu, setMenu] = useState(null);
  const [envio, setEnvio] = useState(null);
  const [arrastando, setArrastando] = useState(false);
  const caixaRef = useRef(null);
  const movimento = useRef(null);

  const salvar = async () => {
    try {
      await baixarJpg(imagemDe(desenho), desenho.nome || 'desenho');
      avisar('Desenho salvo em .jpg');
    } catch (falha) {
      console.warn('[Desenho] salvar', falha);
      avisar('Não consegui salvar o desenho agora.');
    }
  };

  const prepararEnvio = async () => {
    try {
      const blob = await urlParaBlob(imagemDe(desenho));
      setEnvio({ blob });
    } catch (falha) {
      console.warn('[Desenho] enviar', falha);
      avisar('Não consegui preparar o desenho para envio.');
    }
  };

  /* Arrastar move; as alças redimensionam. Guarda no fim do gesto. */
  const comecar = (evento, alca = 'mover') => {
    if (evento.button === 2) return;
    evento.preventDefault();
    evento.stopPropagation();
    caixaRef.current?.setPointerCapture?.(evento.pointerId);
    movimento.current = {
      alca,
      x: evento.clientX,
      y: evento.clientY,
      esquerda: desenho.pos_x || 0,
      topo: desenho.pos_y || 0,
      largura: desenho.largura,
      altura: desenho.altura,
    };
    setArrastando(true);
  };

  const mover = (evento) => {
    const dados = movimento.current;
    const caixa = caixaRef.current;
    if (!dados || !caixa) return;
    const dx = evento.clientX - dados.x;
    const dy = evento.clientY - dados.y;
    const teto = window.innerHeight - 60;

    let { esquerda, topo, largura, altura } = dados;

    if (dados.alca === 'mover') {
      esquerda = limitar(dados.esquerda + dx, -largura + 40, window.innerWidth - 40);
      topo = limitar(dados.topo + dy, 0, teto);
    } else {
      if (dados.alca.includes('e')) largura = Math.max(MIN, dados.largura + dx);
      if (dados.alca.includes('s')) altura = Math.max(MIN, dados.altura + dy);
      if (dados.alca.includes('w')) {
        largura = Math.max(MIN, dados.largura - dx);
        esquerda = dados.esquerda + (dados.largura - largura);
      }
      if (dados.alca.includes('n')) {
        altura = Math.max(MIN, dados.altura - dy);
        topo = dados.topo + (dados.altura - altura);
      }
    }

    caixa.style.left = `${esquerda}px`;
    caixa.style.top = `${topo}px`;
    caixa.style.width = `${largura}px`;
    caixa.style.height = `${altura}px`;
  };

  const terminar = () => {
    const dados = movimento.current;
    const caixa = caixaRef.current;
    movimento.current = null;
    setArrastando(false);
    if (!dados || !caixa) return;
    const proximo = {
      x: Number.parseFloat(caixa.style.left) || desenho.pos_x || 0,
      y: Number.parseFloat(caixa.style.top) || desenho.pos_y || 0,
      largura: Number.parseFloat(caixa.style.width) || desenho.largura,
      altura: Number.parseFloat(caixa.style.height) || desenho.altura,
    };
    if (Math.round(proximo.largura) !== Math.round(desenho.largura) ||
        Math.round(proximo.altura) !== Math.round(desenho.altura)) {
      onRedimensionar(proximo.largura, proximo.altura);
    }
    onMover(proximo.x, proximo.y);
  };

  const itens = [
    { id: 'salvar', rotulo: 'Salvar (.jpg)', acao: salvar },
    { id: 'enviar', rotulo: 'Enviar para…', acao: prepararEnvio },
    { separador: true },
    { id: 'desafixar', rotulo: 'Desafixar da área de trabalho', perigo: true, acao: onDesafixar },
    { separador: true },
    itemChamarPixie({ alvo: caixaRef.current }),
  ];

  return (
    <>
      <div
        ref={caixaRef}
        onPointerDown={(evento) => comecar(evento, 'mover')}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        onContextMenu={(evento) => {
          evento.preventDefault();
          evento.stopPropagation();
          setMenu({ x: evento.clientX, y: evento.clientY });
        }}
        style={{
          position: 'fixed',
          left: desenho.pos_x || 0,
          top: desenho.pos_y || 0,
          width: desenho.largura,
          height: desenho.altura,
          zIndex: 600,
          borderRadius: 10,
          overflow: 'visible',
          cursor: arrastando ? 'grabbing' : 'grab',
          boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
          border: '1px solid color-mix(in srgb, var(--c1) 24%, transparent)',
          background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
          touchAction: 'none',
        }}
      >
        <img
          src={imagemDe(desenho)}
          alt={desenho.nome || 'Desenho fixado'}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            borderRadius: 9,
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />

        {ALCAS.map((alca) => (
          <span
            key={alca.dir}
            onPointerDown={(evento) => comecar(evento, alca.dir)}
            style={{
              position: 'absolute',
              ...alca.style,
              cursor: alca.cursor,
              borderRadius: 4,
            }}
          />
        ))}
      </div>

      {menu ? (
        <MenuFlutuante x={menu.x} y={menu.y} itens={itens} onFechar={() => setMenu(null)} />
      ) : null}

      {envio ? (
        <EnviarDesenhoModal
          blob={envio.blob}
          nome={desenho.nome || 'desenho'}
          onFechar={() => setEnvio(null)}
          onEnviado={(destino) => avisar(`Desenho enviado para ${destino}`)}
        />
      ) : null}

      {Aviso}
    </>
  );
}
