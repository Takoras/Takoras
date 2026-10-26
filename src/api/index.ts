import { sb } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';
import { rpc } from './rpc';

export { rpc, RpcError, errorText } from './rpc';

// Toutes les RPC du jeu, regroupées par domaine. Les écritures passent TOUTES par ces RPC (la base refuse
// les écritures directes dans les tables). Le contrôle de parité (npm run parity) vérifie qu'aucune ne manque.

export const publicApi = {
  liveFeed: (n = 20) => rpc('live_feed', { n }),
  leaderboard: (kind: string, since: string | null, n = 50) => rpc('leaderboard', { kind, since, n }),
  leaderboardTime: (n = 50) => rpc('leaderboard_time', { n }),
  playPing: () => rpc('play_ping'),
  profile: (p_pseudo: string) => rpc('profile_public', { p_pseudo }),
  rankedOf: (p_pseudo: string) => rpc('ranked_of', { p_pseudo }),
  collectionOf: (p_pseudo: string) => rpc('collection_of', { p_pseudo }),
  avatarsOf: (p: string[]) => rpc('avatars_of', { p }),
  betaOf: (p: string[]) => rpc('beta_of', { p }),
  shopToday: () => rpc('shop_today'),
};

export const accountApi = {
  setPseudo: (p: string) => rpc('set_pseudo', { p }),
  changePseudo: (p: string) => rpc('change_pseudo', { p }),
  updateProfile: (a: { p_avatar: string; p_banner: string | null; p_bio: string; p_showcase: (number | null)[] }) => rpc('update_profile', a),
};

export const ecoApi = {
  state: () => rpc('eco_state'),
  takePulls: (n: number, opts: { force?: string; luck?: number; p_variant?: string } = {}) => rpc('take_pulls', { n, ...opts }),
  upgradeRegen: () => rpc('upgrade_regen'),
  upgradeStock: () => rpc('upgrade_stock'),
  refundPulls: (ids: number[]) => rpc('refund_pulls', { ids }),
};

export const invApi = {
  groups: () => rpc('my_inventory_groups'),
  collection: () => rpc('my_collection'),
  items: () => rpc('my_items'),
  useItems: (p_item: string, p_qty: number) => rpc('use_items', { p_item, p_qty }),
  lock: (ids: number[], p_locked: boolean) => rpc('lock_pulls', { ids, p_locked }),
  sell: (ids: number[]) => rpc('sell_pulls', { ids }),
};

export const combatApi = {
  levels: () => rpc('my_levels'),
  deck: () => rpc('my_deck'),
  setDeck: (ids: number[]) => rpc('set_deck', { ids }),
  levelUp: (p_jeton: string, p_serie: string) => rpc('level_up', { p_jeton, p_serie }),
  rankedMe: () => rpc('ranked_me'),
  rankedAround: () => rpc('ranked_around'),
  rankedTutoDone: () => rpc('ranked_tuto_done'),
  rankedTop: (n = 50) => rpc('ranked_top', { n }),
};

export const shopApi = {
  buy: (p_item: string) => rpc('buy_item', { p_item }),
  redeem: (p_code: string) => rpc('redeem_code', { p_code }),
};

export const questApi = {
  quests: () => rpc('my_quests'),
  daily: () => rpc('my_daily'),
  claimDaily: () => rpc('claim_daily'),
  claimQuest: (p_id: string) => rpc('claim_quest', { p_id }),
};

export const socialApi = {
  friends: () => rpc('my_friends'),
  request: (p_pseudo: string) => rpc('friend_request', { p_pseudo }),
  respond: (p_other: string, p_accept: boolean) => rpc('friend_respond', { p_other, p_accept }),
  remove: (p_other: string) => rpc('friend_remove', { p_other }),
  status: (p_pseudo: string) => rpc('friend_status', { p_pseudo }),
  conversation: (p_other: string, p_before?: number) => rpc('my_conversation', p_before ? { p_other, p_before } : { p_other }),
  markRead: (p_other: string) => rpc('mark_read', { p_other }),
  send: (p_to: string, p_body: string) => rpc('send_message', { p_to, p_body }),
  feedback: (a: { p_kind: string; p_body: string; p_page: string; p_device: string }) => rpc('send_feedback', a),
};

