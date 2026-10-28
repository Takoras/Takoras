import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorText, socialApi } from '@/api';
import { useMe } from '@/api/queries';
import { sfx } from '@/engines/sound.js';
import { useSettings } from '@/lib/settings';
import { useT } from '@/i18n/useT';
import type { Key } from '@/i18n';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';

type Status = { id: string; status: string | null; incoming: boolean } | null;

// Demande d'ami envoyée, reçue ou acceptée : un seul bouton qui fait la bonne action
export async function friendRequest(
  pseudo: string,
  lang: 'fr' | 'en',
  t: (k: Key, v?: Record<string, string | number>) => string,
) {
  try {
    const r = await socialApi.request(pseudo);
    sfx.upgrade();
    toast(t(`ui.fr_res_${r}` as Key, { n: pseudo }));
    return r;
  } catch (e) {
    sfx.deny();
    toast(errorText(e, lang), true);
    return null;
  }
}

export function FriendButton({ pseudo }: { pseudo: string }) {
  const t = useT();
  const lang = useSettings((x) => x.lang);
  const me = useMe();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['friend', pseudo],
    enabled: !!me.data?.pseudo && me.data.pseudo !== pseudo,
    queryFn: async () => (await socialApi.status(pseudo)) as unknown as Status,
  });
  const s = q.data;
  if (!s) return null;
  const st = s.status === 'accepted' ? 'chat' : s.incoming ? 'accept' : s.status === 'pending' ? 'sent' : 'add';
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['friend', pseudo] });
    void qc.invalidateQueries({ queryKey: ['friends'] });
  };
  if (st === 'sent') return <Button disabled>{t('ui.fr_sent')}</Button>;
  if (st === 'chat')
    return (
      // le chat est retiré : on montre juste que vous êtes amis
      <Button disabled>✓ Ami</Button>
    );
  if (st === 'accept')
    return (
      <Button
        variant="primary"
        onClick={async () => {
          try {
            await socialApi.respond(s.id, true);
            sfx.upgrade();
            toast(t('ui.fr_res_accepted', { n: pseudo }));
          } catch (e) {
            toast(errorText(e, lang), true);
          }
          done();
        }}
      >
        ✓ {t('ui.fr_accept')}
      </Button>
    );
  return (
    <Button
      variant="primary"
      onClick={async () => {
        await friendRequest(pseudo, lang, t);
        done();
      }}
    >
      {t('ui.fr_add')}
    </Button>
  );
}
