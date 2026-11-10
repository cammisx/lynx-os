/**
 * Aba Desempenho das Configurações.
 *
 * O interruptor mestre liga tudo de uma vez; os itens abaixo dizem o que cada
 * um tira. A escolha é do aparelho (o PC fraco é o PC) e é salva na hora, sem
 * botão de confirmar, como tema e fonte.
 */
import { ITENS, lerDesempenho, modoLeveLigado } from '@/lib/desempenho';
import { Interruptor } from '@/components/config/BlocoSom';

const rotuloStyle = {
  display: 'block',
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
  opacity: 0.8,
  marginBottom: 4,
};

const dicaStyle = {
  display: 'block',
  fontSize: 10.5,
  lineHeight: 1.5,
  color: 'var(--c2)',
  opacity: 0.9,
};

function Linha({ rotulo, dica, ligado, aoMudar, rotuloInterruptor }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
        background: 'color-mix(in srgb, var(--c8) 40%, transparent)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--c3)' }}>
          {rotulo}
        </span>
        <span style={{ ...dicaStyle, fontSize: 10 }}>{dica}</span>
      </div>
      <Interruptor ligado={ligado} onMudar={aoMudar} rotulo={rotuloInterruptor || rotulo} />
    </div>
  );
}

export default function BlocoDesempenho({ perfil = {}, onSalvar }) {
  const desligados = lerDesempenho(perfil.desempenho);
  const leve = modoLeveLigado(desligados);

  const mudar = (id, ligado) => {
    const proximo = ligado
      ? [...desligados, id]
      : desligados.filter((item) => item !== id);
    onSalvar({ desempenho: proximo.join(',') });
  };

  const mudarTudo = (ligado) => {
    onSalvar({ desempenho: ligado ? ITENS.map((item) => item.id).join(',') : '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 11px',
          borderRadius: 11,
          border: '1px solid color-mix(in srgb, var(--c1) 34%, transparent)',
          background: 'color-mix(in srgb, var(--c1) 9%, transparent)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--c1)' }}>
            Modo leve
          </span>
          <span style={{ ...dicaStyle, fontSize: 10 }}>
            Liga tudo de uma vez para o computador respirar. Depois dá para voltar item por item.
          </span>
        </div>
        <Interruptor ligado={leve} onMudar={mudarTudo} rotulo="Ligar ou desligar o modo leve" />
      </div>

      <div>
        <span style={rotuloStyle}>O que aliviar</span>
        <span style={dicaStyle}>
          Cada item desligado tira um peso. Vale só neste aparelho, então o celular continua completo.
        </span>
      </div>

      {ITENS.map((item) => (
        <Linha
          key={item.id}
          rotulo={item.rotulo}
          dica={item.dica}
          ligado={desligados.includes(item.id)}
          aoMudar={(ligado) => mudar(item.id, ligado)}
        />
      ))}

      <span style={{ ...dicaStyle, fontSize: 10 }}>
        A seda do fundo (animada, parada ou sem) fica na aba Preferências, e o som das notificações na
        aba Notificações.
      </span>
    </div>
  );
}
