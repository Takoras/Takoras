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
import { badgeOf, useFriends } from '@/features/social/social';
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
          <img className="px" src="/img/logo.png" alt="" width={32} height={32} />
          <span>Takoras</span>
        </NavLink>
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
        </button>
      </nav>

      <SocialLayer />

      <Modal open={more} onClose={() => openUI('more', false)} title={t('ui.more')}>
        <div className={s.sheet}>
          {NAV.filter((n) => !n.tab).map((n) => (
            <NavLink key={n.to} to={n.to}>
              <Icon name={n.icon} />
              {t(n.key)}
            </NavLink>
          ))}
          {user ? (
            <NavLink to="/profil">
              <Icon name="user" />
              {t('app.account')}
            </NavLink>
          ) : null}
          <button
            type="button"
            onClick={() => {
              openUI('more', false);
              openAnnHistory();
            }}
          >
            <Icon name="bell" />
            {t('ui.ann_hist')}
            <Badge n={annN} />
          </button>
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
          <button type="button" onClick={toggleMute} data-nosound>
            <Icon name={muted ? 'mute' : 'sound'} />
            {muted ? t('ui.unmute') : t('ui.mute')}
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
