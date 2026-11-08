import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import {
  PETS_DISPONIVEIS,
  TIPOS_REACAO,
  frasesDe,
  petValido,
  tipoReacaoValido,
} from '@/lib/pets';

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

const campo = {
  width: '100%',
  padding: '6px 9px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11.5,
  outline: 'none',
  boxSizing: 'border-box',
};

const botaoNeutro = {
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--c2) 18%, transparent)',
  background: 'transparent',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 10.5,
  cursor: 'pointer',
};

const aba = (ativo) => ({
  padding: '6px 11px',
  borderRadius: 8,
  border: `1px solid color-mix(in srgb, var(--c1) ${ativo ? '55%' : '16%'}, transparent)`,
  background: ativo ? 'color-mix(in srgb, var(--c1) 18%, transparent)' : 'transparent',
  color: ativo ? 'var(--c1)' : 'var(--c2)',
  fontFamily: 'var(--font-main)',
  fontSize: 10.5,
  fontWeight: ativo ? 700 : 400,
  cursor: 'pointer',
});

/**
 * Reações dos pets, no menu de admin.
 *
 * Cada pet tem dois conjuntos: o do clique normal e o do carinho. O que for
 * gravado aqui vale para todo mundo (é a personalidade do bicho, não do
 * usuário). Enquanto um conjunto estiver vazio, valem as frases de fábrica do
 * código, que aparecem listadas em cinza como referência.
 */
export default function PetReacoesModal({ onFechar, onSalvo }) {
  const [pet, setPet] = useState('gato');
  const [tipo, setTipo] = useState('clique');
  const [linhas, setLinhas] = useState([]);
  const [removidas, setRemovidas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const lista = asList(await base44.entities.PetReacao.list('created_date', 500, 0));
        if (!vivo) return;
        setLinhas(
          lista.map((registro) => ({
            id: registro.id,
            pet: petValido(registro.pet),
            tipo: tipoReacaoValido(registro.tipo),
            texto: registro.texto || '',
            original: registro.texto || '',
          }))
        );
      } catch (falha) {
        console.warn('[Pet] não consegui ler as reações:', falha?.message || falha);
        if (vivo) setErro('A entidade PetReacao ainda não está publicada no Builder.');
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const doConjunto = useMemo(
    () => linhas.filter((linha) => linha.pet === pet && linha.tipo === tipo),
    [linhas, pet, tipo]
  );

  const padrao = frasesDe(pet, tipo, {});
  const mexido = useMemo(
    () =>
      removidas.length > 0 ||
      linhas.some((linha) => linha.id && linha.texto.trim() !== linha.original) ||
      linhas.some((linha) => !linha.id && linha.texto.trim()),
    [linhas, removidas]
  );

  const adicionar = () => {
    setLinhas((atuais) => [...atuais, { id: null, pet, tipo, texto: '', original: '' }]);
  };

  const mudarTexto = (indice, texto) => {
    setLinhas((atuais) => atuais.map((linha, i) => (i === indice ? { ...linha, texto } : linha)));
  };

  const excluir = (indice) => {
    setLinhas((atuais) => {
      const linha = atuais[indice];
      if (linha?.id) setRemovidas((lista) => [...lista, linha.id]);
      return atuais.filter((_, i) => i !== indice);
    });
  };

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      const vazias = linhas.filter((linha) => !linha.id && !linha.texto.trim());
      if (vazias.length) {
        setLinhas((atuais) => atuais.filter((linha) => linha.id || linha.texto.trim()));
      }
      for (const id of removidas) {
        await base44.entities.PetReacao.delete(id);
      }
      for (const linha of linhas) {
        const texto = linha.texto.trim();
        if (!texto) continue;
        if (!linha.id) {
          await base44.entities.PetReacao.create({ pet: linha.pet, tipo: linha.tipo, texto });
        } else if (texto !== linha.original) {
          await base44.entities.PetReacao.update(linha.id, { texto });
        }
      }
      setRemovidas([]);
      onSalvo?.();
      onFechar();
    } catch (falha) {
      console.warn('[Pet] salvar reações', falha);
      setErro('Não consegui salvar agora. Confira se a entidade PetReacao está publicada.');
    } finally {
      setSalvando(false);
    }
  };

  const indiceDe = (linha) => linhas.indexOf(linha);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9950,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        fontFamily: 'var(--font-main)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !salvando) onFechar();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Reações dos pets" style={{ ...MODAL_CAIXA, width: 520 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 12.5,
                letterSpacing: '0.04em',
                color: 'var(--c1)',
              }}
            >
              REAÇÕES DO PET
            </span>
            <span style={{ fontSize: 10, color: 'var(--c2)' }}>
              O que cada bicho fala, para todo mundo no sistema
            </span>
          </div>
          <button type="button" onClick={onFechar} disabled={salvando} style={botaoNeutro}>
            Fechar
          </button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PETS_DISPONIVEIS.filter((item) => item.id !== 'nenhum').map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPet(item.id)}
                style={aba(pet === item.id)}
              >
                {item.nome}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TIPOS_REACAO.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTipo(item.id)}
                style={aba(tipo === item.id)}
                title={item.dica}
              >
                {item.nome}
              </button>
            ))}
          </div>

          {erro ? <span style={{ fontSize: 10, color: 'var(--erro)' }}>{erro}</span> : null}

          <div
            className="glass-scroll"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: '46vh',
              overflowY: 'auto',
              paddingRight: 4,
            }}
          >
            {carregando ? (
              <span style={{ fontSize: 10.5, color: 'var(--c2)' }}>Lendo as reações…</span>
            ) : null}

            {!carregando && !doConjunto.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--c2)' }}>
                  Nenhuma reação própria ainda. Ele está usando estas de fábrica:
                </span>
                {padrao.map((texto) => (
                  <span
                    key={texto}
                    style={{
                      fontSize: 10.5,
                      color: 'color-mix(in srgb, var(--c2) 80%, transparent)',
                      paddingLeft: 2,
                    }}
                  >
                    {texto}
                  </span>
                ))}
                <span style={{ fontSize: 9.5, color: 'color-mix(in srgb, var(--c2) 65%, transparent)' }}>
                  Ao adicionar a primeira, as de fábrica deixam de valer.
                </span>
              </div>
            ) : null}

            {doConjunto.map((linha) => (
              <div key={linha.id || `nova-${indiceDe(linha)}`} style={{ display: 'flex', gap: 6 }}>
                <input
                  value={linha.texto}
                  onChange={(evento) => mudarTexto(indiceDe(linha), evento.target.value)}
                  maxLength={120}
                  placeholder="O que ele fala"
                  style={campo}
                />
                <button
                  type="button"
                  onClick={() => excluir(indiceDe(linha))}
                  title="Excluir reação"
                  style={{ ...botaoNeutro, padding: '6px 9px', color: 'var(--erro)' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button type="button" onClick={adicionar} style={botaoNeutro} disabled={carregando}>
              + Adicionar reação
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando || !mexido}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--c1) 55%, transparent)',
                background: 'color-mix(in srgb, var(--c1) 20%, transparent)',
                color: 'var(--c1)',
                fontFamily: 'var(--font-main)',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: salvando || !mexido ? 'default' : 'pointer',
                opacity: salvando || !mexido ? 0.55 : 1,
              }}
            >
              {salvando ? 'Salvando…' : 'Salvar reações'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
