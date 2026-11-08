import { useEffect, useMemo, useRef, useState } from 'react';
import Window from '@/components/Window';
import { useIsMobile } from '@/hooks/use-mobile';
import GlassSelect from '@/components/GlassSelect';
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from '@/components/icons';
import { SearchIcon } from '@/components/chat/chatIcons';
import { contarItens, filtrarSecoes, itensParaLeitura, pedacosDestacados } from '@/lib/buscaPlaybook';
import usePlaybooks from '@/hooks/usePlaybooks';
import {
  ROTULO_DO_TIPO,
  TIPOS,
  TIPO_EMPRESA,
  conviteValido,
  dataCurta,
  ehEscolha,
  linkDoFormulario,
  normalizarItem,
  pendenciasDaSecao,
  podeEditarPlaybook,
  respondidasDoPlaybook,
  secoesParaFormulario,
  totalDePerguntas,
} from '@/lib/playbooks';
import { useAuth } from '@/lib/AuthContext';
import { useMarcarSujo } from '@/components/desktop/JanelaContext';

const escuro = (valor) => `color-mix(in srgb, var(--c2) ${valor}%, transparent)`;
const dourado = (valor) => `color-mix(in srgb, var(--c1) ${valor}%, transparent)`;

const botaoBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 8,
  border: `1px solid ${dourado(30)}`,
  background: dourado(10),
  color: 'var(--c1)',
  fontFamily: 'var(--font-main)',
  fontSize: 10.5,
  letterSpacing: '0.04em',
  cursor: 'pointer',
};

const campoStyle = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 7,
  border: `1px solid ${escuro(20)}`,
  background: 'color-mix(in srgb, var(--c8) 55%, transparent)',
  color: 'var(--c3)',
  fontFamily: 'var(--font-main)',
  fontSize: 11,
  outline: 'none',
  resize: 'none',
};

const estiloPergunta = {
  fontSize: 10,
  lineHeight: 1.4,
  color: 'var(--c1)',
  letterSpacing: '0.02em',
  opacity: 0.95,
};

const estiloResposta = {
  fontSize: 11.5,
  lineHeight: 1.55,
  color: 'var(--c3)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const ID_TEMPLATE = '__template__';

const OPCOES_DE_TIPO = Object.values(TIPOS).map((tipo) => ({
  value: tipo,
  label: ROTULO_DO_TIPO[tipo],
}));

/** Copia com a área de transferência moderna e, se ela não existir, no antigo. */
const copiarTexto = async (texto) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (falha) {
    /* segue para o plano B */
  }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch (falha) {
    return false;
  }
};

/** Um interruptor pequeno, para "copiar", "obrigatória" e "outro". */
function Interruptor({ ativo, onToggle, children, titulo }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={ativo}
      title={titulo}
      style={{
        ...botaoBase,
        padding: '3px 7px',
        gap: 4,
        fontSize: 9,
        flexShrink: 0,
        color: ativo ? 'var(--c1)' : 'var(--c2)',
        border: `1px solid ${ativo ? dourado(45) : escuro(18)}`,
        background: ativo ? dourado(14) : escuro(6),
        opacity: ativo ? 1 : 0.85,
      }}
    >
      {children}
    </button>
  );
}

/** O texto com o termo buscado destacado, sem perder a acentuação original. */
function TextoComMarca({ texto, termo }) {
  const pedacos = pedacosDestacados(texto, termo);
  if (pedacos.length === 1 && !pedacos[0].destaque) return pedacos[0].texto;
  return pedacos.map((pedaco, indice) =>
    pedaco.destaque ? (
      <mark
        key={`${indice}-${pedaco.texto}`}
        style={{ background: dourado(26), color: 'var(--c1)', borderRadius: 3, padding: '0 1px' }}
      >
        {pedaco.texto}
      </mark>
    ) : (
      pedaco.texto
    )
  );
}

