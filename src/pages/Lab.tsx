import { useState } from 'react';
import { startRing, closeRing, startRingTuto, RNG } from '@/engines/ring.js';
import { CINE } from '@/engines/cinema.js';
import { SERIES } from '@/data/jetons';
import { Button } from '@/ui/Button';

// Labo de développement (jamais dans le site en ligne) : lancer les moteurs portés et vérifier qu'ils ne fuient pas.
type LeakReport = { rounds: number; overlays: number; listenersLeft: number; rafAfterClose: number };
const TEAMS: [{ name: string; lvl: number }[], { name: string; lvl: number }[]] = [
  [{ name: 'Mobu', lvl: 3 }, { name: 'Soléo', lvl: 2 }, { name: 'Nyx', lvl: 1 }],
  [{ name: 'Kraïos', lvl: 2 }, { name: 'Astra', lvl: 1 }, { name: 'Koi', lvl: 1 }],
];

// Suit chaque écouteur global (type + fonction) encore branché, et compte les rappels d'animation pendant la mesure
function instrument() {
  const live = new Set<string>(), ids = new WeakMap<object, number>();
  let raf = 0, next = 0;
  const key = (type: string, fn: unknown) => {
    if (typeof fn !== 'function' && (typeof fn !== 'object' || !fn)) return type;
    if (!ids.has(fn)) ids.set(fn, ++next);
    return `${type}#${ids.get(fn)}`;
  };
  const add = window.addEventListener.bind(window), rem = window.removeEventListener.bind(window), req = window.requestAnimationFrame.bind(window);
  window.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, o?: boolean | AddEventListenerOptions) => { live.add(key(type, fn)); return add(type, fn, o); }) as typeof add;
  window.removeEventListener = ((type: string, fn: EventListenerOrEventListenerObject, o?: boolean | EventListenerOptions) => { live.delete(key(type, fn)); return rem(type, fn, o); }) as typeof rem;
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => { raf++; return req(cb); }) as typeof req;
  return { get live() { return live.size; }, get raf() { return raf; }, restore() { window.addEventListener = add; window.removeEventListener = rem; window.requestAnimationFrame = req; } };
}

async function leakTest(rounds = 50): Promise<LeakReport> {
  const m = instrument();
  for (let i = 0; i < rounds; i++) {
    startRing(TEAMS, { ai: 'normal' });
    await new Promise((r) => setTimeout(r, 30));
    closeRing();
  }
  await new Promise((r) => setTimeout(r, 400)); // laisse les fondus de sortie finir
  const before = m.raf;
  await new Promise((r) => setTimeout(r, 500));
  const report = { rounds, overlays: document.querySelectorAll('.rg, .rg-res').length, listenersLeft: m.live, rafAfterClose: m.raf - before };
  m.restore();
  return report;
}

declare global { interface Window { __lab?: { leakTest: typeof leakTest; startRing: typeof startRing; closeRing: typeof closeRing; RNG: typeof RNG } } }
window.__lab = { leakTest, startRing, closeRing, RNG };

export default function Lab() {
  const [report, setReport] = useState<LeakReport | null>(null);
  const jetons = SERIES.Takoras ?? [];
  return (
    <section style={{ display: 'grid', gap: 'var(--s-4)' }}>
      <h1>Labo des moteurs</h1>
      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        <Button variant="primary" onClick={() => startRing(TEAMS, { ai: 'normal' })}>Ring contre l’IA</Button>
        <Button onClick={() => startRingTuto()}>Tuto du Ring</Button>
        {jetons.filter((j) => j.odds >= 1000).map((j) => (
          <Button key={j.name} size="sm" onClick={() => void CINE.play(j)}>Cinématique {j.name}</Button>
        ))}
        <Button variant="danger" onClick={async () => setReport(await leakTest())}>Test de fuites (50 ×)</Button>
      </div>
      {report ? <pre data-testid="leak">{JSON.stringify(report, null, 2)}</pre> : null}
    </section>
  );
}
