import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useMe } from '@/api/queries';
import { useAuth, signOut } from '@/lib/auth';
import { locale } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Announcements, openAnnHistory, unreadAnn, useAnn } from '@/features/social/Announcements';
import { SocialLayer } from '@/features/social/SocialLayer';
import { BetaChip, BetaLayer, openPatchnotes, openTester } from '@/features/beta/Beta';
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
  const [muted, setMuted] = useState(sfx.muted);
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
  const streak = Number(me.data?.streak ?? 0),
    today = !!me.data?.streak_today;
  const goDaily = () => {
    navigate('/');
    setTimeout(() => document.getElementById('daily')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
  };
  const toggleMute = () => {
    sfx.setMuted(!muted);
    setMuted(!muted);
  };
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
  const inMore = !NAV.some((n) => n.tab && (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));

  return (
    <>
      <a className={s.skip} href="#main">
        {t('app.skip')}
      </a>
      <header className={s.top}>
        <NavLink to="/" className={s.brand} aria-label="Takoras">
          <img className="px still" src="/img/logo.png" alt="" width={32} height={32} />
          <span>Takoras</span>
        </NavLink>
        <BetaChip />
        <nav className={s.links} aria-label={t('app.main_nav')}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => (isActive ? s.on : undefined)}
            >
              {t(n.key)}
              {n.to === '/amis' ? <Badge n={frN} /> : null}
            </NavLink>
          ))}
        </nav>
        <div className={s.tools}>
          {me.data?.admin ? (
            <NavLink to="/admin" className={s.icon} aria-label="Admin">
              <Icon name="shield" />
            </NavLink>
          ) : null}
          {me.data?.tester ? (
            <button type="button" className={s.icon} onClick={openTester} aria-label={t('ui.tester_menu')}>
              <Icon name="flask" />
            </button>
          ) : null}
          <button
            type="button"
            className={`${s.icon} ${s.bell}`}
            onClick={openAnnHistory}
            aria-label={t('ui.ann_hist')}
          >
            <Icon name="bell" />
            <Badge n={annN} />
          </button>
          <button type="button" className={s.icon} onClick={() => openUI('settings')} aria-label={t('ui.settings')}>
            <Icon name="gear" />
          </button>
          <button
            type="button"
            className={s.icon}
            onClick={toggleMute}
            aria-label={muted ? t('ui.unmute') : t('ui.mute')}
            data-nosound
          >
            <Icon name={muted ? 'mute' : 'sound'} />
          </button>
          {user && me.data ? (
            <button
              type="button"
              className={`${s.streak} ${today ? '' : s.cold}`}
              onClick={goDaily}
              title={today ? t('ui.streak_ok', { n: streak }) : t('ui.streak_todo')}
              aria-label={today ? t('ui.streak_ok', { n: streak }) : t('ui.streak_todo')}
            >
              <Icon name="flame" size={18} />
              <b>{streak}</b>
            </button>
          ) : null}
          {user ? (
            <>
              <span className={s.bal} aria-label={t('app.balance')}>
                <img className="px" src="/img/piece.png" alt="" width={18} height={18} />
                {me.data ? me.data.coins.toLocaleString(locale()) : me.isError ? '—' : '…'}
              </span>
              <NavLink to="/profil" className={s.me} aria-label={t('app.account')}>
                <Avatar pseudo={me.data?.pseudo ?? '?'} size={32} />
              </NavLink>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => openUI('account')}>
              {t('ui.login')}
            </Button>
          )}
        </div>
      </header>

      <Announcements />
      <main id="main" className={s.main} key={pathname}>
        <Outlet />
      </main>

      <footer className={s.foot}>
        <div className={s.footIn}>
          <div className={s.footBrand}>
            <img className="px still" src="/img/logo.png" alt="" width={40} height={40} />
            <b>Takoras</b>
            <small>{t('ui.foot_tag')}</small>
          </div>
          <nav className={s.footCol} aria-label={t('ui.foot_play')}>
            <b>{t('ui.foot_play')}</b>
            <NavLink to="/">{t('ui.nav_home')}</NavLink>
            <NavLink to="/inventaire">{t('ui.nav_inv')}</NavLink>
            <NavLink to="/combat">{t('ui.nav_combat')}</NavLink>
            <NavLink to="/passe">{t('ui.bp_title')}</NavLink>
          </nav>
          <nav className={s.footCol} aria-label={t('ui.foot_more')}>
            <b>{t('ui.foot_more')}</b>
            <NavLink to="/boutique">{t('ui.nav_shop')}</NavLink>
            <NavLink to="/classement">{t('ui.nav_board')}</NavLink>
            <NavLink to="/amis">{t('ui.nav_friends')}</NavLink>
          </nav>
          <div className={s.footCol}>
            <b>{t('ui.foot_beta')}</b>
            <button type="button" onClick={openPatchnotes}>
              {t('ui.foot_news')}
            </button>
            <NavLink to="/profil">{t('app.account')}</NavLink>
          </div>
        </div>
        <small className={s.copy}>
          © {new Date().getFullYear()} Takoras · {t('ui.foot_art')}
        </small>
      </footer>

      <nav className={s.tabbar} aria-label={t('app.main_nav')}>
        {NAV.filter((n) => n.tab).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? s.on : undefined)}>
            <Icon name={n.icon} size={22} />
            <span>{t(n.key)}</span>
            {n.to === '/amis' ? <Badge n={frN} /> : null}
          </NavLink>
        ))}
        <button
          type="button"
          className={inMore ? s.on : undefined}
          onClick={() => openUI('more')}
          aria-haspopup="dialog"
        >
          <Icon name="more" size={22} />
          <span>{t('ui.more')}</span>
          <Badge n={frN} />
        </button>
      </nav>

      <SocialLayer />
      <BetaLayer />

      <Modal open={more} onClose={() => openUI('more', false)} title={t('ui.more')}>
        <div className={s.sheet}>
          {NAV.filter((n) => !n.tab).map((n) => (
            <NavLink key={n.to} to={n.to}>
              <Icon name={n.icon} />
              {t(n.key)}
              {n.to === '/amis' ? <Badge n={frN} /> : null}
            </NavLink>
          ))}
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
          {me.data?.admin ? (
            <NavLink to="/admin">
              <Icon name="shield" />
              Admin
            </NavLink>
          ) : null}
          {me.data?.tester ? (
            <button
              type="button"
              onClick={() => {
                openUI('more', false);
                openTester();
              }}
            >
              <Icon name="flask" />
              {t('ui.tester_menu')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              openUI('more', false);
              openUI('settings');
            }}
          >
            <Icon name="gear" />
            {t('ui.settings')}
          </button>
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
