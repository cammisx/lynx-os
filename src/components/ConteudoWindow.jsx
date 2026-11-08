import { useState } from 'react';
import Window from '@/components/Window';
import { ImageIcon } from '@/components/icons';
import useConteudos from '@/hooks/useConteudos';
import { nomeDoConteudo } from '@/lib/conteudos';
import ModalTabelaPrecos from '@/components/conteudo/ModalTabelaPrecos';

const escuro = (valor) => `color-mix(in srgb, var(--c2) ${valor}%, transparent)`;
const dourado = (valor) => `color-mix(in srgb, var(--c1) ${valor}%, transparent)`;

/* Janela de Conteúdo: uma parte por modelo, igual ao playbook. A tabela de
   preços já mora aqui; o resto do conteúdo ainda está sendo definido. */
export default function ConteudoWindow({ onClose }) {
  const { conteudos, carregando, erro, admin, recarregar } = useConteudos();
  const [ativoId, setAtivoId] = useState(null);
  const [tabelaAberta, setTabelaAberta] = useState(false);

  const ativo = conteudos.find((item) => item.id === ativoId) || conteudos[0] || null;

  return (
    <Window title="Conteúdo" icon={ImageIcon} onClose={onClose} width={820} height={560}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0, gap: 0 }}>
        {/* Uma entrada por modelo que a pessoa pode ver. */}
        <div
          className="glass-scroll"
          style={{
            width: 196,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '2px 10px 10px 2px',
            overflowY: 'auto',
            borderRight: `1px solid ${escuro(14)}`,
          }}
        >
          {carregando && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.7 }}>Carregando…</span>
          )}

          {!carregando && !conteudos.length && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.5 }}>
              Nenhum conteúdo liberado para você ainda.
            </span>
          )}

          {conteudos.map((conteudo) => {
            const escolhido = ativo?.id === conteudo.id;
            return (
              <button
                key={conteudo.id}
                type="button"
                onClick={() => setAtivoId(conteudo.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 1,
                  width: '100%',
                  padding: '7px 9px',
                  borderRadius: 8,
                  textAlign: 'left',
                  border: `1px solid ${escolhido ? dourado(50) : escuro(12)}`,
                  background: escolhido ? dourado(12) : 'color-mix(in srgb, var(--c8) 40%, transparent)',
                  color: escolhido ? 'var(--c1)' : 'var(--c3)',
                  fontFamily: 'var(--font-main)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 10.5, fontWeight: escolhido ? 700 : 500 }}>
                  {nomeDoConteudo(conteudo)}
                </span>
                <span style={{ fontSize: 8.5, opacity: 0.7, letterSpacing: '0.05em' }}>
                  MODELO
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="glass-scroll"
          style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '2px 4px 10px 16px' }}
        >
          {erro ? (
            <span style={{ fontSize: 11, color: 'var(--erro)' }}>{erro}</span>
          ) : ativo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c3)' }}>
                  {nomeDoConteudo(ativo)}
                </span>
                <button
                  type="button"
                  onClick={() => setTabelaAberta(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 11px',
                    borderRadius: 8,
                    border: '1px solid color-mix(in srgb, var(--c1) 40%, transparent)',
                    background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
                    color: 'var(--c1)',
                    fontFamily: 'var(--font-main)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Tabela de preços
                </button>
              </div>

              <div
                style={{
                  minHeight: 260,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: 24,
                  textAlign: 'center',
                  borderRadius: 12,
                  border: '1px dashed color-mix(in srgb, var(--c1) 22%, transparent)',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    color: 'var(--c1)',
                    background: 'color-mix(in srgb, var(--c1) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--c1) 26%, transparent)',
                  }}
                >
                  <ImageIcon size={20} />
                </span>
                <span style={{ fontSize: 12, color: 'var(--c2)', maxWidth: 320 }}>
                  Nada por aqui ainda.
                </span>
              </div>
            </div>
          ) : (
            !carregando && (
              <span style={{ fontSize: 11, color: 'var(--c2)', opacity: 0.7 }}>
                Escolha uma modelo na lista ao lado.
              </span>
            )
          )}
        </div>
      </div>

      {tabelaAberta && ativo ? (
        <ModalTabelaPrecos
          conteudo={ativo}
          admin={admin}
          onFechar={() => setTabelaAberta(false)}
          onSalvo={recarregar}
        />
      ) : null}
    </Window>
  );
}
