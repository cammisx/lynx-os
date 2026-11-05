import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Window from '@/components/Window';
import { MoneyIcon } from '@/components/icons';
import ImportarExtrato from '@/components/financeiro/ImportarExtrato';
import RelatorioFinanceiro from '@/components/financeiro/RelatorioFinanceiro';
import VendasLista from '@/components/financeiro/VendasLista';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const ABAS = [
  { id: 'importar', label: 'Importar extrato' },
  { id: 'relatorio', label: 'Relatório' },
  { id: 'vendas', label: 'Vendas' },
];

export default function FinanceiroWindow({ onClose }) {
  const [aba, setAba] = useState('importar');
  const [modelos, setModelos] = useState([]);
  const [chatters, setChatters] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    Promise.all([
      base44.entities.Modelo.list().catch(() => []),
      base44.entities.Chatter.list().catch(() => []),
    ]).then(([listaModelos, listaChatters]) => {
      if (!ativo) return;
      setModelos(asList(listaModelos));
      setChatters(asList(listaChatters));
      if (!asList(listaModelos).length) {
        setErro('Não consegui carregar as modelos. Confere as permissões do Financeiro.');
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <Window title="Financeiro" icon={MoneyIcon} onClose={onClose} width={860} height={600}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)', paddingBottom: 8 }}>
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
                  transition: 'background-color 150ms ease',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {erro && <span style={{ fontSize: 11.5, color: '#ff6b6b' }}>{erro}</span>}

        <div style={{ flex: 1, minHeight: 0 }}>
          {aba === 'importar' && <ImportarExtrato modelos={modelos} chatters={chatters} />}
          {aba === 'relatorio' && <RelatorioFinanceiro modelos={modelos} chatters={chatters} />}
          {aba === 'vendas' && (
            <VendasLista modelos={modelos} chatters={chatters} />
          )}
        </div>
      </div>
    </Window>
  );
}
