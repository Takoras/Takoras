import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useMe } from '@/api/queries';
import { useAuth, signOut } from '@/lib/auth';
import { locale } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { sfx } from '@/engines/sound';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Icon } from './Icon';
import { NAV } from './nav';
import { openUI, useUI } from './ui-store';
import s from './Layout.module.css';

export function Layout() {
  const t = useT();
  const { pathname } = useLocation();
  const user = useAuth((x) => x.user);
  const me = useMe();
  const more = useUI((x) => x.more);
  const [muted, setMuted] = useState(sfx.muted);
  useEffect(() => openUI('more', false), [pathname]);
  const toggleMute = () => { sfx.setMuted(!muted); setMuted(!muted); };
  const inMore = !NAV.some((n) => n.tab && (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));

  return (
    <>
      <a className={s.skip} href="#main">{t('app.skip')}</a>
      <header className={s.top}>
        <NavLink to="/" className={s.brand} aria-label="Takoras">
          <img className="px" src="/img/logo.png" alt="" width={32} height={32} />
          <span>Takoras</span>
        </NavLink>
        <nav className={s.links} aria-label={t('app.main_nav')}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? s.on : undefined)}>
              {t(n.key)}
            </NavLink>
          ))}
        </nav>
        <div className={s.tools}>
          <button type="button" className={s.icon} onClick={() => openUI('settings')} aria-label={t('ui.settings')}><Icon name="gear" /></button>
          <button type="button" className={s.icon} onClick={toggleMute} aria-label={muted ? t('ui.unmute') : t('ui.mute')} data-nosound><Icon name={muted ? 'mute' : 'sound'} /></button>
          {user ? (
            <>
              <span className={s.bal} aria-label={t('app.balance')}>
                <img className="px" src="/img/piece.png" alt="" width={18} height={18} />
                {me.data ? me.data.coins.toLocaleString(locale()) : '…'}
              </span>
              <NavLink to="/profil" className={s.me} aria-label={t('app.account')}>
                <Avatar pseudo={me.data?.pseudo ?? '?'} size={32} />
              </NavLink>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => openUI('account')}>{t('ui.login')}</Button>
          )}
        </div>
      </header>

      <main id="main" className={s.main} key={pathname}>
        <Outlet />
      </main>

      <nav className={s.tabbar} aria-label={t('app.main_nav')}>
        {NAV.filter((n) => n.tab).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? s.on : undefined)}>
            <Icon name={n.icon} size={22} />
            <span>{t(n.key)}</span>
          </NavLink>
        ))}
        <button type="button" className={inMore ? s.on : undefined} onClick={() => openUI('more')} aria-haspopup="dialog">
          <Icon name="more" size={22} />
          <span>{t('ui.more')}</span>
        </button>
      </nav>

      <Modal open={more} onClose={() => openUI('more', false)} title={t('ui.more')}>
        <div className={s.sheet}>
          {NAV.filter((n) => !n.tab).map((n) => (
            <NavLink key={n.to} to={n.to}><Icon name={n.icon} />{t(n.key)}</NavLink>
          ))}
          {user ? <NavLink to="/profil"><Icon name="user" />{t('app.account')}</NavLink> : null}
          <button type="button" onClick={() => { openUI('more', false); openUI('settings'); }}><Icon name="gear" />{t('ui.settings')}</button>
          <button type="button" onClick={toggleMute} data-nosound><Icon name={muted ? 'mute' : 'sound'} />{muted ? t('ui.unmute') : t('ui.mute')}</button>
          {user ? <button type="button" onClick={() => void signOut()}><Icon name="user" />{t('ui.logout')}</button> : null}
        </div>
      </Modal>
    </>
  );
}
