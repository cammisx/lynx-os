import { useEffect } from 'react';

/**
 * Contas que ficam com a janela aberta continuavam rodando o código do dia
 * anterior e mostravam mensagens novas "vazias" (o componente antigo não sabia
 * do anexo). Aqui o app compara, de tempos em tempos, qual é o arquivo de
 * script publicado e se atualiza sozinho quando sai um deploy novo.
 */

const INTERVALO_MS = 120000;
const TRAVA_MS = 300000;
const CHAVE_TRAVA = 'lynx-versao-recarregada';

const scriptAtual = () => {
  const script = Array.from(document.scripts || []).find((tag) =>
    /\/assets\/[^/]+\.js(\?|$)/.test(tag.src || '')
  );
  return script?.src || '';
};

/** Não troca o app debaixo de quem está escrevendo ou fora da tela. */
const podeRecarregar = () => {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return false;
  const alvo = document.activeElement;
  if (!alvo) return true;
  const tag = (alvo.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
  if (alvo.isContentEditable) return false;
  return true;
};

const scriptPublicado = async () => {
  const resposta = await fetch(`/?_versao=${Date.now()}`, { cache: 'no-store' });
  if (!resposta.ok) return '';
  const html = await resposta.text();
  const achado = html.match(/src="([^"]*\/assets\/[^"]+\.js)"/);
  return achado?.[1] || '';
};

/** Compara pelo nome do arquivo: um lado vem absoluto, o outro relativo. */
const nomeDoScript = (url) => String(url || '').split('/').pop().split('?')[0];

/** Evita laço quando o bundle novo não carrega (cache do navegador, por ex). */
const recarregouHaPouco = () => {
  try {
    const marca = Number(sessionStorage.getItem(CHAVE_TRAVA) || 0);
    return marca > 0 && Date.now() - marca < TRAVA_MS;
  } catch (erro) {
    return false;
  }
};

export default function useVersaoPublicada() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const atual = scriptAtual();
    if (!atual) return undefined;

    let ativo = true;
    const conferir = async () => {
      if (!ativo || !podeRecarregar() || recarregouHaPouco()) return;
      try {
        const publicado = await scriptPublicado();
        if (!ativo || !publicado) return;
        if (nomeDoScript(publicado) === nomeDoScript(atual)) return;
        try {
          sessionStorage.setItem(CHAVE_TRAVA, String(Date.now()));
        } catch (erro) {
          // sem sessionStorage, segue sem a trava
        }
        window.location.reload();
      } catch (falha) {
        // rede oscilou: tenta no próximo ciclo
      }
    };

    const timer = setInterval(conferir, INTERVALO_MS);
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') conferir();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      ativo = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);
}
