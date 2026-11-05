import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  asList,
  canalVisivel,
  chaveDoCanal,
  chaveDeDedupe,
  ehAdmin,
  mensagemVisivel,
  naoLidasDoCanal,
  ordemDosCanais,
} from '@/lib/chat';
import { avaliarMensagensChat, lerFocoDoChat, tocarSomChat } from '@/lib/sons';
import { paraData } from '@/lib/datas';

/** Mensagens consideradas para contagem e histórico curto. */
const JANELA_MS = 14 * 86400000;
const LIMITE_MENSAGENS = 400;
const INTERVALO_SEM_TEMPO_REAL = 15000;

/** Lê uma lista sem derrubar o chat inteiro quando uma entidade falha. */
const listar = async (promessa) => {
  try {
    return asList(await promessa);
  } catch (falha) {
    console.warn('[Chat] consulta falhou', falha);
    return [];
  }
};

const agora = () => new Date().toISOString();

/* created_date vem do banco sem timezone: paraData garante a mesma leitura
   usada na exibição, senão a ordem erra perto das 21h. */
const porData = (a, b) => paraData(a.created_date) - paraData(b.created_date);

/**
 * Fonte de verdade do chat: canais visíveis, mensagens da janela recente,
 * contagem de não lidas e as ações de enviar, ler e criar canal.
 *
 * O tempo real vem do subscribe do SDK; se ele não estiver disponível, cai
 * para uma atualização a cada 15 segundos, sem quebrar o resto.
 */
