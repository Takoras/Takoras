import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useMe } from '@/api/queries';
import { useResetWatch } from '@/lib/resetWatch';
import { kickDoodle } from '@/lib/doodle';
import { installMouseDepth } from '@/lib/mouseDepth';
import { qc } from '@/lib/queryClient';
import { sfx } from '@/engines/sound.js';
import { useAuth, signOut } from '@/lib/auth';
import { locale } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Tween } from '@/ui/Tween';
import { Announcements, openAnnHistory, unreadAnn, useAnn } from '@/features/social/Announcements';
import { SocialLayer } from '@/features/social/SocialLayer';
import { DebugPanel } from '@/features/admin/DebugPanel';
import { BetaChip, BetaLayer, openPatchnotes } from '@/features/beta/Beta';
import { openFeedback, openTester } from '@/features/beta/store';
import { badgeOf, useFriends } from '@/features/social/social';
import { publicApi } from '@/api';
import { useOnlinePresence } from '@/lib/online';
import { Icon } from './Icon';
import { setPreview, usePreview } from '@/lib/preview';
import { NAV } from './nav';
import { openUI, useUI } from './ui-store';
import s from './Layout.module.css';

// Pastille rouge (demandes d'ami, messages, annonces non lues)
const Badge = ({ n }: { n: number }) =>
  n ? (
    <i className={s.nbadge} aria-label={`(${n})`}>
      {n > 9 ? '9+' : n}
    </i>
  ) : null;

// Zoom de chaque page, réglé à l'œil sur PC (100 % = taille normale du site)
// (relevé pour la lisibilité : les pages étaient réduites à 67-75 %, les textes devenaient trop petits)
const PAGE_ZOOM: [string, number][] = [
  ['/inventory', 0.9],
  ['/combat', 0.9],
  ['/shop', 0.85],
];
// la boutique est plus large que les autres pages (la vitrine respire sur PC)
function pageZoom(path: string) {
  if (path === '/') return 0.9;
  return PAGE_ZOOM.find(([p]) => path.startsWith(p))?.[1] ?? 1;
}

