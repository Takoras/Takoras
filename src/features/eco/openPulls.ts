import { ecoApi, errorText } from '@/api';
import type { Me } from '@/api/queries';
import { qc } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { translate } from '@/i18n';
import { host } from '@/engines/env';
import { sfx } from '@/engines/sound.js';
import { openUI } from '@/app/ui-store';
import { toast } from '@/ui/toast';
import { MAX_OPEN, mmss, predictEco } from './eco';

// Le moteur d'ouverture n'est chargé qu'au premier pull (il est lourd) : import à la demande
const engine = () => import('@/engines/opening.js');
const meKey = () => ['me', useAuth.getState().user?.id];
const meState = () => qc.getQueryState<Me>(meKey());
const eco = () => {
  const st = meState();
  return st?.data ? predictEco(st.data, st.dataUpdatedAt, Date.now()) : null;
};

let busy = false;
// Ouvre 1 pull ou tout le stock (max 50) : le serveur retire les pulls et tire les jetons, on joue l'animation
export async function openPulls(n: number | 'all') {
  const user = useAuth.getState().user;
  if (!user) return openUI('account');
  const e = eco(),
    me = meState()?.data;
  if (!e || !me?.pseudo || busy) return;
  const count = n === 'all' ? Math.min(e.stock, MAX_OPEN) : Math.min(1, e.stock);
  if (!count) return sfx.deny();
  busy = true;
  try {
    const { debug, buy } = await engine();
    const test = me.admin || me.tester; // tirages de test : seulement admin et testeurs (le serveur vérifie aussi)
    const data = (await ecoApi.takePulls(
      count,
      test ? { force: debug.force || undefined, luck: debug.luck, p_variant: debug.variant || undefined } : {},
    )) as {
      state: Me;
      results: string[];
      variants?: (string | null)[];
      lucks?: number[];
      ids?: number[];
    };
    qc.setQueryData(meKey(), data.state);
    buy(data.results.length, data.results, data.variants ?? null, data.lucks ?? null, data.ids ?? null);
  } catch (err) {
    sfx.deny();
    toast(errorText(err, useSettings.getState().lang), true);
    void qc.invalidateQueries({ queryKey: ['me'] });
  } finally {
    busy = false;
  }
}

// Boutons de fin d'ouverture : « Ouvrir encore » / « Tout ouvrir », selon le stock restant
function ecoDecorate() {
  const e = eco();
  const again = document.getElementById('op-again') as HTMLButtonElement | null,
    all = document.getElementById('op-recap-again') as HTMLButtonElement | null;
  if (!e || !again || !all) return;
  const lang = useSettings.getState().lang,
    wait = translate(lang, 'ui.no_pull', { t: mmss(e.nextIn) });
  again.disabled = !e.stock;
  again.textContent = e.stock ? translate(lang, 'ui.open_again', { n: e.stock }) : wait;
  all.disabled = !e.stock;
  all.textContent = e.stock ? translate(lang, 'ui.open_all', { n: Math.min(e.stock, MAX_OPEN) }) : wait;
}

// Branche les crochets du moteur d'ouverture sur React (appelé une fois au démarrage)
let installed = false;
export function installOpeningHost() {
  if (installed) return;
  installed = true;
  host.openPulls = (n) => void openPulls(n);
  host.applyState = (st) => qc.setQueryData(meKey(), st);
  host.ecoDecorate = ecoDecorate;
  host.accRecordPull = () => {
    void qc.invalidateQueries({ queryKey: ['history'] });
    void qc.invalidateQueries({ queryKey: ['live'] });
    return true;
  };
  host.renderHist = () => void qc.invalidateQueries({ queryKey: ['history'] });
  host.loadLocalHist = () => {
    try {
      return JSON.parse(localStorage.getItem('takoras-hist') ?? '[]') as unknown[];
    } catch {
      return [];
    }
  };
  // Pendant une ouverture sans pull restant : le compte à rebours des boutons avance chaque seconde
  setInterval(() => {
    if (document.getElementById('opening')?.classList.contains('on')) ecoDecorate();
  }, 1000);
  // Une ouverture interrompue (rechargement de page) reprend où elle en était
  if (localStorage.getItem('takoras-session')) void engine();
}
