import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { protegerEntidades } from '@/lib/leituraProtegida';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const cliente = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  appBaseUrl
});

/* Leitura de entidade passa por cache curto e fila única: muitos painéis e
   widgets pedem a mesma lista ao mesmo tempo, e isso estourava o limite de
   leituras do servidor (ver src/lib/leituraProtegida.js). */
try {
  cliente.entities = protegerEntidades(cliente.entities);
} catch (erro) {
  console.warn('[base44] não consegui proteger as leituras de entidade', erro);
}

export const base44 = cliente;
