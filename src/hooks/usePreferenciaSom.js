import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  SOM_PADRAO,
  definirPreferenciaSom,
  preaquecerSons,
  tocarNotificacao,
  tocarSom,
} from '@/lib/sons';

const asList = (result) => (Array.isArray(result) ? result : result?.items || []);

const PADRAO = { som: SOM_PADRAO, ativo: true, volume: 60 };

/** Preferência de som de notificação de cada pessoa, salva em PreferenciaSom. */
export default function usePreferenciaSom() {
  const { user } = useAuth();
  const userId = user?.id;
  const [pref, setPref] = useState(PADRAO);
  const [carregado, setCarregado] = useState(false);
  const idRef = useRef('');
  const timerRef = useRef(null);
  const prefRef = useRef(PADRAO);

  useEffect(() => {
    if (!userId) return undefined;
    let ativo = true;

    const carregar = async () => {
      try {
        const lista = asList(await base44.entities.PreferenciaSom.filter({ usuario_id: userId }));
        if (!ativo) return;
        const registro = lista[0];
        if (registro) {
          idRef.current = registro.id;
          const dados = {
            som: registro.som || SOM_PADRAO,
            ativo: registro.ativo !== false,
            volume: typeof registro.volume === 'number' ? registro.volume : 60,
          };
          prefRef.current = dados;
          setPref(dados);
          definirPreferenciaSom({ ...dados, volume: dados.volume / 100 });
        } else {
          const criado = await base44.entities.PreferenciaSom.create({
            usuario_id: userId,
            ...PADRAO,
          });
          if (criado?.id) idRef.current = criado.id;
          if (ativo) definirPreferenciaSom({ ...PADRAO, volume: PADRAO.volume / 100 });
        }
      } catch (error) {
        console.warn('[PreferenciaSom]', error);
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

  const persistir = useCallback(
    (dados) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          if (idRef.current) {
            await base44.entities.PreferenciaSom.update(idRef.current, dados);
            return;
          }
          if (!userId) return;
          const criado = await base44.entities.PreferenciaSom.create({
            usuario_id: userId,
            ...PADRAO,
            ...dados,
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
      const proximo = { ...prefRef.current, ...dados };
      prefRef.current = proximo;
      setPref(proximo);
      definirPreferenciaSom({ ...proximo, volume: proximo.volume / 100 });
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
      tocarSom(som, prefRef.current.volume / 100);
    },
    [atualizar]
  );
  const alternarSom = useCallback(
    (valor) => atualizar({ ativo: valor }, { tocar: valor }),
    [atualizar]
  );
  const mudarVolume = useCallback((volume) => atualizar({ volume }), [atualizar]);

  return { pref, carregado, escolherSom, alternarSom, mudarVolume };
}
