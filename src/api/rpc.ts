import { sb } from '@/lib/supabase';
import type { Rpc } from '@/lib/database.types';
import { translate, type Key, type Lang } from '@/i18n';

export type RpcName = keyof Rpc;
type Args<N extends RpcName> = Rpc[N]['Args'];

// Erreur renvoyée par une RPC : `code` = le mot-clé levé par la base (ex. « not_enough_coins »)
export class RpcError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// Appel typé d'une RPC Supabase. Lève RpcError en cas d'erreur.
export async function rpc<N extends RpcName>(
  name: N,
  ...args: Args<N> extends never ? [] : [Args<N>]
): Promise<Rpc[N]['Returns']> {
  // bind : sb.rpc a besoin de son client (this) ; détachée, elle plantait avant même d'envoyer la requête
  const call = sb.rpc.bind(sb) as unknown as (
    n: string,
    a?: object,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await call(name, args[0] as object | undefined);
  if (error) throw new RpcError(codeOf(error.message), error.message);
  return data as Rpc[N]['Returns'];
}

// Mots-clés d'erreur du serveur → texte traduit (même table que l'ancien site, legacy/ui.js)
const ERR: Record<string, Key> = {
  daily_already: 'ui.err_daily_already',
  too_many_pulls: 'ui.err_too_many',
  max_reached: 'ui.err_max_reached',
  not_enough_coins: 'ui.err_coins',
  limit_reached: 'ui.err_limit',
  potion_active: 'ui.err_potion',
  stock_full: 'ui.err_stock_full',
  owned: 'ui.err_owned',
  not_in_shop: 'ui.err_shop',
  banned: 'ui.err_banned',
  not_friends: 'ui.err_not_friends',
  slow_down: 'ui.err_slow',
  unknown_player: 'ui.err_unknown',
  self: 'ui.err_self',
  pseudo_taken: 'ui.err_pseudo_taken',
  bad_pseudo: 'ui.err_pseudo',
  pseudo_cooldown: 'ui.err_pseudo_cd',
  deck_incomplete: 'ui.err_deck',
  quest_not_done: 'ui.err_quest',
  bp_locked: 'ui.err_bp_locked',
  bp_premium: 'ui.err_bp_premium',
  bp_claimed: 'ui.err_bp_claimed',
  feedback_short: 'ui.fb_short',
  busy: 'ui.err_busy',
  invite_expired: 'ui.err_inv_exp',
  not_your_turn: 'ui.err_turn',
  code_invalid: 'ui.err_code_invalid',
  code_expired: 'ui.err_code_expired',
  code_used_up: 'ui.err_code_used_up',
  code_already: 'ui.err_code_already',
  bad_code: 'ui.err_bad_code',
};
const codeOf = (msg: string) => Object.keys(ERR).find((k) => msg.includes(k)) ?? 'generic';
export function errorText(e: unknown, lang: Lang): string {
  const code = e instanceof RpcError ? e.code : codeOf(String((e as { message?: string })?.message ?? ''));
  return translate(lang, ERR[code] ?? 'ui.err_generic');
}
