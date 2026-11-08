import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ehCelular } from '@/lib/perfilLogica';
import {
  SOM_PADRAO,
  definirPreferenciaSom,
  definirPreferenciaSomChat,
  preaquecerSons,
  tocarNotificacao,
  tocarSom,
} from '@/lib/sons';
import { lembrarNavegadorLigado } from '@/lib/notificacaoNavegador';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const PADRAO = {
  som: SOM_PADRAO,
  ativo: true,
  volume: 60,
  som_chat: 'mensagem',
  chat_ativo: true,
  volume_chat: 60,
  /* Avisos por e-mail: menção vem ligada, "todas as mensagens" não. */
  notificar_email: true,
  email_todas: false,
  notificar_navegador: false,
};

/**
 * Cada ajuste de som mora num campo do banco por aparelho. O e-mail é a
 * exceção: vale para a conta inteira, então fica fora desta tabela.
 */
const CAMPOS = {
  desktop: {
    som: 'som',
    ativo: 'ativo',
    volume: 'volume',
    som_chat: 'som_chat',
    chat_ativo: 'chat_ativo',
    volume_chat: 'volume_chat',
    notificar_navegador: 'notificar_navegador',
  },
  celular: {
    som: 'som_celular',
    ativo: 'ativo_celular',
    volume: 'volume_celular',
    som_chat: 'som_chat_celular',
    chat_ativo: 'chat_ativo_celular',
    volume_chat: 'volume_chat_celular',
    notificar_navegador: 'notificar_navegador_celular',
  },
};

const DO_APARELHO = [
  'som',
  'ativo',
  'volume',
  'som_chat',
  'chat_ativo',
  'volume_chat',
  'notificar_navegador',
];

const COMPARTILHADOS = ['notificar_email', 'email_todas'];

const simPorPadrao = (valor) => valor !== false;
const naoPorPadrao = (valor) => valor === true;

/** Campo que pode ainda não existir no banco (schema antigo) ou nunca ter sido escolhido. */
const vazio = (valor) => valor === undefined || valor === null || valor === '';

/**
 * Valor do aparelho no registro: o campo do celular manda; enquanto ninguém
 * escolheu nada no celular, o do desktop serve de ponto de partida (mesma
 * ideia do tema e do fundo, que nascem copiando o outro aparelho).
 */
const doAparelho = (registro, aparelho) => {
  const campos = CAMPOS[aparelho];
  const outro = CAMPOS[aparelho === 'celular' ? 'desktop' : 'celular'];
  const saida = {};
  DO_APARELHO.forEach((chave) => {
    const proprio = registro?.[campos[chave]];
    saida[chave] = vazio(proprio) ? registro?.[outro[chave]] : proprio;
  });
  return saida;
};

const normalizar = (dados) => ({
  som: dados.som || SOM_PADRAO,
  ativo: simPorPadrao(dados.ativo),
  volume: typeof dados.volume === 'number' ? dados.volume : 60,
  som_chat: dados.som_chat || 'mensagem',
  chat_ativo: simPorPadrao(dados.chat_ativo),
  volume_chat: typeof dados.volume_chat === 'number' ? dados.volume_chat : 60,
  notificar_navegador: naoPorPadrao(dados.notificar_navegador),
});

const montarPref = (registro, aparelho) => ({
  ...normalizar(doAparelho(registro || {}, aparelho)),
  notificar_email: simPorPadrao(registro?.notificar_email),
  email_todas: naoPorPadrao(registro?.email_todas),
});

/** Traduz o que a tela mandou para as colunas do banco, só as do aparelho. */
const paraBanco = (dados, aparelho) => {
  const campos = CAMPOS[aparelho];
  const saida = {};
  DO_APARELHO.forEach((chave) => {
    if (Object.prototype.hasOwnProperty.call(dados, chave)) {
      saida[campos[chave]] = dados[chave];
    }
  });
  COMPARTILHADOS.forEach((chave) => {
    if (Object.prototype.hasOwnProperty.call(dados, chave)) {
      saida[chave] = dados[chave];
    }
  });
  return saida;
};

/**
 * Preferência de som de notificação de cada pessoa (entidade PreferenciaSom).
 *
 * Som, volume, liga/desliga, som do chat e aviso do navegador são escolhidos
 * por aparelho: o que você escolhe no celular não mexe no computador. Os
 * avisos por e-mail são da conta inteira, então valem nos dois.
 */