export function Layout() {
  const t = useT();
  const { pathname } = useLocation();
  const user = useAuth((x) => x.user);
  const me = useMe();
  const preview = usePreview();
  const more = useUI((x) => x.more);
  useResetWatch();
  // Chaque page arrive en douceur : ses blocs montent et apparaissent l'un après l'autre
  // l'inventaire est préparé en avance (code + collection) : la page s'ouvre déjà remplie, sans saut
  const uid = useAuth((x) => x.user?.id);
  useEffect(() => {
    if (!uid) return;
    const id = setTimeout(() => {
      void import('@/features/inventory/Bestiary');
      void import('@/features/inventory/inv').then((m) => qc.prefetchQuery(m.invQuery(uid)));
    }, 1500);
    return () => clearTimeout(id);
  }, [uid]);
  useEffect(installMouseDepth, []); // les blocs glissent un tout petit peu avec la souris (inventaire, combat…)
  useEffect(() => {
    // nouvelle page : toujours en haut (avant, on gardait parfois la position de la page d'avant)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    // le doodle ne prenait parfois pas sur les images : on le relance une fois la page affichée
    [120, 1000, 3000].forEach((ms) => setTimeout(kickDoodle, ms)); // aussi quand les images arrivent plus tard
    sfx.page(); // petit souffle en changeant de page
  }, [pathname]);
  useEffect(() => openUI('more', false), [pathname]);
  const navigate = useNavigate();
  // Raccourci « debug » (taper le mot n'importe où) : ouvre le panel admin, pour les admins seulement
  const isAdmin = !!me.data?.admin;
  useEffect(() => {
    if (!isAdmin) return;
    let typed = '';
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')) return;
      typed = (typed + e.key.toLowerCase()).slice(-5);
      if (typed === 'debug') {
        typed = '';
        void navigate('/admin');
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [isAdmin, navigate]);
  // Temps de jeu : une minute comptée par le serveur tant que l'onglet est visible
  useEffect(() => {
    if (!user) return;
    const ping = () => {
      if (document.visibilityState === 'visible') void publicApi.playPing().catch(() => undefined);
    };
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, [user]);
  useOnlinePresence(user?.id);
  const fr = useFriends();
  const frN = user ? badgeOf(fr.data).req + badgeOf(fr.data).unread : 0;
  const annN = useAnn(unreadAnn);

  return (
    <>
      <a className={s.skip} href="#main">
        {t('app.skip')}
      </a>
      {/* Barre latérale façon jeu : logo, grosses icônes des pages, et en bas annonces, réglages, plus, profil */}
      <nav className={s.rail} aria-label={t('app.main_nav')}>
        <NavLink to="/" className={s.railBrand} aria-label="Takoras">
          <img className="px still" src="/img/logo.png" alt="" width={44} height={44} />
        </NavLink>
        <div className={s.railNav}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-inv-target={n.to === '/inventory' ? '' : undefined}
              end={n.to === '/'}
              className={({ isActive }) => `${s.railItem} ${isActive ? s.on : ''}`}
            >
              <span className={s.railIco}>
                <Icon name={n.icon} size={24} />
              </span>
              <span className={s.railTxt}>{t(n.key)}</span>
              {n.to === '/friends' ? <Badge n={frN} /> : null}
            </NavLink>
          ))}
        </div>
        <div className={s.railBottom}>
          {me.data?.admin ? (
            <NavLink to="/admin" className={s.railMini} aria-label="Admin">
              <Icon name="shield" />
            </NavLink>
          ) : null}
          <button type="button" className={s.railMini} onClick={openAnnHistory} aria-label={t('ui.ann_hist')}>
            <Icon name="bell" />
            <Badge n={annN} />
          </button>
          <button type="button" className={s.railMini} onClick={openFeedback} aria-label={t('ui.fb_btn')}>
            <Icon name="bulb" />
          </button>
          <button type="button" className={s.railMini} onClick={() => openUI('more')} aria-label={t('ui.more')}>
            <Icon name="more" />
          </button>
        </div>
      </nav>

      {/* en haut à droite : bêta, pièces, profil (pas de grande barre) */}
      <div className={s.hud}>
        {preview ? (
          <button type="button" className={s.previewChip} onClick={() => setPreview(false)}>
            Aperçu joueur · revenir admin
          </button>
        ) : null}
        <BetaChip />
        {user && (me.data?.tester || me.data?.admin) ? (
          // testeurs (choisis par l'admin) : la fiole ouvre le menu pour tout se donner et forcer des tirages
          <button type="button" className={s.testerBtn} onClick={openTester} aria-label={t('ui.tester_menu')}>
            <img className="px" src="/img/potions/chance-5.png" alt="" width={32} height={32} />
          </button>
        ) : null}
        {user ? (
          <>
            <span className={s.bal} aria-label={t('app.balance')} data-coin-target>
              <img className="px" src="/img/piece.png" alt="" width={20} height={20} />
              {/* le solde défile vers sa nouvelle valeur (dépense ou gain), au lieu de changer d'un coup */}
              {me.data ? (
                <Tween value={me.data.coins} ms={1600} pow={5} format={(n) => Math.round(n).toLocaleString(locale())} />
              ) : me.isError ? (
                '—'
              ) : (
                '…'
              )}
            </span>
            <NavLink to="/profile" className={s.me} aria-label={t('app.account')}>
              <Avatar pseudo={me.data?.pseudo ?? '?'} size={40} />
            </NavLink>
          </>
        ) : null}
        {/* paramètres : bien en vue, à côté de la photo */}
        <button type="button" className={s.hudGear} onClick={() => openUI('settings')} aria-label={t('ui.settings')}>
          <Icon name="gear" size={24} />
        </button>
        {user ? null : (
          <Button variant="primary" size="sm" onClick={() => openUI('account')}>
            {t('ui.login')}
          </Button>
        )}
      </div>

      <Announcements />
      <main id="main" className={s.main} key={pathname}>
        {/* zoom propre à chaque page (choisi à l'œil) : le contenu de la page seulement, pas la barre ni le haut */}
        <div className={s.pz} style={{ '--pz': pageZoom(pathname), ...(pathname.startsWith('/shop') ? { '--page-max': '1600px' } : {}) } as CSSProperties}>
          <Outlet />
        </div>
        {/* pied de page discret, en bas de chaque page (la page de présentation des visiteurs a déjà le sien) */}
        {user ? (
          <footer className={s.siteFoot}>
            <span>© Takoras</span>
            <NavLink to="/legal">{t('ui.legal_notice')}</NavLink>
            <NavLink to="/terms">{t('ui.terms')}</NavLink>
            <NavLink to="/privacy">{t('ui.privacy')}</NavLink>
          </footer>
        ) : null}
      </main>

      {/* téléphone tenu debout : le jeu se joue à l'horizontale */}
      <div className={s.rotate} role="alert">
        <span className={s.rotatePhone} aria-hidden />
        <b>{t('ui.rotate_title')}</b>
        <small>{t('ui.rotate_txt')}</small>
      </div>

      <SocialLayer />
      <BetaLayer />
      {/* admins : Ctrl+Q ouvre le menu debug de la page */}
      <DebugPanel />

      <Modal open={more} onClose={() => openUI('more', false)} title={t('ui.more')}>
        <div className={s.sheet}>
          <button
            type="button"
            onClick={() => {
              openUI('more', false);
              openPatchnotes();
            }}
          >
            <Icon name="scroll" />
            {t('ui.pn_title')}
          </button>
          <NavLink to="/profile">
            <Icon name="user" />
            {t('app.account')}
          </NavLink>
          <NavLink to="/privacy">
            <Icon name="help" />
            {t('ui.privacy')}
          </NavLink>
          <NavLink to="/terms">
            <Icon name="help" />
            {t('ui.terms')}
          </NavLink>
          <NavLink to="/legal">
            <Icon name="help" />
            {t('ui.legal_notice')}
          </NavLink>
          {user ? (
            <button type="button" onClick={() => void signOut()}>
              <Icon name="user" />
              {t('ui.logout')}
            </button>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
