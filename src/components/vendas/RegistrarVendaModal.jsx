import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { CloseIcon, ImageIcon } from '@/components/icons';
import GlassSelect from '@/components/GlassSelect';
import parsePrivacy from '@/lib/privacyParser';
import { emitNotificationsChanged } from '@/lib/desktopEvents';
import notificarAdminsSolicitacao from '@/lib/solicitacoes';
import { moedaLabel, quandoLabel } from '@/lib/vendas';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const AREA_TEXTO = {
  width: '100%',
  boxSizing: 'border-box',
  height: 116,
  resize: 'none',
  background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
  border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
  borderRadius: 8,
  color: 'var(--c3)',
  fontSize: 12,
  lineHeight: 1.5,
  padding: '8px 10px',
  fontFamily: 'var(--font-main)',
  outline: 'none',
};

const BOTAO = {
  height: 30,
  padding: '0 14px',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-main)',
  cursor: 'pointer',
};

const rotulo = { fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c2)' };

export default function RegistrarVendaModal({ usuario, modeloPadraoId = '', onClose, onSaved }) {
  const [texto, setTexto] = useState('');
  const [modelos, setModelos] = useState([]);
  const [modeloId, setModeloId] = useState(modeloPadraoId);
  const [observacao, setObservacao] = useState('');
  const [print, setPrint] = useState(null);
  const [enviandoPrint, setEnviandoPrint] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const inputArquivo = useRef(null);

  useEffect(() => {
    let ativo = true;
    base44.entities.Modelo.list('-created_date', 200)
      .then((result) => {
        if (!ativo) return;
        const lista = asList(result).filter((model) => !model.arquivada);
        setModelos(lista);
        setModeloId((atual) => {
          if (atual && lista.some((model) => model.id === atual)) return atual;
          if (modeloPadraoId && lista.some((model) => model.id === modeloPadraoId)) {
            return modeloPadraoId;
          }
          return lista[0]?.id || '';
        });
      })
      .catch(() => setModelos([]));
    return () => {
      ativo = false;
    };
  }, [modeloPadraoId]);

  const leitura = useMemo(() => parsePrivacy(texto), [texto]);
  const itens = leitura.itens;

  const enviarArquivo = useCallback(async (file) => {
    if (!file || enviandoPrint) return;
    if (!file.type.startsWith('image/')) {
      setErro('O print precisa ser uma imagem.');
      return;
    }
    setErro('');
    setEnviandoPrint(true);
    try {
      const resposta = await base44.integrations.Core.UploadFile({ file });
      if (!resposta?.file_url) throw new Error('O upload não devolveu o arquivo.');
      setPrint({ url: resposta.file_url, nome: file.name || 'print.png' });
    } catch (error) {
      setErro(error?.message || 'Não consegui enviar o print.');
    } finally {
      setEnviandoPrint(false);
    }
  }, [enviandoPrint]);

  // Ctrl+V em qualquer lugar do modal: imagem vira upload, texto vai pro campo.
  useEffect(() => {
    const handlePaste = (event) => {
      const itensColados = Array.from(event.clipboardData?.items || []);
      const imagem = itensColados.find((item) => item.type.startsWith('image/'));
      if (!imagem) return;
      const file = imagem.getAsFile();
      if (!file) return;
      event.preventDefault();
      enviarArquivo(file);
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [enviarArquivo]);

  const completo =
    itens.length > 0 && itens.every((item) => item.faltando.length === 0) && !!modeloId && !!print;

  const enviar = async () => {
    if (salvando) return;
    if (!itens.length) {
      setErro('Cole o registro do Privacy primeiro.');
      return;
    }
    if (itens.some((item) => item.faltando.length > 0)) {
      setErro('Tem registro com campo faltando. Confere o texto colado.');
      return;
    }
    if (!modeloId) {
      setErro('Escolha a modelo.');
      return;
    }
    if (!print) {
      setErro('O print é obrigatório.');
      return;
    }

    setSalvando(true);
    setErro('');
    const modelo = modelos.find((model) => model.id === modeloId);
    try {
      const criadas = await Promise.all(
        itens.map((item) =>
          base44.entities.VendaMimo.create({
            usuario_id: usuario?.id || '',
            usuario_nome: usuario?.full_name || usuario?.email || '',
            modelo_id: modeloId,
            modelo_nome: modelo?.nome || '',
            plataforma: 'privacy',
            usuario_plataforma: item.usuario_plataforma,
            tipo: item.tipo,
            bruto: item.bruto,
            liquido: item.liquido,
            moeda: item.moeda,
            metodo: item.metodo,
            ocorrido_em: item.ocorrido_em,
            print_url: print.url,
            registro_original: texto,
            observacao: observacao.trim(),
            status: 'pendente',
          })
        )
      );

      const resumo = itens
        .map(
          (item) =>
            `${item.tipo || 'Registro'} de ${item.usuario_plataforma || '—'}: ${moedaLabel(
              item.bruto,
              item.moeda
            )} (líquido ${moedaLabel(item.liquido, item.moeda)}) em ${quandoLabel(item.ocorrido_em)}`
        )
        .join(' · ');

      await notificarAdminsSolicitacao(base44, {
        titulo: itens.length > 1 ? `${itens.length} vendas aguardando` : 'Venda aguardando',
        mensagem: `${resumo}${modelo?.nome ? ` na modelo ${modelo.nome}` : ''}. Print anexado.`,
        tipo: 'venda_pendente',
        extra: {
          venda_id: criadas[0]?.id || '',
          venda_ids: criadas.map((venda) => venda.id).filter(Boolean).join(','),
        },
        solicitante: usuario,
      });

      emitNotificationsChanged();
      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      const mensagem = String(error?.message || '');
      if (/not found|does not exist|schema/i.test(mensagem)) {
        setErro('A entidade VendaMimo ainda não existe no app. Publique para sincronizar.');
      } else {
        setErro(mensagem || 'Não consegui registrar a venda.');
      }
    } finally {
      setSalvando(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.32)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Registrar mimo ou venda internacional"
        style={{
          width: 460,
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--c8) 62%, transparent)',
          backdropFilter: 'blur(22px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
          border:
            '1px solid color-mix(in srgb, white 14%, color-mix(in srgb, var(--c1) 18%, transparent))',
          boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-main)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 42,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '0 8px 0 14px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--c1)',
            }}
          >
            Mimo ou venda internacional
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="clk-nav-btn"
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={13} />
          </button>
        </div>

        <div
          className="glass-scroll"
          style={{
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Cole o registro do Privacy</span>
            <textarea
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              placeholder={'08/10/2026, 22:39\nguti3133\nR$ 10,00\nR$ 8,00\nPix\nMimo - Chat'}
              className="glass-scroll"
              style={AREA_TEXTO}
            />
            <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.8 }}>
              Pode colar vários registros de uma vez.
            </span>
          </div>

          {itens.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={rotulo}>Conferência</span>
              {itens.map((item, indice) => (
                <div
                  key={`${item.usuario_plataforma}-${item.ocorrido_em}-${indice}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'color-mix(in srgb, var(--c1) 7%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--c1) 16%, transparent)',
                  }}
                >
                  <span style={{ fontSize: 11.5, color: 'var(--c3)' }}>
                    <span style={{ color: 'var(--c1)', fontWeight: 700 }}>
                      {item.usuario_plataforma || 'sem usuário'}
                    </span>{' '}
                    · {item.tipo || 'sem tipo'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--c2)' }}>
                    {moedaLabel(item.bruto, item.moeda)} bruto ·{' '}
                    {moedaLabel(item.liquido, item.moeda)} líquido
                    {item.metodo ? ` · ${item.metodo}` : ''}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.85 }}>
                    {quandoLabel(item.ocorrido_em)}
                  </span>
                  {item.faltando.length > 0 && (
                    <span style={{ fontSize: 10.5, color: '#ff6b6b' }}>
                      Não encontrei: {item.faltando.join(', ')}.
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <GlassSelect
            label="Modelo"
            value={modeloId}
            onChange={setModeloId}
            placeholder={modelos.length ? 'Escolher modelo' : 'Nenhuma modelo ativa'}
            options={modelos.map((model) => ({ value: model.id, label: model.nome }))}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Print (obrigatório)</span>
            <input
              ref={inputArquivo}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                enviarArquivo(file);
                event.target.value = '';
              }}
            />
            {print ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 8,
                  borderRadius: 8,
                  background: 'color-mix(in srgb, var(--c1) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--c1) 18%, transparent)',
                }}
              >
                <img
                  src={print.url}
                  alt="Print anexado"
                  style={{
                    width: 54,
                    height: 54,
                    objectFit: 'cover',
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11,
                    color: 'var(--c3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {print.nome}
                </span>
                <button
                  type="button"
                  onClick={() => setPrint(null)}
                  style={{
                    ...BOTAO,
                    height: 26,
                    padding: '0 10px',
                    border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
                    background: 'transparent',
                    color: 'var(--c2)',
                  }}
                >
                  Trocar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputArquivo.current?.click()}
                disabled={enviandoPrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  height: 64,
                  borderRadius: 8,
                  border: '1px dashed color-mix(in srgb, var(--c2) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--c8) 40%, transparent)',
                  color: 'var(--c2)',
                  fontFamily: 'var(--font-main)',
                  fontSize: 11,
                  cursor: enviandoPrint ? 'default' : 'pointer',
                }}
              >
                <ImageIcon size={16} />
                {enviandoPrint ? 'Enviando print…' : 'Ctrl+V para colar o print ou clique para escolher'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rotulo}>Observação (opcional)</span>
            <input
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              placeholder="Algo que o admin precise saber?"
              style={{
                height: 32,
                borderRadius: 8,
                background: 'color-mix(in srgb, var(--c8) 60%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c2) 20%, transparent)',
                color: 'var(--c3)',
                fontSize: 12,
                padding: '0 10px',
                fontFamily: 'var(--font-main)',
                outline: 'none',
              }}
            />
          </div>

          {erro && <span style={{ fontSize: 11, color: '#ff6b6b' }}>{erro}</span>}
        </div>

        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '10px 14px',
            borderTop: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              ...BOTAO,
              border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
              background: 'transparent',
              color: 'var(--c2)',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={salvando || !completo}
            className="md-btn"
            style={{
              ...BOTAO,
              border: 'none',
              background: completo
                ? 'var(--c1)'
                : 'color-mix(in srgb, var(--c2) 22%, transparent)',
              color: completo ? 'var(--c8)' : 'var(--c2)',
              opacity: salvando ? 0.6 : 1,
              cursor: salvando || !completo ? 'default' : 'pointer',
            }}
          >
            {salvando ? 'Enviando…' : 'Enviar para aprovação'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
