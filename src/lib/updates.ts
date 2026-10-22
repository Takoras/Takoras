// Mise à jour automatique : quand une nouvelle version du site est en ligne, les pages ouvertes se rechargent toutes seules.
// On compare l'identifiant de cette version (__BUILD_ID__) à celui de /version.json, toutes les 60 s et quand on revient sur l'onglet.
// Le rechargement attend un moment calme : pas pendant une ouverture de pulls, un match du Ring ou une saisie.
const EVERY = 60_000;
let pending = false;

const busy = () => {
  if (document.querySelector('#opening.on, .rg')) return true; // ouverture ou match en cours
  const a = document.activeElement;
  return !!a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && (a as HTMLInputElement).value !== '')); // en train d'écrire
};

function reloadWhenCalm() {
  if (busy()) return void setTimeout(reloadWhenCalm, 5000);
  location.reload();
}

export async function checkForUpdate() {
  if (pending) return;
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const { id } = (await r.json()) as { id?: string };
    if (id && id !== __BUILD_ID__) {
      pending = true;
      reloadWhenCalm();
    }
  } catch {
    /* hors ligne : on réessaiera */
  }
}

export function watchUpdates() {
  if (!import.meta.env.PROD) return;
  setInterval(() => void checkForUpdate(), EVERY);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });
}
