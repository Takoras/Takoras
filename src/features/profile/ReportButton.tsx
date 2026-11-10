import { useState, type FormEvent } from 'react';
import { errorText, socialApi } from '@/api';
import { sfx } from '@/engines/sound.js';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { toast } from '@/ui/toast';
import s from './Profile.module.css';

// Signaler un joueur (DSA art. 16) : la raison, un détail facultatif, envoyé à l'admin.
const REASONS = ['pseudo', 'bio', 'profile', 'cheat', 'other'] as const;
type Reason = (typeof REASONS)[number];

export function ReportButton({ pseudo }: { pseudo: string }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason || busy) return;
    setBusy(true);
    try {
      await socialApi.report(pseudo, reason, detail);
      sfx.upgrade();
      toast(t('ui.report_done'));
      setOpen(false);
      setReason(null);
      setDetail('');
    } catch (err) {
      sfx.deny();
      toast(errorText(err, lang), true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {t('ui.report')}
      </Button>
      {open ? (
        <Modal open onClose={() => setOpen(false)} title={t('ui.report_t', { n: pseudo })}>
          <form className={s.report} onSubmit={(e) => void send(e)}>
            <fieldset>
              <legend className="visually-hidden">{t('ui.report_why')}</legend>
              {REASONS.map((r) => (
                <label key={r} className={s.reportOpt}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  <span>{t(`ui.report_${r}`)}</span>
                </label>
              ))}
            </fieldset>
            <label className={s.reportDetail}>
              <span>{t('ui.report_detail')}</span>
              <textarea value={detail} maxLength={300} rows={3} onChange={(e) => setDetail(e.target.value)} />
            </label>
            <div className={s.peActions}>
              <Button type="submit" variant="primary" disabled={!reason} loading={busy}>
                {t('ui.report_send')}
              </Button>
              <Button onClick={() => setOpen(false)}>{t('ui.cancel')}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