export default function usePreferenciaSom() {
  const { user } = useAuth();
  const userId = user?.id;
  const [registro, setRegistro] = useState(null);
  const [aparelho, setAparelho] = useState(() => (ehCelular() ? 'celular' : 'desktop'));
  const [carregado, setCarregado] = useState(false);
  const idRef = useRef('');
  const timerRef = useRef(null);
  const aparelhoRef = useRef(aparelho);
  aparelhoRef.current = aparelho;

  const pref = useMemo(() => montarPref(registro, aparelho), [registro, aparelho]);
  const prefRef = useRef(pref);
  prefRef.current = pref;

  /* Girar o telefone ou estreitar a janela troca o conjunto em uso sem
     recarregar a página. */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(max-width: 767px)');
    const ouvir = () => setAparelho(media.matches ? 'celular' : 'desktop');
    ouvir();
    media.addEventListener('change', ouvir);
    return () => media.removeEventListener('change', ouvir);
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    let ativo = true;

    const carregar = async () => {
      try {
        const lista = asList(await base44.entities.PreferenciaSom.filter({ usuario_id: userId }));
        if (!ativo) return;
        const achado = lista[0];
        if (achado) {
          idRef.current = achado.id;
          setRegistro(achado);
        } else {
          const criado = await base44.entities.PreferenciaSom.create({
            usuario_id: userId,
            ...paraBanco(PADRAO, 'desktop'),
            notificar_email: PADRAO.notificar_email,
            email_todas: PADRAO.email_todas,
          });
          if (criado?.id) idRef.current = criado.id;
          if (ativo) setRegistro(criado || { usuario_id: userId, ...PADRAO });
        }
      } catch (error) {
        console.warn('[PreferenciaSom]', error);
        if (ativo) setRegistro((atual) => atual || { ...PADRAO });
      } finally {
        if (ativo) {
          setCarregado(true);
          preaquecerSons();
        }
      }
    };

    carregar();
    return () => {
      ativo = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userId]);

  /* O que toca de verdade segue o aparelho em uso. */
  useEffect(() => {
    definirPreferenciaSom({ ...pref, volume: pref.volume / 100 });
    definirPreferenciaSomChat({
      som: pref.som_chat,
      ativo: pref.chat_ativo,
      volume: pref.volume_chat / 100,
    });
  }, [pref]);

  useEffect(() => {
    lembrarNavegadorLigado(pref.notificar_navegador);
  }, [pref.notificar_navegador]);

  const persistir = useCallback(
    (dados) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const noBanco = paraBanco(dados, aparelhoRef.current);
        try {
          if (idRef.current) {
            await base44.entities.PreferenciaSom.update(idRef.current, noBanco);
            return;
          }
          if (!userId) return;
          const criado = await base44.entities.PreferenciaSom.create({
            usuario_id: userId,
            ...paraBanco(PADRAO, 'desktop'),
            notificar_email: PADRAO.notificar_email,
            email_todas: PADRAO.email_todas,
            ...noBanco,
          });
          if (criado?.id) idRef.current = criado.id;
        } catch (error) {
          console.warn('[PreferenciaSom] salvar', error);
        }
      }, 350);
    },
    [userId]
  );

  const atualizar = useCallback(
    (dados, { tocar = false } = {}) => {
      setRegistro((atual) => ({ ...(atual || {}), ...paraBanco(dados, aparelhoRef.current) }));
      if (tocar) tocarNotificacao();
      persistir(dados);
    },
    [persistir]
  );

  // Escolher um som toca a prévia mesmo com o som desligado (é um clique explícito),
  // mas não religa as notificações sozinho.
  const escolherSom = useCallback(
    (som) => {
      atualizar({ som });
      tocarSom(som, (prefRef.current.volume || 0) / 100);
    },
    [atualizar]
  );
  const alternarSom = useCallback(
    (valor) => atualizar({ ativo: valor }, { tocar: valor }),
    [atualizar]
  );
  const mudarVolume = useCallback(
    (volume) => {
      atualizar({ volume });
      tocarSom(prefRef.current.som, volume / 100);
    },
    [atualizar]
  );

  /* Som das mensagens: escolha própria, independente da notificação. */
  const escolherSomChat = useCallback(
    (som) => {
      atualizar({ som_chat: som });
      tocarSom(som, (prefRef.current.volume_chat || 0) / 100);
    },
    [atualizar]
  );
  const alternarSomChat = useCallback(
    (valor) => atualizar({ chat_ativo: valor }, { tocar: valor }),
    [atualizar]
  );
  const mudarVolumeChat = useCallback(
    (volume) => {
      atualizar({ volume_chat: volume });
      tocarSom(prefRef.current.som_chat, volume / 100);
    },
    [atualizar]
  );

  /* Avisos por e-mail e notificação do navegador. */
  const alternarEmailMencoes = useCallback(
    (valor) => atualizar({ notificar_email: valor }),
    [atualizar]
  );
  const alternarEmailTodas = useCallback(
    (valor) => atualizar({ email_todas: valor }),
    [atualizar]
  );
  const alternarNotificacaoNavegador = useCallback(
    (valor) => {
      lembrarNavegadorLigado(valor);
      atualizar({ notificar_navegador: valor });
    },
    [atualizar]
  );

  return {
    pref,
    carregado,
    aparelho,
    escolherSom,
    alternarSom,
    mudarVolume,
    escolherSomChat,
    alternarSomChat,
    mudarVolumeChat,
    alternarEmailMencoes,
    alternarEmailTodas,
    alternarNotificacaoNavegador,
  };
}
