import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MODAL_CAIXA } from '@/lib/modalStyles';
import DateTimePicker from '@/components/DateTimePicker';
import GlassSelect from '@/components/GlassSelect';
import { DownloadIcon, TrashIcon, UploadIcon } from '@/components/icons';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatarCEP, formatarCPF, formatarRG, formatarTelefone, apenasNumeros } from '@/lib/mascaras';
import {
  abrirArquivo,
  buscarFicha,
  enviarArquivoPrivado,
  fichaVazia,
  salvarFicha,
  tamanhoLegivel,
} from '@/lib/fichas';

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

const UF = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB',
  'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
].map((sigla) => ({ value: sigla, label: sigla }));

const secao = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '10px 11px',
  borderRadius: 10,
  border: '1px solid color-mix(in srgb, var(--c2) 12%, transparent)',
  background: 'color-mix(in srgb, var(--c8) 38%, transparent)',
};

const botaoSecundario = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 9px',
  borderRadius: 7,
  border: '1px solid color-mix(in srgb, var(--c2) 22%, transparent)',
  background: 'transparent',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 10,
  cursor: 'pointer',
};

const dataDeTexto = (valor) => {
  const bruto = String(valor || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return null;
  const [ano, mes, dia] = bruto.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return Number.isNaN(data.getTime()) ? null : data;
};

const textoDeData = (data) => {
  if (!data) return '';
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
};

/**
 * Ficha de cadastro (admin): nome civil, nascimento, documentos, endereço e os
 * arquivos de documentos e contratos, que ficam guardados na área privada.
 */
export default function FichaChatterModal({ usuario, onFechar, onSalvo }) {
  const pequeno = useIsMobile();
  const [ficha, setFicha] = useState(() => fichaVazia(usuario?.id, usuario?.email));
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviandoTipo, setEnviandoTipo] = useState('');
  const documentosRef = useRef(null);
  const contratosRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    buscarFicha(usuario?.id)
      .then((registro) => {
        if (!ativo) return;
        if (registro) {
          setFicha({
            ...fichaVazia(usuario?.id, usuario?.email),
            ...registro,
            documentos: Array.isArray(registro.documentos) ? registro.documentos : [],
            contratos: Array.isArray(registro.contratos) ? registro.contratos : [],
          });
        }
      })
      .catch((falha) => {
        console.warn('[FichaChatter] carregar', falha);
        if (ativo) setErro('Não consegui abrir a ficha agora.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [usuario?.id, usuario?.email]);

  useEffect(() => {
    const tecla = (evento) => {
      if (evento.key === 'Escape' && !salvando) onFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar, salvando]);

  const mudar = (chave, valor) => setFicha((prev) => ({ ...prev, [chave]: valor }));

  const subir = async (tipo, arquivos) => {
    const lista = Array.from(arquivos || []);
    if (!lista.length) return;
    setErro('');
    setEnviandoTipo(tipo);
    try {
      const novos = [];
      for (const arquivo of lista) {
        novos.push(await enviarArquivoPrivado(arquivo));
      }
      setFicha((prev) => ({
        ...prev,
        [tipo]: [...(Array.isArray(prev[tipo]) ? prev[tipo] : []), ...novos],
      }));
      setAviso(`${novos.length} arquivo(s) enviados. Salve a ficha para guardar.`);
    } catch (falha) {
      console.warn('[FichaChatter] upload', falha);
      setErro(falha?.message || 'Não consegui enviar esse arquivo.');
    } finally {
      setEnviandoTipo('');
    }
  };

  const abrir = async (arquivo) => {
    try {
      await abrirArquivo(arquivo?.file_uri);
    } catch (falha) {
      console.warn('[FichaChatter] download', falha);
      setErro('Não consegui gerar o link do arquivo.');
    }
  };

  const removerArquivo = (tipo, indice) => {
    setFicha((prev) => ({
      ...prev,
      [tipo]: (Array.isArray(prev[tipo]) ? prev[tipo] : []).filter((_, posicao) => posicao !== indice),
    }));
  };

  const salvar = async () => {
    if (salvando) return;
    setErro('');
    setSalvando(true);
    try {
      const salva = await salvarFicha(ficha, usuario?.id);
      setFicha((prev) => ({ ...prev, ...salva }));
      setAviso('Ficha salva.');
      onSalvo?.(salva);
    } catch (falha) {
      console.warn('[FichaChatter] salvar', falha);
      setErro('Não consegui salvar a ficha agora.');
    } finally {
      setSalvando(false);
    }
  };

  const listaArquivos = (tipo, titulo, descricao, inputRef) => {
    const arquivos = Array.isArray(ficha[tipo]) ? ficha[tipo] : [];
    return (
      <div style={secao}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...rotulo, fontSize: 10, fontWeight: 700, color: 'var(--c1)' }}>{titulo}</span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviandoTipo === tipo}
            style={{ ...botaoSecundario, opacity: enviandoTipo === tipo ? 0.6 : 1 }}
          >
            <UploadIcon size={11} />
            {enviandoTipo === tipo ? 'Enviando…' : 'Enviar'}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(evento) => {
              subir(tipo, evento.target.files);
              evento.target.value = '';
            }}
          />
        </div>

        {arquivos.length === 0 ? (
          <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.75 }}>{descricao}</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {arquivos.map((arquivo, indice) => (
              <div
                key={`${arquivo?.file_uri || indice}-${indice}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 7px',
                  borderRadius: 8,
                  background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--c2) 10%, transparent)',
                }}
              >
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
                  {arquivo?.nome || 'arquivo'}
                  <span style={{ color: 'var(--c2)', fontSize: 9 }}> · {tamanhoLegivel(arquivo?.tamanho)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => abrir(arquivo)}
                  aria-label={`Baixar ${arquivo?.nome || 'arquivo'}`}
                  style={{ ...botaoSecundario, padding: '3px 6px' }}
                >
                  <DownloadIcon size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => removerArquivo(tipo, indice)}
                  aria-label={`Remover ${arquivo?.nome || 'arquivo'}`}
                  style={{ ...botaoSecundario, padding: '3px 6px' }}
                >
                  <TrashIcon size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        background: 'rgba(0,0,0,0.42)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !salvando) onFechar();
      }}
    >
      <div style={{ ...MODAL_CAIXA, width: pequeno ? '100%' : 580, maxHeight: pequeno ? '92vh' : '88vh' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            borderBottom: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--c1)' }}>Ficha de cadastro</span>
            <span
              style={{
                fontSize: 9.5,
                color: 'var(--c2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {usuario?.nome_exibicao || usuario?.full_name || usuario?.email} · {usuario?.email}
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            aria-label="Fechar"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--c2)',
              fontSize: 13,
              cursor: salvando ? 'default' : 'pointer',
              padding: 2,
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="glass-scroll"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 14,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {carregando ? (
            <span style={{ fontSize: 10.5, color: 'var(--c2)' }}>Abrindo a ficha…</span>
          ) : (
            <>
              <div style={secao}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={rotulo}>Nome completo</span>
                  <input
                    value={ficha.nome_completo || ''}
                    onChange={(evento) => mudar('nome_completo', evento.target.value)}
                    placeholder="Nome civil, como está no documento"
                    style={campo}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: pequeno ? 'wrap' : undefined }}>
                  <div style={{ flex: 1, minWidth: pequeno ? '100%' : 0 }}>
                    <DateTimePicker
                      label="Data de nascimento"
                      value={dataDeTexto(ficha.data_nascimento)}
                      onChange={(data) => mudar('data_nascimento', textoDeData(data))}
                      mode="date"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: pequeno ? '100%' : 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>Telefone com DDD</span>
                    <input
                      value={formatarTelefone(ficha.telefone)}
                      onChange={(evento) => mudar('telefone', formatarTelefone(evento.target.value))}
                      placeholder="(11) 91234-5678"
                      inputMode="tel"
                      style={campo}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: pequeno ? 'wrap' : undefined }}>
                  <div style={{ flex: 1, minWidth: pequeno ? '100%' : 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>RG</span>
                    <input
                      value={formatarRG(ficha.rg)}
                      onChange={(evento) => mudar('rg', formatarRG(evento.target.value))}
                      placeholder="12.345.678-9"
                      inputMode="numeric"
                      style={campo}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: pequeno ? '100%' : 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>CPF</span>
                    <input
                      value={formatarCPF(ficha.cpf)}
                      onChange={(evento) => mudar('cpf', formatarCPF(evento.target.value))}
                      placeholder="123.456.789-01"
                      inputMode="numeric"
                      style={campo}
                    />
                  </div>
                </div>
              </div>

              <div style={secao}>
                <span style={{ ...rotulo, fontSize: 10, fontWeight: 700, color: 'var(--c1)' }}>Endereço</span>

                <div style={{ display: 'flex', gap: 8, flexWrap: pequeno ? 'wrap' : undefined }}>
                  <div style={{ flex: pequeno ? '1 1 45%' : 0.7, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>CEP</span>
                    <input
                      value={formatarCEP(ficha.cep)}
                      onChange={(evento) => mudar('cep', formatarCEP(evento.target.value))}
                      placeholder="01234-567"
                      inputMode="numeric"
                      style={campo}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>Rua</span>
                    <input
                      value={ficha.rua || ''}
                      onChange={(evento) => mudar('rua', evento.target.value)}
                      style={campo}
                    />
                  </div>
                  <div style={{ flex: pequeno ? '1 1 30%' : 0.45, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>Número</span>
                    <input
                      value={ficha.numero || ''}
                      onChange={(evento) => mudar('numero', apenasNumeros(evento.target.value, 6))}
                      inputMode="numeric"
                      style={campo}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: pequeno ? 'wrap' : undefined }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>Complemento</span>
                    <input
                      value={ficha.complemento || ''}
                      onChange={(evento) => mudar('complemento', evento.target.value)}
                      style={campo}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>Bairro</span>
                    <input
                      value={ficha.bairro || ''}
                      onChange={(evento) => mudar('bairro', evento.target.value)}
                      style={campo}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: pequeno ? 'wrap' : undefined }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>Cidade</span>
                    <input
                      value={ficha.cidade || ''}
                      onChange={(evento) => mudar('cidade', evento.target.value)}
                      style={campo}
                    />
                  </div>
                  <div style={{ flex: pequeno ? '1 1 30%' : 0.45, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={rotulo}>UF</span>
                    <GlassSelect
                      value={ficha.estado || ''}
                      onChange={(valor) => mudar('estado', valor)}
                      options={UF}
                      placeholder="UF"
                    />
                  </div>
                </div>
              </div>

              {listaArquivos('documentos', 'Documentos', 'RG, CPF, comprovante: envie quantos quiser.', documentosRef)}
              {listaArquivos('contratos', 'Contratos', 'Contratos assinados: envie quantos quiser.', contratosRef)}

              <div style={secao}>
                <span style={{ ...rotulo, fontSize: 10, fontWeight: 700, color: 'var(--c1)' }}>Anotações</span>
                <textarea
                  value={ficha.anotacoes || ''}
                  onChange={(evento) => mudar('anotacoes', evento.target.value)}
                  rows={3}
                  placeholder="Algo que a equipe precise saber sobre essa pessoa"
                  style={{ ...campo, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              {erro ? <span style={{ fontSize: 10.5, color: 'var(--erro)' }}>{erro}</span> : null}
              {aviso ? <span style={{ fontSize: 10.5, color: 'var(--c1)' }}>{aviso}</span> : null}

              <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.5 }}>
                Documentos e contratos ficam na área privada: o link de download é gerado na hora e expira em
                poucos minutos.
              </span>
            </>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '11px 14px',
            borderTop: '1px solid color-mix(in srgb, var(--c2) 14%, transparent)',
          }}
        >
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            style={{ ...botaoSecundario, padding: '7px 12px', fontSize: 10.5 }}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || carregando}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--c1) 45%, transparent)',
              background: 'color-mix(in srgb, var(--c1) 16%, transparent)',
              color: 'var(--c1)',
              fontFamily: 'var(--font-main)',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: salvando || carregando ? 'default' : 'pointer',
              opacity: salvando || carregando ? 0.7 : 1,
            }}
          >
            {salvando ? 'Salvando…' : 'Salvar ficha'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