export default function useChat() {
  const { user } = useAuth();
  const [canais, setCanais] = useState([]);
  const [membros, setMembros] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [canalAtivoId, setCanalAtivoId] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const canaisVisiveisRef = useRef([]);
  const membrosRef = useRef([]);

  const euId = user?.id;

  const carregarPessoas = useCallback(async () => {
    const [usuarios, chatters] = await Promise.all([
      listar(base44.entities.User.list()),
      listar(base44.entities.Chatter.list()),
    ]);
    const mapa = new Map();
    usuarios.forEach((usuario) => {
      mapa.set(usuario.id, {
        id: usuario.id,
        email: usuario.email || '',
        cargo: usuario.role === 'admin' ? 'admin' : 'chatter',
        nome: usuario.full_name || usuario.email || 'Sem nome',
      });
    });
    chatters.forEach((chatter) => {
      if (!chatter?.usuario_id) return;
      const atual = mapa.get(chatter.usuario_id) || { id: chatter.usuario_id, cargo: 'chatter' };
      mapa.set(chatter.usuario_id, {
        ...atual,
        nome: chatter.nome_exibicao || atual.nome || atual.email || 'Sem nome',
      });
    });
    return [...mapa.values()];
  }, []);

  /** Só busca mensagens dos canais que esta pessoa pode ver. */
  const carregarMensagens = useCallback(async (canaisPermitidos = []) => {
    const ids = canaisPermitidos.map((canal) => canal.id).filter(Boolean);
    if (!ids.length) return [];
    const desde = new Date(Date.now() - JANELA_MS).toISOString();
    const soDosMeus = (lista) =>
      lista.filter((mensagem) => ids.includes(mensagem.canal_id)).sort(porData);

    try {
      const lista = asList(
        await base44.entities.ChatMensagem.filter(
          { canal_id: { $in: ids }, created_date: { $gte: desde } },
          '-created_date',
          LIMITE_MENSAGENS,
          0
        )
      );
      return soDosMeus(lista);
    } catch (falhaComOperadores) {
      try {
        const lista = asList(
          await base44.entities.ChatMensagem.filter(
            { canal_id: { $in: ids } },
            '-created_date',
            LIMITE_MENSAGENS,
            0
          )
        );
        return soDosMeus(lista);
      } catch (falha) {
        const lista = asList(
          await base44.entities.ChatMensagem.list('-created_date', LIMITE_MENSAGENS, 0)
        );
        return soDosMeus(lista);
      }
    }
  }, []);

  /** Cria o canal geral e um canal por modelo quando ainda não existem, e
   *  descarta duplicados que possam ter sido criados ao mesmo tempo. */
  const garantirCanais = useCallback(
    async (listaCanais, listaModelos) => {
      const existentes = new Set(listaCanais.map(chaveDoCanal));
      const faltando = [];
      if (!existentes.has('geral')) {
        faltando.push({ tipo: 'geral', nome: 'Geral', participantes: [], criado_por: euId });
      }
      listaModelos.forEach((modelo) => {
        if (!existentes.has(`modelo:${modelo.id}`)) {
          faltando.push({
            tipo: 'modelo',
            modelo_id: modelo.id,
            nome: modelo.nome,
            participantes: [],
            criado_por: euId,
          });
        }
      });
      if (!faltando.length) return listaCanais;

      await Promise.all(
        faltando.map((canal) =>
          base44.entities.ChatCanal.create(canal).catch((falha) => {
            console.warn('[Chat] não consegui criar canal', canal.tipo, falha);
            return null;
          })
        )
      );

      const recarregado = asList(await base44.entities.ChatCanal.list('-created_date', 200, 0));
      const unicos = new Map();
      [...recarregado]
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
        .forEach((canal) => {
          const chave = chaveDeDedupe(canal);
          if (!unicos.has(chave)) unicos.set(chave, canal);
        });
      return [...unicos.values()];
    },
    [euId]
  );

  const carregar = useCallback(async () => {
    if (!euId) return;
    setErro('');
    try {
      const [pessoasCarregadas, modelosCarregados] = await Promise.all([
        carregarPessoas(),
        listar(base44.entities.Modelo.list('-created_date', 100, 0)),
      ]);

      const canaisBrutos = asList(await base44.entities.ChatCanal.list('-created_date', 200, 0));
      const canaisProntos = await garantirCanais(canaisBrutos, modelosCarregados);

      const membrosCarregados = await base44.entities.ChatMembro
        .filter({ usuario_id: euId }, '-created_date', 300, 0)
        .then((resultado) => asList(resultado))
        .catch(() => []);

      const canaisPermitidos = canaisProntos.filter((canal) =>
        canalVisivel(canal, user, modelosCarregados)
      );
      const minhasMensagens = await carregarMensagens(canaisPermitidos);

      setPessoas(pessoasCarregadas);
      setModelos(modelosCarregados);
      setCanais(canaisProntos);
      setMembros(membrosCarregados);
      setMensagens(minhasMensagens);
    } catch (falha) {
      console.error('[Chat] falha ao carregar', falha);
      setErro('Não consegui carregar o chat.');
    } finally {
      setCarregando(false);
    }
  }, [euId, user, carregarPessoas, garantirCanais, carregarMensagens]);

  useEffect(() => {
    if (!euId) return;
    setCarregando(true);
    carregar();
  }, [euId]);

  const canaisVisiveis = useMemo(() => {
    const lista = canais.filter((canal) => canalVisivel(canal, user, modelos));
    // Um canal por modelo e o geral não podem aparecer duas vezes.
    const unicos = new Map();
    ordemDosCanais(lista).forEach((canal) => {
      const chave = chaveDeDedupe(canal);
      if (!unicos.has(chave)) unicos.set(chave, canal);
    });
    return [...unicos.values()];
  }, [canais, modelos, user]);

  useEffect(() => {
    canaisVisiveisRef.current = canaisVisiveis;
  }, [canaisVisiveis]);

  useEffect(() => {
    membrosRef.current = membros;
  }, [membros]);

  /* Se alguém sai de uma modelo ou a conversa deixa de ser visível, o que já
     estava carregado sai da memória do app. */
  useEffect(() => {
    if (!canaisVisiveis.length) return;
    const permitidos = new Set(canaisVisiveis.map((canal) => canal.id));
    setMensagens((anterior) => {
      const filtradas = anterior.filter((mensagem) => permitidos.has(mensagem.canal_id));
      return filtradas.length === anterior.length ? anterior : filtradas;
    });
  }, [canaisVisiveis]);

  const membroDoCanal = useCallback(
    (canalId) => membros.find((membro) => membro.canal_id === canalId),
    [membros]
  );

  const mensagensPorCanal = useMemo(() => {
    const mapa = new Map();
    mensagens.forEach((mensagem) => {
      if (!mapa.has(mensagem.canal_id)) mapa.set(mensagem.canal_id, []);
      mapa.get(mensagem.canal_id).push(mensagem);
    });
    mapa.forEach((lista, chave) => mapa.set(chave, lista.sort(porData)));
    return mapa;
  }, [mensagens]);

  const naoLidasPorCanal = useMemo(() => {
    const mapa = new Map();
    canaisVisiveis.forEach((canal) => {
      const lista = mensagensPorCanal.get(canal.id) || [];
      mapa.set(canal.id, naoLidasDoCanal(lista, membroDoCanal(canal.id), euId));
    });
    return mapa;
  }, [canaisVisiveis, mensagensPorCanal, membroDoCanal, euId]);

  const totalNaoLidas = useMemo(
    () => [...naoLidasPorCanal.values()].reduce((soma, valor) => soma + valor, 0),
    [naoLidasPorCanal]
  );

  const marcarLido = useCallback(
    async (canalId) => {
      if (!canalId || !euId) return;
      const quando = agora();
      const existente = membrosRef.current.find((membro) => membro.canal_id === canalId);
      setMembros((anterior) => {
        if (existente) {
          return anterior.map((membro) =>
            membro.id === existente.id ? { ...membro, ultima_leitura_em: quando } : membro
          );
        }
        const provisorio = {
          id: `local-${canalId}`,
          canal_id: canalId,
          usuario_id: euId,
          ultima_leitura_em: quando,
          arquivado: false,
        };
        return [...anterior, provisorio];
      });
      try {
        if (existente?.id && !String(existente.id).startsWith('local-')) {
          await base44.entities.ChatMembro.update(existente.id, { ultima_leitura_em: quando });
        } else {
          const criado = await base44.entities.ChatMembro.create({
            canal_id: canalId,
            usuario_id: euId,
            ultima_leitura_em: quando,
            arquivado: false,
          });
          const novoId = criado?.id;
          if (novoId) {
            setMembros((anterior) =>
              anterior.map((membro) =>
                membro.canal_id === canalId && String(membro.id).startsWith('local-')
                  ? { ...membro, id: novoId }
                  : membro
              )
            );
          }
        }
      } catch (falha) {
        console.warn('[Chat] não consegui salvar a leitura', falha);
      }
    },
    [euId]
  );

  const abrirCanal = useCallback(
    (canalId) => {
      setCanalAtivoId(canalId);
      if (canalId) marcarLido(canalId);
    },
    [marcarLido]
  );

  const enviar = useCallback(
    async (canalId, texto) => {
      const limpo = String(texto || '').trim();
      if (!canalId || !limpo || !euId) return null;
      setEnviando(true);
      const eu = pessoas.find((pessoa) => pessoa.id === euId);
      try {
        const criada = await base44.entities.ChatMensagem.create({
          canal_id: canalId,
          autor_id: euId,
          autor_nome: eu?.nome || user?.full_name || 'Eu',
          autor_cargo: ehAdmin(user) ? 'admin' : 'chatter',
          tipo: 'texto',
          texto: limpo,
        });
        if (criada?.id) {
          setMensagens((anterior) =>
            anterior.some((mensagem) => mensagem.id === criada.id)
              ? anterior
              : [...anterior, criada].sort(porData)
          );
        }
        await marcarLido(canalId);
        base44.entities.ChatCanal.update(canalId, {
          ultima_mensagem_em: agora(),
          ultima_mensagem_preview: limpo.slice(0, 80),
          ultima_mensagem_autor: eu?.nome || user?.full_name || '',
        }).catch(() => {});
        return criada;
      } catch (falha) {
        console.error('[Chat] não consegui enviar', falha);
        throw falha;
      } finally {
        setEnviando(false);
      }
    },
    [euId, pessoas, user, marcarLido]
  );

  const criarCanal = useCallback(
    async ({ tipo, nome, participantes }) => {
      if (!euId) return null;
      const lista = [...new Set([...(participantes || []), euId])];
      const criado = await base44.entities.ChatCanal.create({
        tipo,
        nome: nome || '',
        participantes: lista,
        criado_por: euId,
      });
      await Promise.all(
        lista.map((usuarioId) =>
          base44.entities.ChatMembro.create({
            canal_id: criado.id,
            usuario_id: usuarioId,
            ultima_leitura_em: usuarioId === euId ? agora() : null,
            arquivado: false,
          }).catch(() => null)
        )
      );
      const recarregado = asList(await base44.entities.ChatCanal.list('-created_date', 200, 0));
      setCanais(recarregado);
      const membrosNovos = asList(
        await base44.entities.ChatMembro.filter({ usuario_id: euId }, '-created_date', 300, 0)
      );
      setMembros(membrosNovos);
      abrirCanal(criado.id);
      return criado;
    },
    [euId, abrirCanal]
  );

  /* ---------------------------------------------------------------- */
  /* Tempo real                                                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!euId) return undefined;
    const entidade = base44.entities.ChatMensagem;
    const dentroDoMeuChat = (dados) =>
      Boolean(dados?.canal_id) &&
      canaisVisiveisRef.current.some((canal) => canal.id === dados.canal_id);

    if (typeof entidade?.subscribe === 'function') {
      const sair = entidade.subscribe((evento) => {
        const dados = evento?.data;
        if (!dentroDoMeuChat(dados)) return;
        if (evento.type === 'create') {
          setMensagens((anterior) =>
            anterior.some((mensagem) => mensagem.id === dados.id)
              ? anterior.map((mensagem) => (mensagem.id === dados.id ? dados : mensagem))
              : [...anterior, dados].sort(porData)
          );
        } else if (evento.type === 'update') {
          setMensagens((anterior) =>
            anterior.map((mensagem) => (mensagem.id === dados.id ? { ...mensagem, ...dados } : mensagem))
          );
        } else if (evento.type === 'delete') {
          setMensagens((anterior) => anterior.filter((mensagem) => mensagem.id !== dados.id));
        }
      });
      return () => {
        try {
          sair();
        } catch (falha) {
          console.warn('[Chat] não consegui fechar o tempo real', falha);
        }
      };
    }

    const timer = setInterval(async () => {
      try {
        const lista = await carregarMensagens();
        setMensagens(lista);
      } catch (falha) {
        console.warn('[Chat] atualização periódica falhou', falha);
      }
    }, INTERVALO_SEM_TEMPO_REAL);
    return () => clearInterval(timer);
  }, [euId, carregarMensagens]);

  /* Canal aberto na tela não acumula badge: o que chega enquanto a pessoa
     está olhando já conta como lido. */
  const marcadasRef = useRef(new Map());
  useEffect(() => {
    if (!canalAtivoId || !euId) return;
    const lista = mensagensPorCanal.get(canalAtivoId) || [];
    const ultima = lista[lista.length - 1];
    /* A chave guarda o que já foi marcado naquele canal. Marca sempre que o
       canal abre ou chega algo novo, inclusive quando a última é minha: o que
       zera o badge é ter o canal aberto, não quem escreveu por último. */
    const chave = ultima?.id || 'vazio';
    if (marcadasRef.current.get(canalAtivoId) === chave) return;
    marcadasRef.current.set(canalAtivoId, chave);
    marcarLido(canalAtivoId);
  }, [canalAtivoId, mensagensPorCanal, euId, marcarLido]);

  /* Som de mensagem nova: toca quando a mensagem é de outra pessoa e ela não
     está com aquele canal aberto na tela. */
  useEffect(() => {
    if (!euId) return;
    const nova = avaliarMensagensChat(mensagens, euId);
    if (!nova) return;
    if (lerFocoDoChat() === nova.canal_id) return;
    tocarSomChat();
  }, [mensagens, euId]);

  const canalAtivo = canaisVisiveis.find((canal) => canal.id === canalAtivoId) || null;
  const mensagensDoCanalAtivo = useMemo(() => {
    if (!canalAtivo?.id) return [];
    return (mensagensPorCanal.get(canalAtivo.id) || []).filter((mensagem) =>
      mensagemVisivel(mensagem, euId)
    );
  }, [canalAtivo, mensagensPorCanal, euId]);

  return {
    carregando,
    erro,
    pessoas,
    modelos,
    canais: canaisVisiveis,
    canalAtivo,
    mensagens: mensagensDoCanalAtivo,
    mensagensPorCanal,
    naoLidasPorCanal,
    totalNaoLidas,
    membroDoCanal,
    abrirCanal,
    fecharCanal: () => setCanalAtivoId(null),
    enviar,
    enviando,
    criarCanal,
    marcarLido,
    recarregar: carregar,
  };
}
