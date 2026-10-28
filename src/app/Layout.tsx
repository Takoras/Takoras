import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useMe } from '@/api/queries';
import { useResetWatch } from '@/lib/resetWatch';
import { pixelBurst } from '@/lib/pfx';
import { useAuth, signOut } from '@/lib/auth';
import { locale, reducedFx } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Announcements, openAnnHistory, unreadAnn, useAnn } from '@/features/social/Announcements';
import { SocialLayer } from '@/features/social/SocialLayer';
import { BetaChip, BetaLayer, openPatchnotes } from '@/features/beta/Beta';
import { openFeedback } from '@/features/beta/store';
import { badgeOf, useFriends } from '@/features/social/social';
import { publicApi } from '@/api';
import { useOnlinePresence } from '@/lib/online';
import { Icon } from './Icon';
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

export function Layout() {
  const t = useT();
  const { pathname } = useLocation();
  const user = useAuth((x) => x.user);
  const me = useMe();
  const more = useUI((x) => x.more);
  useResetWatch();
  // Chaque page arrive en douceur : ses blocs montent et apparaissent l'un après l'autre
  useEffect(() => {
    if (reducedFx()) return;
    const main = document.getElementById('main');
    if (!main) return;
    const blocks = [...main.children].flatMap((c) =>
      c.children.length > 1 && c.children.length < 14 ? [...c.children] : [c],
    );
    blocks.slice(0, 14).forEach((el, i) =>
      el.animate(
        [
          { opacity: 0, translate: '0 18px' },
          { opacity: 1, translate: '0 0' },
        ],
        {
          duration: 520,
          delay: 40 + i * 55,
          easing: 'cubic-bezier(.2, .9, .3, 1)',
          fill: 'backwards',
        },
      ),
    );
  }, [pathname]);
  useEffect(() => openUI('more', false), [pathname]);
  // un petit éclat de pixels sous le doigt à chaque bouton principal (violet) ou doré
  useEffect(() => {
    const on = (e: PointerEvent) => {
      const b = (e.target as HTMLElement | null)?.closest?.('[data-variant="primary"], [data-variant="gold"]');
      if (!b || (b as HTMLButtonElement).disabled) return;
      pixelBurst(e.clientX, e.clientY, {
        kind: 3,
        size: 52,
        color: b.getAttribute('data-variant') === 'gold' ? '#fdba74' : '#c4b5fd',
        ms: 340,
      });
    };
    addEventListener('pointerdown', on);
    return () => removeEventListener('pointerdown', on);
  }, []);
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
              end={n.to === '/'}
              className={({ isActive }) => `${s.railItem} ${isActive ? s.on : ''}`}
            >
              <span className={s.railIco}>
                <Icon name={n.icon} size={24} />
              </span>
              <span className={s.railTxt}>{t(n.key)}</span>
              {n.to === '/amis' ? <Badge n={frN} /> : null}
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
          <button type="button" className={s.railMini} onClick={() => openUI('settings')} aria-label={t('ui.settings')}>
            <Icon name="gear" />
          </button>
          <button type="button" className={s.railMini} onClick={() => openUI('more')} aria-label={t('ui.more')}>
            <Icon name="more" />
          </button>
        </div>
      </nav>

      {/* en haut à droite : bêta, pièces, profil (pas de grande barre) */}
      <div className={s.hud}>
        <BetaChip />
        {user ? (
          <>
            <span className={s.bal} aria-label={t('app.balance')}>
              <img className="px" src="/img/piece.png" alt="" width={20} height={20} />
              {me.data ? me.data.coins.toLocaleString(locale()) : me.isError ? '—' : '…'}
            </span>
            <NavLink to="/profil" className={s.me} aria-label={t('app.account')}>
              <Avatar pseudo={me.data?.pseudo ?? '?'} size={40} />
            </NavLink>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={() => openUI('account')}>
            {t('ui.login')}
          </Button>
        )}
      </div>

      <Announcements />
      {/* fond vivant : poussière de pixels qui dérive doucement derrière tout le site */}
      <div className={s.ambient} aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <main id="main" className={s.main} key={pathname}>
        <Outlet />
      </main>

      {/* téléphone tenu debout : le jeu se joue à l'horizontale */}
      <div className={s.rotate} role="alert">
        <span className={s.rotatePhone} aria-hidden />
        <b>{t('ui.rotate_title')}</b>
        <small>{t('ui.rotate_txt')}</small>
      </div>

      <SocialLayer />
      <BetaLayer />

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
          <NavLink to="/profil">
            <Icon name="user" />
            {t('app.account')}
          </NavLink>
          <NavLink to="/confidentialite">
            <Icon name="help" />
            {t('ui.privacy')}
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
