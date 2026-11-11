import { useRef, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { hexRGB, jetonOf, MYSTERE, SERIES, texOf, type Jeton } from '@/data/jetons';
import { useJn } from '@/lib/names';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { openUI } from '@/app/ui-store';
import { openPatchnotes } from '@/features/beta/store';
import { tables } from '@/api';
import { Button } from '@/ui/Button';
import { PixelBg } from '@/ui/PixelBg';
import { useSwingAll } from '@/ui/useSwing';
import { useStaggerIn } from '@/ui/useStaggerIn';
import { Live } from '../home/Feeds';
import { openInfo } from '../info/store';
import s from './Landing.module.css';

// Textes de la page (courts : une phrase par page du jeu)
const TXT = {
  fr: {
    login: 'Se connecter',
    pull: [
      'Tirages',
      'Ouvre des jetons',
      'Tes tirages se rechargent tout seuls. Tape sur le jeton mystère : il se fissure, la chance grimpe, puis il révèle ce que tu as eu.',
    ],
    inv: [
      'Inventaire',
      'Remplis ton bestiaire',
      'Chaque série a ses jetons, du plus commun au 1 sur 1 000 000. Et chacun peut sortir en Doré, Céleste ou Ombre.',
    ],
    fight: [
      'Combat',
      'Monte au classement',
      'Choisis 3 jetons, chacun avec son pouvoir, et grimpe de Bois jusqu’au rang Takoras.',
    ],
    shop: [
      'Boutique',
      'Une boutique mystère chaque jour',
      'Les cases sont cachées. Révèle-les pour gagner des pièces, et tombe sur l’objet à la une en réduction.',
    ],
    pass: [
      'Passe de combat',
      '50 paliers de récompenses',
      'Joue, gagne de l’XP et récupère des pièces, des potions et des exclusivités de saison.',
    ],
    prof: [
      'Profil et amis',
      'Montre ta collection',
      'Ta vitrine, ton meilleur jeton, ton rang. Ajoute tes amis et compare vos bestiaires.',
    ],
    free: 'Gratuit · dans le navigateur',
  },
  en: {
    login: 'Log in',
    pull: [
      'Pulls',
      'Open tokens',
      'Your pulls refill on their own. Tap the mystery token: it cracks, the odds climb, then it reveals what you got.',
    ],
    inv: [
      'Inventory',
      'Fill your bestiary',
      'Each series has its tokens, from the most common to 1 in 1,000,000. And each one can come out Gold, Celestial or Shadow.',
    ],
    fight: [
      'Battle',
      'Climb the ladder',
      'Pick 3 tokens, each with its own power, and climb from Wood up to the Takoras rank.',
    ],
    shop: [
      'Shop',
      'A mystery shop every day',
      'The slots are hidden. Reveal them to earn coins, and find the featured item on sale.',
    ],
    pass: ['Battle pass', '50 reward tiers', 'Play, earn XP and collect coins, potions and season exclusives.'],
    prof: [
      'Profile and friends',
      'Show your collection',
      'Your showcase, your best token, your rank. Add friends and compare bestiaries.',
    ],
    free: 'Free · in your browser',
  },
} as const;

const fmt = (n: number, lang: Parameters<typeof locale>[0]) => n.toLocaleString(locale(lang));
const J = (name: string) => jetonOf(name);
const tok = (j: Jeton) => <img className="px" src={texOf(j)} alt="" draggable={false} />;

// Une section : à gauche (ou à droite) le texte et le bouton de connexion, de l'autre côté l'aperçu
type SecKey = 'pull' | 'inv' | 'fight' | 'shop' | 'pass' | 'prof';
function Sec({ k, flip, children }: { k: SecKey; flip?: boolean; children: ReactNode }) {
  const lang = useSettings((x) => x.lang);
  const L = TXT[lang === 'en' ? 'en' : 'fr'];
  return (
    <section className={`${s.sec} ${flip ? s.flip : ''}`} aria-labelledby={`land-${k}`}>
      <div className={s.secTxt}>
        <span className={s.tag}>{L[k][0]}</span>
        <h2 id={`land-${k}`}>{L[k][1]}</h2>
        <p>{L[k][2]}</p>
        <Button size="sm" onClick={() => openUI('account')}>
          {L.login}
        </Button>
      </div>
      <div className={s.secArt}>{children}</div>
    </section>
  );
}

// Accueil des visiteurs, même DA que le reste du site : le jeu en une phrase et « Jouer », puis une section par page
// du jeu (tirages, inventaire, combat, boutique, passe, profil), chacune avec un aperçu fait des vrais éléments du
// site et un bouton pour se connecter.
export function Landing() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const L = TXT[lang === 'en' ? 'en' : 'fr'];
  const play = () => openUI('account');
  const root = useRef<HTMLDivElement>(null);
  useStaggerIn(root, `.${s.heroTxt} > *, .${s.heroArt}, .${s.live}, .${s.sec}`, true);
  useSwingAll(root, `.${s.card}, .${s.mini}, .${s.tile}`, 0.4);
  const takoras = SERIES.Takoras ?? [];
  const star = J('Néphéris');
  const sorted = [...takoras].sort((a, b) => a.odds - b.odds);
  const still = reducedFx();

  return (
    <div ref={root} className={s.page}>
      {/* ---------- le jeu en une phrase ---------- */}
      <section className={s.hero} aria-labelledby="land-title">
        <PixelBg className={s.heroBg} odds={100000} glow={star.glow} still={still} />
        <div className={s.heroTxt}>
          <span className={s.tag}>{L.free}</span>
          <h1 id="land-title">{t('ui.land_title')}</h1>
          <p>{t('ui.land_lead')}</p>
          <div className={s.ctas}>
            <Button variant="primary" size="lg" onClick={play}>
              {t('ui.land_play')}
            </Button>
            <button type="button" className={s.link} onClick={openInfo}>
              {t('ui.odds_info')}
            </button>
          </div>
        </div>
        {/* un gros jeton qui flotte, entouré de quelques autres */}
        <div className={s.heroArt} aria-hidden>
          <span className={s.big}>{tok(star)}</span>
          {['Mobu', 'Pikko', 'Vyolis', 'Nyx', 'Carmin'].map((n, i) => (
            <span key={n} className={s.orb} style={{ '--i': i } as CSSProperties}>
              {tok(J(n))}
            </span>
          ))}
        </div>
      </section>

      <div className={s.live}>
        <Live />
      </div>

      {/* ---------- tirages ---------- */}
      <Sec k="pull">
        <div className={s.pull}>
          <span className={s.mys}>
            <img className="px" src={MYSTERE} alt="" />
          </span>
          <ul className={s.odds}>
            {[sorted[0], sorted[4], sorted[7], sorted[11], sorted[sorted.length - 1]]
              .filter((j): j is Jeton => !!j)
              .map((j) => (
                <li key={j.name} className={s.mini} style={{ '--g': hexRGB(j.glow) } as CSSProperties}>
                  {tok(j)}
                  <b>{jn(j.name)}</b>
                  <small>1/{fmt(j.odds, lang)}</small>
                </li>
              ))}
          </ul>
        </div>
      </Sec>

      {/* ---------- inventaire ---------- */}
      <Sec k="inv" flip>
        <ul className={s.grid}>
          {sorted.slice(0, 8).map((j, i) => {
            const have = ![2, 5, 7].includes(i);
            return (
              <li key={j.name} className={`${s.card} ${have ? '' : s.unk}`}>
                <small>#{have ? String(i + 1).padStart(2, '0') : '?'}</small>
                <img className="px" src={have ? texOf(j) : MYSTERE} alt="" />
                <b>{have ? jn(j.name) : '???'}</b>
                <span className={s.stamps}>
                  {(['gold', 'celeste', 'ombre'] as const).map((v, k) => (
                    <i
                      key={v}
                      className={have && (i + k) % 3 === 0 ? undefined : s.off}
                      style={{ backgroundImage: `url(/img/stamps/${v}.png)` }}
                    />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </Sec>

      {/* ---------- combat ---------- */}
      <Sec k="fight">
        <div className={s.fight}>
          <div className={s.team}>
            {['Rouillé', 'Givre', 'Azura'].map((n) => (
              <span key={n} className={s.mini}>
                {tok(J(n))}
              </span>
            ))}
          </div>
          <ul className={s.ranks}>
            {[1, 4, 7, 10, 13, 16].map((r) => (
              <li key={r}>
                <img className="px" src={`/img/ranks/rank${r}.png`} alt="" />
              </li>
            ))}
          </ul>
        </div>
      </Sec>

      {/* ---------- boutique ---------- */}
      <Sec k="shop" flip>
        <ul className={s.shop}>
          <li className={`${s.card} ${s.item}`}>
            <span className={s.sale}>−40%</span>
            <img className="px" src="/img/potions/chance-10.png" alt="" />
            <b>Chance ×10</b>
            <small>
              <img className="px" src="/img/piece.png" alt="" width={14} height={14} /> 900
            </small>
          </li>
          {[0, 1, 2].map((i) => (
            <li key={i} className={`${s.card} ${s.cover}`}>
              <span>
                +100 <img className="px" src="/img/piece.png" alt="" width={16} height={16} />
              </span>
            </li>
          ))}
        </ul>
      </Sec>

      {/* ---------- passe ---------- */}
      <Sec k="pass">
        <ol className={s.track}>
          {[
            ['/img/piece.png', '100', true],
            ['/img/potions/chance-2.png', '×2', true],
            ['/img/piece.png', '300', false],
            ['/img/objets/sablier.png', '', false],
            ['/img/pp/oeil.png', '', false],
          ].map(([src, n, done], i) => (
            <li key={i} className={done ? s.done : undefined}>
              <span className={`${s.tile} ${i === 4 ? s.excl : ''}`}>
                <img className={`px ${i === 4 ? s.round : ''}`} src={src as string} alt="" />
                {n ? <b>{n}</b> : null}
              </span>
              <i>{i + 1}</i>
            </li>
          ))}
        </ol>
      </Sec>

      {/* ---------- profil ---------- */}
      <Sec k="prof" flip>
        <div className={s.prof}>
          <div className={s.pfBanner}>
            <PixelBg className={s.pfBg} odds={5000} glow={J('Vyolis').glow} still />
          </div>
          <div className={s.pfId}>
            <span className={s.pfPp}>
              <img className="px" src="/img/pp/bleu.png" alt="" />
            </span>
            <b>Takoras</b>
            <img className={`px ${s.pfRank}`} src="/img/ranks/rank10.png" alt="" />
          </div>
          <ul className={s.pfShow}>
            {['Vyolis', 'Nyx', 'Lumis'].map((n) => (
              <li key={n} className={s.mini}>
                {tok(J(n))}
                <b>{jn(n)}</b>
              </li>
            ))}
          </ul>
        </div>
      </Sec>

      {/* ---------- dernier appel ---------- */}
      <section className={s.final} aria-labelledby="land-final">
        <h2 id="land-final">{t('ui.land_final')}</h2>
        <Button variant="primary" size="lg" onClick={play}>
          {t('ui.land_play')}
        </Button>
      </section>

      <footer className={s.foot}>
        <span>© Takoras</span>
        <button type="button" onClick={openPatchnotes}>
          {t('ui.pn_title')}
        </button>
        <a href="#credits">{t('ui.land_credits')}</a>
        <Link to="/legal">{t('ui.legal_notice')}</Link>
        <Link to="/terms">{t('ui.terms')}</Link>
        <Link to="/privacy">{t('ui.privacy')}</Link>
        <Credits />
      </footer>
    </div>
  );
}

function Credits() {
  const t = useT();
  const q = useQuery({
    queryKey: ['credits'],
    queryFn: async () => (await tables.credits()).data ?? [],
    staleTime: 3_600_000,
  });
  return (
    <div id="credits" className={s.credits}>
      <b>{t('ui.land_credits')}</b>
      {q.isPending ? (
        <p>…</p>
      ) : (
        <ul>
          {(q.data ?? []).map((c) => (
            <li key={c.id}>
              {c.title} · {c.author} ·{' '}
              {c.url ? (
                <a href={c.url} rel="noreferrer noopener" target="_blank">
                  {c.license}
                </a>
              ) : (
                c.license
              )}
            </li>
          ))}
        </ul>
      )}
      <p>{t('ui.land_credits_txt')}</p>
    </div>
  );
}
