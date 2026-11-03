// Mode démo (développement seulement) : réutilise le faux Supabase des tests (tests/e2e/fake-supabase.ts)
// dans le vrai navigateur. On lui donne une fausse « page » Playwright : ses scripts d'init s'exécutent tout de suite,
// et ses routes répondent à la place de fetch pour l'adresse Supabase.
type Handler = (route: unknown) => unknown;

const HOST = 'joyskjoofihwhycyreyn.supabase.co';

import { SERIES } from '@/data/jetons';

// Tirage au hasard avec les vraies chances de la série (comme le serveur)
function pickByOdds(): string {
  const list = SERIES.Takoras ?? [];
  const w = list.map((j) => 1 / j.odds);
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) if ((r -= w[i] ?? 0) <= 0) return list[i]?.name ?? 'Mobu';
  return list[0]?.name ?? 'Mobu';
}

export async function installDemo() {
  // le module de test encode son faux jeton avec Buffer (Node) : petite version navigateur
  const g = globalThis as unknown as { Buffer?: unknown };
  g.Buffer ??= {
    from: (s: string) => ({
      toString: () => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    }),
  };
  const handlers: Handler[] = [];
  const page = {
    addInitScript: async (fn: (arg: unknown) => void, arg: unknown) => fn(arg),
    route: async (_glob: string, h: Handler) => {
      handlers.push(h);
    },
  };
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const h = handlers[0];
    if (!h || !url.includes(HOST)) return realFetch(input, init);
    const body = typeof init?.body === 'string' ? init.body : null;
    return new Promise<Response>((resolve, reject) => {
      const route = {
        request: () => ({
          url: () => url,
          method: () => init?.method ?? 'GET',
          postData: () => body,
          headers: () => Object.fromEntries(new Headers(init?.headers).entries()),
        }),
        fulfill: async (r: { status?: number; contentType?: string; body?: string; headers?: Record<string, string> }) =>
          resolve(
            new Response(r.body ?? '', {
              status: r.status ?? 200,
              headers: { 'content-type': r.contentType ?? 'application/json', ...(r.headers ?? {}) },
            }),
          ),
        continue: async () => resolve(await realFetch(input, init)),
        abort: async () => reject(new TypeError('aborted')),
      };
      Promise.resolve(h(route)).catch(reject);
    });
  };
  const { fakeSupabase } = await import('../../tests/e2e/fake-supabase');
  await fakeSupabase(
    page as never,
    { stock: 20, coins: 25000, pseudo: 'Testeur' },
    [],
    // chance normale : chaque jeton sort avec sa vraie proba (1 chance sur odds)
    { tuto: false, pnSeen: 999, admin: true, pick: pickByOdds },
  );
}