/** Uma pergunta com a resposta. Só ganha botão de copiar se a pergunta pedir. */
function ItemLeitura({ item, termo }) {
  const [copiado, setCopiado] = useState(false);
  const relogio = useRef(null);

  useEffect(() => () => clearTimeout(relogio.current), []);

  const copiar = async () => {
    const ok = await copiarTexto(item.resposta);
    if (!ok) return;
    setCopiado(true);
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setCopiado(false), 1600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {item.pergunta ? (
        <span style={estiloPergunta}>
          <TextoComMarca texto={item.pergunta} termo={termo} />
        </span>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ ...estiloResposta, flex: 1, minWidth: 0 }}>
          <TextoComMarca texto={item.resposta} termo={termo} />
        </span>
        {item.copiar ? (
          <button
            type="button"
            onClick={copiar}
            title="Copiar resposta"
            style={{
              ...botaoBase,
              flexShrink: 0,
              padding: '3px 7px',
              fontSize: 9.5,
              gap: 4,
              color: copiado ? 'var(--ok)' : 'var(--c1)',
              border: `1px solid ${copiado ? 'color-mix(in srgb, var(--ok) 45%, transparent)' : dourado(28)}`,
              background: copiado ? 'color-mix(in srgb, var(--ok) 14%, transparent)' : dourado(8),
            }}
          >
            {copiado ? <CheckIcon size={10} /> : <CopyIcon size={10} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Leitura das diretrizes: seção por seção, pergunta por pergunta. */
function Leitura({ playbook, termo = '' }) {
  const secoes = (playbook?.secoes || [])
    .map((secao) => ({
      ...secao,
      itens: itensParaLeitura(secao),
      descricao: String(secao?.descricao || ''),
      texto: String(secao?.texto || ''),
    }))
    .filter((secao) => secao.itens.length || secao.texto.trim());

  const encontradas = filtrarSecoes(secoes, termo);

  if (termo.trim() && !encontradas.length) {
    return (
      <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--c2)', fontSize: 11, lineHeight: 1.6 }}>
        Nada encontrado para “{termo.trim()}”.
        <br />
        Tente uma palavra mais curta, como “risada”, “personalizado” ou “limite”.
      </div>
    );
  }

  if (!secoes.length) {
    return (
      <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--c2)', fontSize: 11, lineHeight: 1.6 }}>
        Este playbook ainda está em branco.
        <br />
        As perguntas aparecem aqui conforme forem respondidas.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {encontradas.map((secao, indice) => (
        <div key={secao.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 11.5,
              letterSpacing: '0.06em',
              color: 'var(--c1)',
              paddingBottom: 5,
              borderBottom: `1px solid ${dourado(18)}`,
            }}
          >
            <TextoComMarca texto={secao.titulo || `Seção ${indice + 1}`} termo={termo} />
          </span>

          {secao.texto.trim() ? (
            <span style={estiloResposta}>
              <TextoComMarca texto={secao.texto} termo={termo} />
            </span>
          ) : null}

          {secao.itens.map((item) => (
            <ItemLeitura key={item.id} item={item} termo={termo} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Editor.
 * modo 'template': monta o questionário (pergunta, tipo, opções, obrigatória).
 * modo 'playbook': preenche as respostas da modelo.
 */
function Edicao({
  playbook,
  onSalvar,
  onCancelar,
  salvando,
  comResumo = true,
  rotuloSalvar = 'Salvar playbook',
  modo = 'playbook',
}) {
  const doTemplate = modo === 'template';
  const [secoes, setSecoes] = useState(() =>
    (playbook.secoes || []).map((secao, indice) => ({
      id: secao.id || `s${indice + 1}`,
      titulo: secao.titulo || '',
      descricao: secao.descricao || '',
      texto: secao.texto || '',
      itens: (secao.itens || []).map((item, ordem) =>
        normalizarItem(item, `s${indice + 1}q${ordem + 1}`)
      ),
    }))
  );
  const [resumo, setResumo] = useState(playbook.resumo || '');

  const mudarSecao = (id, campoNome, valor) =>
    setSecoes((anterior) =>
      anterior.map((secao) => (secao.id === id ? { ...secao, [campoNome]: valor } : secao))
    );

  const adicionarSecao = () =>
    setSecoes((anterior) => [
      ...anterior,
      { id: `n${Date.now()}`, titulo: '', descricao: '', texto: '', itens: [] },
    ]);

  const removerSecao = (id) => setSecoes((anterior) => anterior.filter((secao) => secao.id !== id));

  const moverSecao = (indice, passo) => {
    setSecoes((anterior) => {
      const destino = indice + passo;
      if (destino < 0 || destino >= anterior.length) return anterior;
      const copia = [...anterior];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  };

  const mudarItem = (secaoId, itemId, campoNome, valor) =>
    setSecoes((anterior) =>
      anterior.map((secao) =>
        secao.id === secaoId
          ? {
              ...secao,
              itens: secao.itens.map((item) =>
                item.id === itemId ? { ...item, [campoNome]: valor } : item
              ),
            }
          : secao
      )
    );

  const adicionarItem = (secaoId) =>
    setSecoes((anterior) =>
      anterior.map((secao) =>
        secao.id === secaoId
          ? {
              ...secao,
              itens: [
                ...secao.itens,
                normalizarItem({ tipo: TIPOS.LONGO }, `n${Date.now()}`),
              ],
            }
          : secao
      )
    );

  const removerItem = (secaoId, itemId) =>
    setSecoes((anterior) =>
      anterior.map((secao) =>
        secao.id === secaoId
          ? { ...secao, itens: secao.itens.filter((item) => item.id !== itemId) }
          : secao
      )
    );

  const moverItem = (secaoId, indice, passo) =>
    setSecoes((anterior) =>
      anterior.map((secao) => {
        if (secao.id !== secaoId) return secao;
        const destino = indice + passo;
        if (destino < 0 || destino >= secao.itens.length) return secao;
        const itens = [...secao.itens];
        [itens[indice], itens[destino]] = [itens[destino], itens[indice]];
        return { ...secao, itens };
      })
    );

  const mudarOpcao = (secaoId, itemId, indice, valor) =>
    setSecoes((anterior) =>
      anterior.map((secao) =>
        secao.id === secaoId
          ? {
              ...secao,
              itens: secao.itens.map((item) => {
                if (item.id !== itemId) return item;
                const opcoes = [...(item.opcoes || [])];
                opcoes[indice] = valor;
                return { ...item, opcoes };
              }),
            }
          : secao
      )
    );

  const adicionarOpcao = (secaoId, itemId) =>
    setSecoes((anterior) =>
      anterior.map((secao) =>
        secao.id === secaoId
          ? {
              ...secao,
              itens: secao.itens.map((item) =>
                item.id === itemId ? { ...item, opcoes: [...(item.opcoes || []), ''] } : item
              ),
            }
          : secao
      )
    );

  const removerOpcao = (secaoId, itemId, indice) =>
    setSecoes((anterior) =>
      anterior.map((secao) =>
        secao.id === secaoId
          ? {
              ...secao,
              itens: secao.itens.map((item) => {
                if (item.id !== itemId) return item;
                return { ...item, opcoes: (item.opcoes || []).filter((_, i) => i !== indice) };
              }),
            }
          : secao
      )
    );

  const seta = (desativado) => ({
    ...botaoBase,
    padding: '3px 6px',
    fontSize: 10,
    opacity: desativado ? 0.3 : 0.9,
    cursor: desativado ? 'default' : 'pointer',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {comResumo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.85 }}>Resumo</span>
          <input
            value={resumo}
            onChange={(evento) => setResumo(evento.target.value)}
            placeholder="Para que serve este playbook"
            style={campoStyle}
          />
        </div>
      ) : null}

      {secoes.map((secao, indice) => {
        const pendentes = pendenciasDaSecao(secao);
        return (
          <div
            key={secao.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 9,
              borderRadius: 9,
              border: `1px solid ${escuro(14)}`,
              background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                value={secao.titulo}
                onChange={(evento) => mudarSecao(secao.id, 'titulo', evento.target.value)}
                placeholder="Título da seção"
                style={{ ...campoStyle, flex: 1, color: 'var(--c1)', fontWeight: 600 }}
              />
              {secao.itens.length && !doTemplate ? (
                <span
                  title={pendentes ? `${pendentes} pergunta(s) sem resposta` : 'Todas respondidas'}
                  style={{ fontSize: 9, color: pendentes ? 'var(--c2)' : 'var(--ok)', whiteSpace: 'nowrap' }}
                >
                  {pendentes ? `${pendentes} sem resposta` : 'completa'}
                </span>
              ) : (
                <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.8, whiteSpace: 'nowrap' }}>
                  {secao.itens.length} pergunta{secao.itens.length === 1 ? '' : 's'}
                </span>
              )}
              <button type="button" onClick={() => moverSecao(indice, -1)} aria-label="Subir seção" disabled={indice === 0} style={seta(indice === 0)}>
                ↑
              </button>
              <button type="button" onClick={() => moverSecao(indice, 1)} aria-label="Descer seção" disabled={indice === secoes.length - 1} style={seta(indice === secoes.length - 1)}>
                ↓
              </button>
              <button type="button" onClick={() => removerSecao(secao.id)} aria-label="Remover seção" style={{ ...botaoBase, padding: '4px 6px', color: 'var(--c6)' }}>
                <TrashIcon size={11} />
              </button>
            </div>

            {doTemplate ? (
              <textarea
                value={secao.descricao}
                onChange={(evento) => mudarSecao(secao.id, 'descricao', evento.target.value)}
                placeholder="Texto explicativo da seção (opcional)"
                rows={2}
                style={{ ...campoStyle, fontSize: 10.5, lineHeight: 1.45 }}
              />
            ) : null}

            {secao.itens.map((item, ordem) => {
              const escolha = ehEscolha(item.tipo);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    padding: 8,
                    borderRadius: 8,
                    border: `1px solid ${escuro(10)}`,
                    background: 'color-mix(in srgb, var(--c8) 35%, transparent)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input
                      value={item.pergunta}
                      onChange={(evento) => mudarItem(secao.id, item.id, 'pergunta', evento.target.value)}
                      placeholder="Pergunta"
                      style={{ ...campoStyle, flex: 1, minWidth: 0, fontSize: 10.5, color: 'var(--c1)' }}
                    />
                    {doTemplate ? (
                      <div style={{ width: 128, flexShrink: 0 }}>
                        <GlassSelect
                          value={item.tipo}
                          onChange={(valor) => mudarItem(secao.id, item.id, 'tipo', valor)}
                          options={OPCOES_DE_TIPO}
                          placeholder="Tipo"
                          align="right"
                        />
                      </div>
                    ) : null}
                    <Interruptor
                      ativo={item.copiar}
                      onToggle={() => mudarItem(secao.id, item.id, 'copiar', !item.copiar)}
                      titulo={item.copiar ? 'Botão de copiar ligado' : 'Ligar botão de copiar'}
                    >
                      <CopyIcon size={10} />
                      {item.copiar ? 'copiar' : ''}
                    </Interruptor>
                    {doTemplate ? (
                      <Interruptor
                        ativo={item.obrigatoria}
                        onToggle={() => mudarItem(secao.id, item.id, 'obrigatoria', !item.obrigatoria)}
                        titulo={item.obrigatoria ? 'Resposta obrigatória' : 'Resposta opcional'}
                      >
                        {item.obrigatoria ? 'obrigatória' : 'opcional'}
                      </Interruptor>
                    ) : null}
                    <button type="button" onClick={() => moverItem(secao.id, ordem, -1)} aria-label="Subir pergunta" disabled={ordem === 0} style={seta(ordem === 0)}>
                      ↑
                    </button>
                    <button type="button" onClick={() => moverItem(secao.id, ordem, 1)} aria-label="Descer pergunta" disabled={ordem === secao.itens.length - 1} style={seta(ordem === secao.itens.length - 1)}>
                      ↓
                    </button>
                    <button type="button" onClick={() => removerItem(secao.id, item.id)} aria-label="Remover pergunta" style={{ ...botaoBase, padding: '3px 6px', color: 'var(--c6)' }}>
                      <TrashIcon size={10} />
                    </button>
                  </div>

                  {doTemplate && escolha ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>
                      {(item.opcoes || []).map((opcao, indiceOpcao) => (
                        <div key={indiceOpcao} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 9.5, color: 'var(--c2)', width: 12, textAlign: 'right' }}>
                            {indiceOpcao + 1}
                          </span>
                          <input
                            value={opcao}
                            onChange={(evento) =>
                              mudarOpcao(secao.id, item.id, indiceOpcao, evento.target.value)
                            }
                            placeholder={`Opção ${indiceOpcao + 1}`}
                            style={{ ...campoStyle, flex: 1, minWidth: 0, fontSize: 10 }}
                          />
                          <button
                            type="button"
                            onClick={() => removerOpcao(secao.id, item.id, indiceOpcao)}
                            aria-label={`Remover opção ${indiceOpcao + 1}`}
                            style={{ ...botaoBase, padding: '2px 5px', color: 'var(--c6)' }}
                          >
                            <CloseIcon size={9} />
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => adicionarOpcao(secao.id, item.id)}
                          style={{ ...botaoBase, padding: '3px 8px', fontSize: 9 }}
                        >
                          <PlusIcon size={9} /> Opção
                        </button>
                        <Interruptor
                          ativo={item.outro}
                          onToggle={() => mudarItem(secao.id, item.id, 'outro', !item.outro)}
                          titulo="Mostra a alternativa Outro, com campo de texto"
                        >
                          Outro:
                        </Interruptor>
                      </div>
                    </div>
                  ) : null}

                  {!doTemplate ? (
                    <textarea
                      value={item.resposta}
                      onChange={(evento) => mudarItem(secao.id, item.id, 'resposta', evento.target.value)}
                      placeholder="Resposta (em branco, a pergunta não aparece na leitura)"
                      rows={2}
                      style={{ ...campoStyle, lineHeight: 1.45 }}
                    />
                  ) : null}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => adicionarItem(secao.id)}
              style={{ ...botaoBase, alignSelf: 'flex-start', padding: '4px 9px', fontSize: 9.5 }}
            >
              <PlusIcon size={10} /> Pergunta
            </button>

            {/* Seção antiga guardada como texto corrido: continua aqui para ser lida ou limpa. */}
            {secao.texto ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 8.5, color: 'var(--c2)', opacity: 0.8 }}>
                  Texto corrido (formato antigo)
                </span>
                <textarea
                  value={secao.texto}
                  onChange={(evento) => mudarSecao(secao.id, 'texto', evento.target.value)}
                  rows={3}
                  style={{ ...campoStyle, lineHeight: 1.45, fontSize: 10.5 }}
                />
              </div>
            ) : null}
          </div>
        );
      })}

      <button
        type="button"
        onClick={adicionarSecao}
        style={{ ...botaoBase, alignSelf: 'flex-start', padding: '5px 10px' }}
      >
        <PlusIcon size={11} /> Seção
      </button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 2 }}>
        <button
          type="button"
          onClick={onCancelar}
          style={{ ...botaoBase, color: 'var(--c2)', border: `1px solid ${escuro(18)}`, background: escuro(6) }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={() => onSalvar({ secoes, resumo })}
          style={{ ...botaoBase, opacity: salvando ? 0.6 : 1 }}
        >
          {salvando ? 'Salvando…' : rotuloSalvar}
        </button>
      </div>
    </div>
  );
}

/** Link público do formulário: gera, mostra e copia. Só admin vê. */
function LinkDoFormulario({ playbook, convite, onGerar, gerando }) {
  const [copiado, setCopiado] = useState(false);
  const relogio = useRef(null);

  useEffect(() => () => clearTimeout(relogio.current), []);

  const ativo = conviteValido(convite);
  const link = ativo ? linkDoFormulario(convite.token) : '';
  const total = totalDePerguntas(secoesParaFormulario(playbook));
  const respondidas = respondidasDoPlaybook(playbook);

  const copiar = async () => {
    const ok = await copiarTexto(link);
    if (!ok) return;
    setCopiado(true);
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setCopiado(false), 1600);
  };

  const situacao = !convite
    ? 'nenhum link gerado'
    : convite.status === 'respondido'
      ? `respondido em ${dataCurta(convite.respondido_em)}`
      : ativo
        ? `vale até ${dataCurta(convite.expira_em)}`
        : 'link vencido';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        marginBottom: 10,
        borderRadius: 9,
        border: `1px solid ${dourado(16)}`,
        background: dourado(6),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9.5, color: 'var(--c1)', letterSpacing: '0.06em' }}>
          LINK DO FORMULÁRIO
        </span>
        <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.85 }}>{situacao}</span>
        <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.85, marginLeft: 'auto' }}>
          {respondidas} de {total} respondidas
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          readOnly
          value={link}
          placeholder="Gere o link e mande para a modelo responder"
          onFocus={(evento) => evento.target.select()}
          style={{ ...campoStyle, flex: 1, minWidth: 0, fontSize: 10 }}
        />
        {ativo ? (
          <button
            type="button"
            onClick={copiar}
            style={{
              ...botaoBase,
              flexShrink: 0,
              padding: '4px 8px',
              fontSize: 9.5,
              gap: 4,
              color: copiado ? 'var(--ok)' : 'var(--c1)',
              border: `1px solid ${copiado ? 'color-mix(in srgb, var(--ok) 45%, transparent)' : dourado(28)}`,
              background: copiado ? 'color-mix(in srgb, var(--ok) 14%, transparent)' : dourado(8),
            }}
          >
            {copiado ? <CheckIcon size={10} /> : <CopyIcon size={10} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onGerar}
          disabled={gerando}
          style={{ ...botaoBase, flexShrink: 0, padding: '4px 8px', fontSize: 9.5, opacity: gerando ? 0.6 : 1 }}
        >
          {gerando ? 'Gerando…' : ativo ? 'Novo link' : 'Gerar link'}
        </button>
      </div>
    </div>
  );
}

/** O questionário padrão, editável só pelo admin. */
function TemplateView({ templateDe, salvarTemplate, onSair }) {
  const [tipo, setTipo] = useState('modelo');
  const [salvando, setSalvando] = useState(false);
  const atual = templateDe(tipo);
  const ehModelo = tipo === 'modelo';

  const abas = [
    { id: 'modelo', rotulo: 'Modelo' },
    { id: 'empresa', rotulo: 'Agência' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => setTipo(aba.id)}
            aria-pressed={tipo === aba.id}
            style={{
              ...botaoBase,
              padding: '4px 10px',
              fontSize: 9.5,
              color: tipo === aba.id ? 'var(--c1)' : 'var(--c2)',
              background: tipo === aba.id ? dourado(14) : escuro(6),
              border: `1px solid ${tipo === aba.id ? dourado(45) : escuro(18)}`,
            }}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>

      <span style={{ fontSize: 9.5, color: 'var(--c2)', opacity: 0.85, lineHeight: 1.55 }}>
        É este questionário que toda modelo nova recebe, e é dele que sai o link enviado a ela.
        Mexer aqui não altera os playbooks que já existem.
      </span>

      <Edicao
        key={`${tipo}-${atual?.id || 'novo'}`}
        playbook={{
          secoes: atual?.secoes || [],
          resumo: atual?.resumo || '',
          titulo: atual?.titulo || '',
          descricao: atual?.descricao || '',
        }}
        modo="template"
        comResumo={false}
        rotuloSalvar="Salvar template"
        salvando={salvando}
        onCancelar={onSair}
        onSalvar={async ({ secoes }) => {
          setSalvando(true);
          await salvarTemplate(tipo, {
            secoes,
            titulo: ehModelo ? atual?.titulo || '' : '',
            descricao: ehModelo ? atual?.descricao || '' : '',
          });
          setSalvando(false);
        }}
      />

      {ehModelo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--c2)', opacity: 0.85 }}>
            Cabeçalho do formulário (o que a modelo lê no topo)
          </span>
          <input
            defaultValue={atual?.titulo || ''}
            onBlur={(evento) =>
              salvarTemplate(tipo, {
                secoes: atual?.secoes || [],
                titulo: evento.target.value,
                descricao: atual?.descricao || '',
              })
            }
            placeholder="Título do formulário"
            style={{ ...campoStyle, color: 'var(--c1)', fontWeight: 600 }}
          />
          <textarea
            defaultValue={atual?.descricao || ''}
            onBlur={(evento) =>
              salvarTemplate(tipo, {
                secoes: atual?.secoes || [],
                titulo: atual?.titulo || '',
                descricao: evento.target.value,
              })
            }
            placeholder="Texto de abertura"
            rows={3}
            style={{ ...campoStyle, fontSize: 10.5, lineHeight: 1.45 }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function PlaybookWindow({ onClose }) {
  /* No celular a lista e o conteúdo não cabem lado a lado: mostra um por vez,
     com o botão de voltar para a lista. */
  const pequeno = useIsMobile();
  const [verConteudo, setVerConteudo] = useState(false);
  const { user } = useAuth();
  const {
    playbooks,
    carregando,
    erro,
    salvar,
    recarregar,
    nomeDe,
    templateDe,
    salvarTemplate,
    criarConvite,
    conviteDaModelo,
  } = usePlaybooks();
  const podeEditar = podeEditarPlaybook(user);
  const [ativoId, setAtivoId] = useState(null);
  const [editando, setEditando] = useState(false);
  useMarcarSujo(editando);
  const [salvando, setSalvando] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (ativoId === ID_TEMPLATE && podeEditar) return;
    if (!playbooks.length) {
      setAtivoId(null);
      return;
    }
    if (!playbooks.some((item) => item.id === ativoId)) setAtivoId(playbooks[0].id);
  }, [playbooks, ativoId, podeEditar]);

  const ativo = useMemo(
    () => playbooks.find((item) => item.id === ativoId) || null,
    [playbooks, ativoId]
  );

  useEffect(() => {
    setBusca('');
  }, [ativoId]);

  useEffect(() => {
    if (editando) setBusca('');
  }, [editando]);

  /* Quantas perguntas a busca encontrou, para mostrar ao lado do campo. */
  const achados = useMemo(() => {
    const termo = busca.trim();
    if (!termo || !ativo) return null;
    const secoes = (ativo.secoes || [])
      .map((secao) => ({ ...secao, itens: itensParaLeitura(secao) }))
      .filter((secao) => secao.itens.length || String(secao.texto || '').trim());
    return contarItens(filtrarSecoes(secoes, termo));
  }, [ativo, busca]);

  return (
    <Window title="Playbook" icon={UsersIcon} onClose={onClose} width={820} height={580}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0, gap: 0 }}>
        {/* Lista de playbooks: empresa primeiro, depois as modelos. */}
        <div
          className="glass-scroll"
          style={{
            width: pequeno ? '100%' : 196,
            flexShrink: 0,
            display: pequeno && verConteudo ? 'none' : 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: pequeno ? '2px 2px 10px' : '2px 10px 10px 2px',
            overflowY: 'auto',
            borderRight: pequeno ? 'none' : `1px solid ${escuro(14)}`,
          }}
        >
          {carregando && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.7 }}>Carregando…</span>
          )}

          {podeEditar && (
            <button
              type="button"
              onClick={() => {
                setAtivoId(ID_TEMPLATE);
                setEditando(false);
                setVerConteudo(true);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 1,
                width: '100%',
                padding: '7px 9px',
                marginBottom: 4,
                borderRadius: 8,
                textAlign: 'left',
                border: `1px dashed ${ativoId === ID_TEMPLATE ? dourado(55) : dourado(28)}`,
                background: ativoId === ID_TEMPLATE ? dourado(14) : 'transparent',
                color: ativoId === ID_TEMPLATE ? 'var(--c1)' : 'var(--c3)',
                fontFamily: 'var(--font-main)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 10.5, fontWeight: ativoId === ID_TEMPLATE ? 700 : 500 }}>
                Template
              </span>
              <span style={{ fontSize: 8.5, opacity: 0.7, letterSpacing: '0.05em' }}>SÓ ADMIN</span>
            </button>
          )}

          {!carregando && !playbooks.length && (
            <span style={{ fontSize: 10.5, color: 'var(--c2)', opacity: 0.7, lineHeight: 1.5 }}>
              Nenhum playbook liberado para você ainda.
            </span>
          )}

          {playbooks.map((playbook) => {
            const escolhido = playbook.id === ativoId;
            return (
              <button
                key={playbook.id}
                type="button"
                onClick={() => {
                  setAtivoId(playbook.id);
                  setEditando(false);
                  setVerConteudo(true);
                }}
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
                  {nomeDe(playbook)}
                </span>
                <span style={{ fontSize: 8.5, opacity: 0.7, letterSpacing: '0.05em' }}>
                  {playbook.tipo === TIPO_EMPRESA ? 'AGÊNCIA' : 'MODELO'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: pequeno && !verConteudo ? 'none' : 'flex',
            flexDirection: 'column',
            padding: pequeno ? '2px' : '2px 2px 2px 14px',
          }}
        >
          {pequeno ? (
            <button
              type="button"
              onClick={() => setVerConteudo(false)}
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 32,
                padding: '0 10px 0 6px',
                marginBottom: 8,
                borderRadius: 9,
                border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                background: 'transparent',
                color: 'var(--c3)',
                fontFamily: 'var(--font-main)',
                fontSize: 11,
              }}
            >
              ‹ Playbooks
            </button>
          ) : null}

          {erro && (
            <span style={{ fontSize: 10.5, color: 'var(--c6)', marginBottom: 8 }}>{erro}</span>
          )}

          {ativoId === ID_TEMPLATE && podeEditar ? (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-display)',
                      fontSize: 13,
                      letterSpacing: '0.05em',
                      color: 'var(--c1)',
                    }}
                  >
                    TEMPLATE DO QUESTIONÁRIO
                  </span>
                  <span style={{ display: 'block', fontSize: 9, color: 'var(--c2)', opacity: 0.8 }}>
                    O que a modelo nova recebe ao entrar
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAtivoId(playbooks[0]?.id || null)}
                  style={{ ...botaoBase, padding: '5px 8px', color: 'var(--c2)', border: `1px solid ${escuro(18)}`, background: escuro(6) }}
                >
                  <CloseIcon size={11} />
                </button>
              </div>
              <div className="glass-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 6 }}>
                <TemplateView
                  templateDe={templateDe}
                  salvarTemplate={salvarTemplate}
                  onSair={() => setAtivoId(playbooks[0]?.id || null)}
                />
              </div>
            </div>
          ) : ativo ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-display)',
                      fontSize: 13,
                      letterSpacing: '0.05em',
                      color: 'var(--c1)',
                    }}
                  >
                    {nomeDe(ativo).toUpperCase()}
                  </span>
                  <span style={{ display: 'block', fontSize: 9, color: 'var(--c2)', opacity: 0.8 }}>
                    {ativo.resumo || 'Diretrizes'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={recarregar}
                  aria-label="Recarregar playbooks"
                  style={{ ...botaoBase, padding: '5px 8px', color: 'var(--c2)', border: `1px solid ${escuro(18)}`, background: escuro(6) }}
                >
                  Atualizar
                </button>
                {podeEditar && !editando && (
                  <button
                    type="button"
                    onClick={() => setEditando(true)}
                    aria-label="Editar playbook"
                    style={botaoBase}
                  >
                    <PencilIcon size={11} /> Editar
                  </button>
                )}
                {editando && (
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    aria-label="Sair da edição"
                    style={{ ...botaoBase, padding: '5px 8px', color: 'var(--c2)', border: `1px solid ${escuro(18)}`, background: escuro(6) }}
                  >
                    <CloseIcon size={11} />
                  </button>
                )}
              </div>

              {!editando ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 9,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        color: 'var(--c2)',
                        opacity: 0.75,
                        pointerEvents: 'none',
                      }}
                    >
                      <SearchIcon size={11} />
                    </span>
                    <input
                      type="search"
                      value={busca}
                      onChange={(evento) => setBusca(evento.target.value)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Escape') setBusca('');
                      }}
                      placeholder="Pesquisar no playbook…"
                      aria-label="Pesquisar no playbook"
                      style={{
                        ...campoStyle,
                        height: 29,
                        padding: '0 8px 0 26px',
                        fontSize: 10.5,
                        borderRadius: 8,
                      }}
                    />
                  </div>
                  {busca.trim() ? (
                    <>
                      <span style={{ fontSize: 9.5, color: 'var(--c2)', whiteSpace: 'nowrap' }}>
                        {achados === 0
                          ? 'nada'
                          : `${achados} ${achados === 1 ? 'achado' : 'achados'}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBusca('')}
                        aria-label="Limpar pesquisa"
                        title="Limpar pesquisa"
                        style={{ ...botaoBase, padding: '4px 6px', color: 'var(--c2)', border: `1px solid ${escuro(18)}`, background: escuro(6) }}
                      >
                        <CloseIcon size={10} />
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}

              {podeEditar && ativo.tipo !== TIPO_EMPRESA ? (
                <LinkDoFormulario
                  playbook={ativo}
                  convite={conviteDaModelo(ativo.modelo_id)}
                  gerando={gerandoLink}
                  onGerar={async () => {
                    setGerandoLink(true);
                    await criarConvite(ativo);
                    setGerandoLink(false);
                  }}
                />
              ) : null}

              <div className="glass-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 6 }}>
                {editando ? (
                  <Edicao
                    playbook={ativo}
                    salvando={salvando}
                    onCancelar={() => setEditando(false)}
                    onSalvar={async (dados) => {
                      setSalvando(true);
                      const ok = await salvar(ativo, dados);
                      setSalvando(false);
                      if (ok) setEditando(false);
                    }}
                  />
                ) : (
                  <Leitura playbook={ativo} termo={busca.trim()} />
                )}
              </div>
            </>
          ) : (
            !carregando && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c2)',
                  fontSize: 11,
                  textAlign: 'center',
                  padding: 20,
                  lineHeight: 1.6,
                }}
              >
                Selecione um playbook à esquerda.
              </div>
            )
          )}
        </div>
      </div>
    </Window>
  );
}
