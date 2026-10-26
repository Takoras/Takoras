/* eslint-disable react-refresh/only-export-components -- composants des fenêtres bêta */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { betaApi, errorText, socialApi, tables } from '@/api';
import { useMe } from '@/api/queries';
import { itemText, type ShopItem } from '@/data/items';
import { SERIES, VARIANTS } from '@/data/jetons';
import { sfx } from '@/engines/sound.js';
import { useAuth } from '@/lib/auth';
import { useJn } from '@/lib/names';
import { locale, reducedFx, useSettings } from '@/lib/settings';
import { Rich } from '@/i18n/Rich';
import { useDict, useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { toast } from '@/ui/toast';
import { lsSet } from '../social/social';
import { close, markSeen, openPatchnotes, TUTO_KEY, usePatchnotes, type Note, type Win } from './store';
import { TestPulls } from './TestPulls';
import s from './Beta.module.css';

// Fenêtres bêta (patch notes, popup des nouveautés, tuto, avis, menu testeur) : téléchargées à l'ouverture seulement.
export default function BetaWindow({ win }: { win: Win }) {
  if (win === 'pn') return <Patchnotes />;
  if (win === 'pop') return <PatchPopup />;
  if (win === 'tuto') return <Tuto />;
  if (win === 'fb') return <Feedback />;
  if (win === 'tester') return <Tester />;
  return null;
}

const PN_GROUPS = [
  ['new', '', 'ui.pn_new'],
  ['change', '', 'ui.pn_change'],
  ['fix', '', 'ui.pn_fix'],
  ['removed', '', 'ui.pn_removed'],
] as const;
function NoteBody({ n }: { n: Note }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const lines = (lang === 'en' && n.lines_en?.length ? n.lines_en : n.lines) ?? [];
  return (
    <>
      {PN_GROUPS.map(([k, ico, label]) => {
        const l = lines.filter((x) => x.t === k);
        return l.length ? (
          <div key={k} className={`${s.group} ${s[k]}`}>
            <h4>
              {ico} {t(label)}
            </h4>
            <ul>
              {l.map((x, i) => (
                <li key={i}>{x.x}</li>
              ))}
            </ul>
          </div>
        ) : null;
      })}
    </>
  );
}
const noteTitle = (n: Note, lang: string) => (lang === 'en' && n.title_en) || n.title;

function Patchnotes() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const notes = usePatchnotes();
  useEffect(() => markSeen(notes.data), [notes.data]);
  return (
    <Modal open onClose={close} title={`${t('ui.pn_title')}`} wide>
      <div className={s.pn}>
        {notes.data?.map((n, i) => (
          <article key={n.id} className={i === 0 ? s.latest : undefined}>
            <header>
              <b>{noteTitle(n, lang)}</b>
              <small className="muted">
                {new Date(n.created_at).toLocaleDateString(locale(lang), {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </small>
            </header>
            <NoteBody n={n} />
          </article>
        ))}
        {notes.data && !notes.data.length ? <p className="muted">{t('ui.pn_none')}</p> : null}
        {!notes.data ? (
          <p className="muted" aria-busy>
            …
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function PatchPopup() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const notes = usePatchnotes();
  const last = notes.data?.[0];
  useEffect(() => markSeen(notes.data), [notes.data]);
  if (!last) return null;
  return (
    <Modal open onClose={close}>
      <div className={s.pop}>
        <p className={s.tag}>{t('ui.pn_newtag')}</p>
        <h2>{noteTitle(last, lang)}</h2>
        <div className={s.popBody}>
          <NoteBody n={last} />
        </div>
        <div className={s.btns}>
          <Button onClick={openPatchnotes}>{t('ui.pn_all')}</Button>
          <Button variant="primary" onClick={close}>
            {t('ui.pn_ok')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Tuto de première visite : quelques écrans qui expliquent tout le site (glisser sur téléphone)
function Tuto() {
  const t = useT();
  const dict = useDict();
  const steps = dict.tuto;
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const x0 = useRef<number | null>(null);
  const step = steps[i];
  if (!step) return null;
  const [ico = '', title = '', text = ''] = step,
    last = i === steps.length - 1;
  const done = () => {
    lsSet(TUTO_KEY, 1);
    close();
  };
  const go = (d: number) => {
    const n = i + d;
    if (n < 0 || n >= steps.length) return;
    sfx.click();
    setI(n);
    if (!reducedFx())
      card.current?.animate(
        [
          { opacity: 0.3, transform: `translateX(${d * 26}px)` },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 260, easing: 'cubic-bezier(.2, .9, .3, 1)' },
      );
  };
  return (
    <Modal open onClose={done}>
      <div
        ref={card}
        className={s.tuto}
        onTouchStart={(e) => {
          x0.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (x0.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? x0.current) - x0.current;
          x0.current = null;
          if (dx < -50) go(1);
          else if (dx > 50) go(-1);
        }}
      >
        <div className={s.ico} aria-hidden>
          {ico.startsWith('img/') ? <img className="px" src={`/${ico}`} alt="" /> : <span>{ico}</span>}
        </div>
        <h2>{title}</h2>
        <p>
          <Rich text={text} />
        </p>
        <div className={s.dots} role="img" aria-label={`${i + 1}/${steps.length}`}>
          {steps.map((_, k) => (
            <i key={k} className={k === i ? s.on : undefined} />
          ))}
        </div>
        <div className={s.btns}>
          {i ? (
            <Button onClick={() => go(-1)}>‹ {t('ui.tuto_prev')}</Button>
          ) : (
            <Button onClick={done}>{t('ui.tuto_skip')}</Button>
          )}
          <Button variant="primary" onClick={() => (last ? (sfx.upgrade(), done()) : go(1))}>
            {last ? t('ui.tuto_go') : `${t('ui.tuto_next')} ›`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Donner un avis (bug, idée, ajout, autre) : l'admin les lit dans son panel
const FB_KINDS = [
  ['bug', ''],
  ['idea', ''],
  ['add', ''],
  ['other', ''],
] as const;
type FbKind = (typeof FB_KINDS)[number][0];
function Feedback() {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const { pathname } = useLocation();
  const [kind, setKind] = useState<FbKind>('idea');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const body = text.trim();
    if (body.length < 5) {
      sfx.deny();
      return toast(t('ui.fb_short'), true);
    }
    setBusy(true);
    const ua = navigator.userAgent;
    const device = `${innerWidth}×${innerHeight} · ${/(Firefox|Edg|OPR|Chrome|Safari)\/[\d.]+/.exec(ua)?.[0] ?? ''}${/Mobi/.test(ua) ? ' · mobile' : ''}`;
    try {
      await socialApi.feedback({ p_kind: kind, p_body: body, p_page: pathname, p_device: device });
      sfx.upgrade();
      toast(`${t('ui.fb_thanks')}`);
      close();
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={close} title={t('ui.fb_title')}>
      <div className={s.fb}>
        <p className="muted">{t('ui.fb_sub')}</p>
        <div className={s.kinds} role="radiogroup" aria-label={t('ui.fb_title')}>
          {FB_KINDS.map(([k, ico]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                sfx.click();
                setKind(k);
              }}
            >
              <span aria-hidden>{ico}</span>
              {t(`ui.fb_${k}`)}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1500}
          rows={5}
          placeholder={t(`ui.fb_ph_${kind}`)}
          aria-label={t('ui.fb_title')}
        />
        <div className={s.foot}>
          <small className="muted">{text.length}/1500</small>
          <Button variant="primary" loading={busy} onClick={() => void send()}>
            {t('ui.fb_send')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
// Menu des testeurs (choisis par l'admin, bêta ouverte) : se donner de quoi tout tester.
// Le serveur vérifie lui-même que le joueur est testeur (beta_give, take_pulls).
function Tester() {
  const t = useT();
  const jn = useJn();
  const lang = useSettings((x) => x.lang);
  const user = useAuth((x) => x.user);
  const me = useMe();
  const qc = useQueryClient();
  const fmt = (n: number) => n.toLocaleString(locale(lang));
  const shop = useQuery({
    queryKey: ['shop-items'],
    queryFn: async () =>
      (((await tables.shopItems()).data ?? []) as (ShopItem & { price: number })[]).sort(
        (a, b) => a.kind.localeCompare(b.kind) || a.price - b.price,
      ),
  });
  const [item, setItem] = useState('potion1');
  const [iqty, setIqty] = useState(1);
  const [jeton, setJeton] = useState('Mobu');
  const [variant, setVariant] = useState('');
  const [qty, setQty] = useState(1);
  if (!me.data?.tester && !me.data?.admin) return null;
  const give = async (args: Parameters<typeof betaApi.give>[0], label: string) => {
    try {
      const st = await betaApi.give(args);
      qc.setQueryData(['me', user?.id], st);
      sfx.upgrade();
      toast(`${label}`);
      void qc.invalidateQueries({ queryKey: ['inv'] });
      void qc.invalidateQueries({ queryKey: ['items'] });
    } catch (e) {
      sfx.deny();
      toast(errorText(e, lang), true);
    }
  };
  const items = shop.data ?? [];
  const jetons = SERIES.Takoras ?? [];
  const clamp = (v: number, max: number) => Math.max(1, Math.min(max, v || 1));
  return (
    <Modal open onClose={close} title={`${t('ui.tester_menu')}`} wide>
      <div className={s.ts}>
        <p className="muted">{t('ui.tester_sub')}</p>
        <section>
          <h3>{t('ui.pulls')}</h3>
          <div className={s.row}>
            {[5, 10, 25, 50].map((n) => (
              <Button key={n} size="sm" onClick={() => void give({ p_pulls: n }, `+${n} ${t('ui.pulls_word')}`)}>
                +{n}
              </Button>
            ))}
          </div>
        </section>
        <section>
          <h3>{t('ui.ts_coins')}</h3>
          <div className={s.row}>
            {[10000, 100000, 1000000, 10000000].map((n) => (
              <Button key={n} size="sm" onClick={() => void give({ p_coins: n }, `+${fmt(n)}`)}>
                +{fmt(n)}
              </Button>
            ))}
          </div>
        </section>
        <section>
          <h3>{t('ui.items')}</h3>
          <div className={s.row}>
            <select value={item} onChange={(e) => setItem(e.target.value)} aria-label={t('ui.items')}>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {itemText(it, lang)[0]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={100}
              value={iqty}
              onChange={(e) => setIqty(clamp(+e.target.value, 100))}
              aria-label={t('ui.items')}
            />
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                const it = items.find((x) => x.id === item);
                void give({ p_item: item, p_qty: iqty }, `${iqty}× ${it ? itemText(it, lang)[0] : item}`);
              }}
            >
              {t('ui.ts_give')}
            </Button>
          </div>
        </section>
        <section>
          <h3>{t('ui.ts_tokens')}</h3>
          <div className={s.row}>
            <select value={jeton} onChange={(e) => setJeton(e.target.value)} aria-label={t('ui.ts_tokens')}>
              {jetons.map((j) => (
                <option key={j.name} value={j.name}>
                  {jn(j.name)} · 1/{fmt(j.odds)}
                </option>
              ))}
            </select>
            <select value={variant} onChange={(e) => setVariant(e.target.value)} aria-label={t('ui.v_none')}>
              <option value="">{t('ui.v_none')}</option>
              {Object.keys(VARIANTS).map((v) => (
                <option key={v} value={v}>
                  {t(`ui.v_${v as 'gold'}`)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={50}
              value={qty}
              onChange={(e) => setQty(clamp(+e.target.value, 50))}
              aria-label={t('ui.ts_tokens')}
            />
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                void give(
                  { p_jeton: jeton, p_variant: variant || undefined, p_qty: qty },
                  `${qty}× ${jn(jeton)}${variant ? ` ${t(`ui.v_${variant as 'gold'}`)}` : ''}`,
                )
              }
            >
              {t('ui.ts_give')}
            </Button>
          </div>
        </section>
        <section>
          <h3>{t('ui.ts_pulls_test')}</h3>
          <p className="muted">{t('ui.ts_pulls_hint')}</p>
          <TestPulls />
        </section>
      </div>
    </Modal>
  );
}
