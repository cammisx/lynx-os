import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import GlassSelect from '@/components/GlassSelect';
import { useIsMobile } from '@/hooks/use-mobile';

const rotulo = {
  fontSize: 9.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--c2)',
};

const campo = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  outline: 'none',
  boxSizing: 'border-box',
};

const MOTIVOS = [
  { value: 'Desligamento', label: 'Desligamento' },
  { value: 'Abandono do posto', label: 'Abandono do posto' },
  { value: 'Fim de contrato', label: 'Fim de contrato' },
  { value: 'Mudança de função', label: 'Mudança de função' },
  { value: 'Outro', label: 'Outro motivo' },
];

/**
 * Tirar o acesso de alguém: sai das modelos, perde a ficha, os turnos futuros
 * são cancelados com motivo e o usuário é apagado da lista do app.
 */
export default function ModalExcluirAcesso({ usuario, onFechar, onConfirmar }) {
  const pequeno = useIsMobile();
  const [motivo, setMotivo] = useState('Desligamento');
  const [detalhe, setDetalhe] = useState('');
  const [erro, setErro] = useState('');
  const [removendo, setRemovendo] = useState(false);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape' && !removendo) onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar, removendo]);

  const confirmar = async () => {
    if (removendo) return;
    const texto = detalhe.trim();
    if (motivo === 'Outro' && !texto) {
      setErro('Escreva o motivo.');
      return;
    }
    setErro('');
    setRemovendo(true);
    const resultado = await onConfirmar(texto ? `${motivo}: ${texto}` : motivo);
    setRemovendo(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }
    onFechar();
  };

  const nome = usuario?.nome_exibicao || usuario?.full_name || usuario?.email || 'esta pessoa';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 14000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        background: 'rgba(0,0,0,0.42)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !removendo) onFechar();
      }}
    >
      <div style={{ ...MODAL_CAIXA, width: pequeno ? '100%' : 440 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--erro)' }}>Remover acesso</span>
          <button
            type="button"
            onClick={onFechar}
            disabled={removendo}
            aria-label="Fechar"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              fontSize: 13,
              cursor: removendo ? 'default' : 'pointer',
              padding: 2,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
          <span style={{ fontSize: 11, color: 'var(--c3)', lineHeight: 1.55 }}>
            <strong>{nome}</strong> sai de todas as modelos, perde a ficha e o cadastro, e os turnos futuros
            são cancelados com o motivo abaixo. O histórico de ponto continua.
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Motivo</span>
            <GlassSelect value={motivo} onChange={setMotivo} options={MOTIVOS} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>{motivo === 'Outro' ? 'Descreva o motivo' : 'Detalhe (opcional)'}</span>
            <textarea
              value={detalhe}
              onChange={(evento) => setDetalhe(evento.target.value)}
              rows={3}
              placeholder="Fica registrado no cancelamento dos turnos"
              style={{ ...campo, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          {erro ? <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{erro}</span> : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
            <button
              type="button"
              onClick={onFechar}
              disabled={removendo}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
                background: 'transparent',
                color: 'var(--c3)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                cursor: removendo ? 'default' : 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={removendo}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--erro) 55%, transparent)',
                background: 'color-mix(in srgb, var(--erro) 18%, transparent)',
                color: 'var(--erro)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: removendo ? 'default' : 'pointer',
                opacity: removendo ? 0.7 : 1,
              }}
            >
              {removendo ? 'Removendo…' : 'Remover acesso'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
