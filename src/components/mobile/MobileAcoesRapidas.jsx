import { useState } from 'react';
import RegistrarVendaModal from '@/components/vendas/RegistrarVendaModal';
import SolicitarFolgaModal from '@/components/solicitacoes/SolicitarFolgaModal';
import AjustePontoModal from '@/components/solicitacoes/AjustePontoModal';
import { CoffeeIcon, GiftIcon, SlidersIcon } from '@/components/icons';

/**
 * Ações rápidas da home do celular.
 *
 * No desktop elas moram dentro do widget Turno (Mimo · Folga · Ponto) e no
 * widget Páginas. Aqui ficam soltas na home, porque no celular ninguém vai
 * caçar widget: é o primeiro lugar depois do resumo do dia.
 * Páginas saiu daqui: ela virou o cartão de status logo abaixo do shift.
 */

const ACOES = [
  { id: 'venda', rotulo: 'Mimo / venda', Icone: GiftIcon },
  { id: 'folga', rotulo: 'Folga', Icone: CoffeeIcon },
  { id: 'ponto', rotulo: 'Ajuste de ponto', Icone: SlidersIcon },
];

export default function MobileAcoesRapidas({ user }) {
  const [aberta, setAberta] = useState(null);

  const fechar = () => setAberta(null);

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {ACOES.map((acao) => {
          const Icone = acao.Icone;
          return (
            <button
              key={acao.id}
              type="button"
              onClick={() => setAberta(acao.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 6,
                padding: '10px 3px 9px',
                borderRadius: 14,
                border: '1px solid color-mix(in srgb, var(--c1) 14%, transparent)',
                background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
                color: 'var(--c2)',
                fontFamily: 'inherit',
                minHeight: 70,
              }}
            >
              <span style={{ color: 'var(--c1)', display: 'flex' }}>
                <Icone size={20} />
              </span>
              <span style={{ fontSize: 9.5, lineHeight: 1.25, textAlign: 'center', letterSpacing: '0.01em' }}>
                {acao.rotulo}
              </span>
            </button>
          );
        })}
      </div>

      {aberta === 'venda' && (
        <RegistrarVendaModal
          usuario={user}
          modeloPadraoId=""
          onClose={fechar}
          onSaved={fechar}
        />
      )}

      {aberta === 'folga' && (
        <SolicitarFolgaModal usuario={user} onClose={fechar} onSaved={fechar} />
      )}

      {aberta === 'ponto' && (
        <AjustePontoModal usuario={user} onClose={fechar} onSaved={fechar} />
      )}
    </>
  );
}
