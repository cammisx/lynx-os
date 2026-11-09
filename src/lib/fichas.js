import { base44 } from '@/api/base44Client';

/**
 * Ficha de cadastro do usuário (admin).
 *
 * Os documentos e contratos ficam no armazenamento PRIVADO do Base44: guarda
 * só o `file_uri`, e o link de verdade é gerado na hora do download, com
 * validade curta. RG e contrato não podem viver em URL pública.
 */

const asList = (resultado) => (Array.isArray(resultado) ? resultado : resultado?.items || []);

export const fichaVazia = (usuarioId, email = '') => ({
  usuario_id: usuarioId,
  usuario_email: email,
  nome_completo: '',
  data_nascimento: '',
  rg: '',
  cpf: '',
  telefone: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  documentos: [],
  contratos: [],
  anotacoes: '',
});

export const buscarFicha = async (usuarioId) => {
  if (!usuarioId) return null;
  const bruto = await base44.entities.FichaChatter.filter({ usuario_id: usuarioId }, '-created_date', 5);
  return asList(bruto)[0] || null;
};

export const salvarFicha = async (ficha, usuarioId) => {
  const payload = { ...ficha, usuario_id: usuarioId };
  if (payload.id) {
    const { id, created_date, updated_date, created_by, ...dados } = payload;
    await base44.entities.FichaChatter.update(id, dados);
    return { ...ficha, ...dados };
  }
  const criada = await base44.entities.FichaChatter.create(payload);
  return { ...ficha, ...(criada || {}) };
};

export const enviarArquivoPrivado = async (file) => {
  const resposta = await base44.integrations.Core.UploadPrivateFile({ file });
  const uri = resposta?.file_uri || resposta?.data?.file_uri;
  if (!uri) throw new Error('O upload não devolveu o endereço do arquivo.');
  return {
    nome: file?.name || 'arquivo',
    file_uri: uri,
    tamanho: Number(file?.size) || 0,
    enviado_em: new Date().toISOString(),
  };
};

export const linkTemporario = async (fileUri) => {
  const resposta = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri: fileUri,
    expires_in: 600,
  });
  const url = resposta?.signed_url || resposta?.data?.signed_url;
  if (!url) throw new Error('Não consegui gerar o link do arquivo.');
  return url;
};

export const abrirArquivo = async (fileUri) => {
  const url = await linkTemporario(fileUri);
  window.open(url, '_blank', 'noopener');
};

export const tamanhoLegivel = (bytes) => {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(0)} KB`;
  return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
};