export const betaApi = {
  give: (a: { p_coins?: number; p_pulls?: number; p_item?: string; p_qty?: number; p_jeton?: string; p_variant?: string }) => rpc('beta_give', a),
};

export const adminApi = {
  players: (q = '') => rpc('admin_players', { q }),
  player: (target: string) => rpc('admin_player', { target }),
  inventory: (target: string) => rpc('admin_inventory', { target }),
  removePulls: (target: string, ids: number[]) => rpc('admin_remove_pulls', { target, ids }),
  lockPulls: (target: string, ids: number[], p_locked: boolean) => rpc('admin_lock_pulls', { target, ids, p_locked }),
  messages: (target: string) => rpc('admin_messages', { target }),
  give: (target: string | null, p_coins = 0, p_pulls = 0) => rpc('admin_give', { target, p_coins, p_pulls }),
  giveJeton: (target: string, p_jeton: string) => rpc('admin_give_jeton', { target, p_jeton }),
  giveItem: (target: string, p_item: string) => rpc('admin_give_item', { target, p_item }),
  setPseudo: (target: string, p: string) => rpc('admin_set_pseudo', { target, p }),
  ban: (target: string, p_ban: boolean) => rpc('admin_ban', { target, p_ban }),
  setTester: (target: string, p_on: boolean) => rpc('admin_set_tester', { target, p_on }),
  clearShowcase: (target: string) => rpc('admin_clear_showcase', { target }),
  deleteMessage: (p_id: number) => rpc('admin_delete_message', { p_id }),
  setItems: (target: string, p_item: string, p_qty: number) => rpc('admin_set_items', { target, p_item, p_qty }),
  reset: (target: string | null) => rpc('admin_reset', { target }),
  stats: () => rpc('admin_stats'),
  shop: () => rpc('admin_shop'),
  shopSet: (a: { p_item: string; p_price: number; p_active: boolean; p_stock: number }) => rpc('admin_shop_set', a),
  shopReroll: () => rpc('admin_shop_reroll'),
  announce: (p_body: string, p_fullscreen: boolean, p_banner: boolean) => rpc('admin_announce', { p_body, p_fullscreen, p_banner }),
  deleteAnnouncement: (p_id: number) => rpc('admin_delete_announcement', { p_id }),
  codes: () => rpc('admin_codes'),
  codeSave: (a: { p_code: string; p_coins: number; p_pulls: number; p_items: Json; p_max: number; p_expires: string | null }) => rpc('admin_code_save', a),
  codeDelete: (p_code: string) => rpc('admin_code_delete', { p_code }),
  codeToggle: (p_code: string, p_active: boolean) => rpc('admin_code_toggle', { p_code, p_active }),
  feedback: () => rpc('admin_feedback'),
  feedbackSet: (p_id: number, p_status: string) => rpc('admin_feedback_set', { p_id, p_status }),
  setBeta: (p_on: boolean) => rpc('admin_set_beta', { p_on }),
  patchnoteSave: (a: { p_id: number | null; p_title: string; p_lines: Json; p_title_en?: string; p_lines_en?: Json }) => rpc('admin_patchnote_save', a),
  patchnoteDelete: (p_id: number) => rpc('admin_patchnote_delete', { p_id }),
};

// Lectures directes (seulement des SELECT, filtrés par la RLS)
export const tables = {
  myProfile: (id: string) => sb.from('profiles').select('pseudo, avatar').eq('id', id).maybeSingle(),
  myRecentPulls: (id: string) =>
    sb.from('pulls').select('serie, jeton, odds, variant, luck, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
  announcements: (n = 30) => sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(n),
  betaSetting: () => sb.from('site_settings').select('v').eq('k', 'beta').maybeSingle(),
  shopItems: () => sb.from('shop_items').select('id, kind, price, data').eq('active', true),
  patchnotes: () => sb.from('patchnotes').select('*').order('created_at', { ascending: false }),
};
