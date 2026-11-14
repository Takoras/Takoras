import { sb } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';
import { rpc } from './rpc';

export { rpc, RpcError, errorText } from './rpc';

// Toutes les RPC du jeu, regroupées par domaine. Les écritures passent TOUTES par ces RPC (la base refuse
// les écritures directes dans les tables). Le contrôle de parité (npm run parity) vérifie qu'aucune ne manque.

export const publicApi = {
  liveFeed: (n = 20) => rpc('live_feed', { n }),
  leaderboard: (kind: string, since: string | null, n = 50) => rpc('leaderboard', { kind, since, n }),
  leaderboardTime: (since: string | null, n = 50) => rpc('leaderboard_time', { n, since }),
  leaderboardElo: (since: string | null, n = 50) => rpc('leaderboard_elo', { n, since }),
  leaderboardWins: (since: string | null, n = 50) => rpc('leaderboard_wins', { n, since }),
  playPing: () => rpc('play_ping'),
  onlineCount: () => rpc('online_count'),
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
  // cosmétiques portés (couleur de pseudo, aura, effet de bannière) : null = rien
  equipCosmetics: (p_name: string | null, p_aura: string | null, p_bfx: string | null) =>
    rpc('equip_cosmetics', { p_name, p_aura, p_bfx }),
  updateProfile: (a: { p_avatar: string; p_banner: string | null; p_bio: string; p_showcase: (number | null)[] }) =>
    rpc('update_profile', a),
  // accord aux CGU, téléchargement de ses données, suppression définitive du compte
  acceptTerms: () => rpc('accept_terms'),
  exportData: () => rpc('export_my_data'),
  deleteAccount: () => rpc('delete_my_account'),
};

export const ecoApi = {
  state: () => rpc('eco_state'),
  takePulls: (n: number, opts: { force?: string; luck?: number; p_variant?: string } = {}) =>
    rpc('take_pulls', { n, ...opts }),
  // tirages d'une série payée en pièces (Bodako) : le serveur retire les pièces, pas le stock
  takePullsSerie: (serie: string, n: number, opts: { force?: string; luck?: number; p_variant?: string } = {}) =>
    rpc('take_pulls_serie', { p_serie: serie, n, ...opts }),
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

export const passApi = {
  weekly: () => rpc('my_weekly'),
  claimWeekly: (p_id: string) => rpc('claim_weekly', { p_id }),
  starter: () => rpc('starter_choices'),
  starterPick: (p_jeton: string) => rpc('starter_pick', { p_jeton }),
  starterQuest: () => rpc('starter_quest_claim'),
  state: () => rpc('bp_state'),
  claim: (p_tier: number, p_prem: boolean) => rpc('bp_claim', { p_tier, p_prem }),
  claimAll: () => rpc('bp_claim_all'),
  adminMax: () => rpc('admin_bp_max'),
};

export const shopApi = {
  buy: (p_item: string) => rpc('buy_item', { p_item }),
  // boutique mystère : révéler une case (+100 pièces, une fois par objet et par jour)
  reveal: (p_slot: number) => rpc('reveal_slot', { p_slot }),
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
  report: (p_pseudo: string, p_reason: string, p_detail: string) =>
    rpc('report_player', { p_pseudo, p_reason, p_detail }),
  respond: (p_other: string, p_accept: boolean) => rpc('friend_respond', { p_other, p_accept }),
  remove: (p_other: string) => rpc('friend_remove', { p_other }),
  status: (p_pseudo: string) => rpc('friend_status', { p_pseudo }),
  feedback: (a: { p_kind: string; p_body: string; p_page: string; p_device: string }) => rpc('send_feedback', a),
};

export const betaApi = {
  give: (a: {
    p_coins?: number;
    p_pulls?: number;
    p_item?: string;
    p_qty?: number;
    p_jeton?: string;
    p_variant?: string;
  }) => rpc('beta_give', a),
  // jeton de n'importe quelle série (beta_give ne connaît que Takoras)
  giveJeton: (a: { p_serie: string; p_jeton: string; p_variant?: string; p_qty?: number }) => rpc('beta_give_jeton', a),
};

// fonctions serveur pas encore dans les types générés (migration à appliquer) : appel non typé
const rpcLoose = rpc as unknown as (name: string, args?: Record<string, unknown>) => Promise<unknown>;

export const adminApi = {
  players: (q = '') => rpc('admin_players', { q }),
  player: (target: string) => rpc('admin_player', { target }),
  inventory: (target: string) => rpc('admin_inventory', { target }),
  removePulls: (target: string, ids: number[]) => rpc('admin_remove_pulls', { target, ids }),
  lockPulls: (target: string, ids: number[], p_locked: boolean) => rpc('admin_lock_pulls', { target, ids, p_locked }),
  give: (target: string | null, p_coins = 0, p_pulls = 0) => rpc('admin_give', { target, p_coins, p_pulls }),
  giveJeton: (target: string, p_jeton: string) => rpc('admin_give_jeton', { target, p_jeton }),
  giveItem: (target: string, p_item: string) => rpc('admin_give_item', { target, p_item }),
  // plusieurs d'un coup (admin_give_item avec p_qty) ; sans la migration, on donne un par un
  giveItemQty: async (target: string, p_item: string, p_qty: number) => {
    if (p_qty <= 1) return rpc('admin_give_item', { target, p_item });
    try {
      return await rpcLoose('admin_give_item', { target, p_item, p_qty });
    } catch {
      for (let i = 0; i < p_qty; i++) await rpc('admin_give_item', { target, p_item });
      return null;
    }
  },
  // TOUT effacer d'un joueur (admin_reset_player) ; sans la migration : l'ancienne remise à zéro
  resetPlayer: async (target: string) => {
    try {
      return await rpcLoose('admin_reset_player', { target });
    } catch {
      return rpc('admin_reset', { target });
    }
  },
  setPseudo: (target: string, p: string) => rpc('admin_set_pseudo', { target, p }),
  ban: (target: string, p_ban: boolean) => rpc('admin_ban', { target, p_ban }),
  setTester: (target: string, p_on: boolean) => rpc('admin_set_tester', { target, p_on }),
  clearShowcase: (target: string) => rpc('admin_clear_showcase', { target }),
  setItems: (target: string, p_item: string, p_qty: number) => rpc('admin_set_items', { target, p_item, p_qty }),
  reset: (target: string | null) => rpc('admin_reset', { target }),
  giveAll: (target: string) => rpc('admin_give_all', { target }),
  stats: () => rpc('admin_stats'),
  dashboard: (p_days = 30) => rpc('admin_dashboard', { p_days }),
  statsCat: (p_cat: string, p_days = 30) => rpc('admin_stats_cat', { p_cat, p_days }),
  setMod: (target: string, p_on: boolean) => rpc('admin_set_mod', { target, p_on }),
  shop: () => rpc('admin_shop'),
  suspicious: () => rpcLoose('admin_suspicious'),
  shopSet: (a: { p_item: string; p_price: number; p_active: boolean; p_stock: number }) => rpc('admin_shop_set', a),
  shopReroll: () => rpc('admin_shop_reroll'),
  shopFeature: (p_item: string | null, p_pct: number) => rpc('admin_shop_feature', { p_item, p_pct }),
  // menu debug (Ctrl+Q) : agit seulement sur le compte de l'admin connecté
  debug: (p_action: string, p_n = 0, p_item?: string) => rpc('admin_debug', { p_action, p_n, p_item }),
  announce: (p_body: string, p_fullscreen: boolean, p_banner: boolean) =>
    rpc('admin_announce', { p_body, p_fullscreen, p_banner }),
  deleteAnnouncement: (p_id: number) => rpc('admin_delete_announcement', { p_id }),
  codes: () => rpc('admin_codes'),
  codeSave: (a: {
    p_code: string;
    p_coins: number;
    p_pulls: number;
    p_items: Json;
    p_max: number;
    p_expires: string | null;
  }) => rpc('admin_code_save', a),
  codeDelete: (p_code: string) => rpc('admin_code_delete', { p_code }),
  codeToggle: (p_code: string, p_active: boolean) => rpc('admin_code_toggle', { p_code, p_active }),
  feedback: () => rpc('admin_feedback'),
  feedbackSet: (p_id: number, p_status: string) => rpc('admin_feedback_set', { p_id, p_status }),
  reports: () => rpc('admin_reports'),
  reportSet: (p_id: number, p_status: string) => rpc('admin_report_set', { p_id, p_status }),
  clearBio: (target: string) => rpc('admin_clear_bio', { target }),
  setBeta: (p_on: boolean) => rpc('admin_set_beta', { p_on }),
  patchnoteSave: (a: { p_id: number | null; p_title: string; p_lines: Json; p_title_en?: string; p_lines_en?: Json }) =>
    rpc('admin_patchnote_save', a),
  patchnoteDelete: (p_id: number) => rpc('admin_patchnote_delete', { p_id }),
};

// Lectures directes (seulement des SELECT, filtrés par la RLS)
export const tables = {
  myProfile: (id: string) => sb.from('profiles').select('pseudo, avatar').eq('id', id).maybeSingle(),
  myRecentPulls: (id: string) =>
    sb
      .from('pulls')
      .select('serie, jeton, odds, variant, luck, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  announcements: (n = 30) => sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(n),
  betaSetting: () => sb.from('site_settings').select('v').eq('k', 'beta').maybeSingle(),
  shopItems: () => sb.from('shop_items').select('id, kind, price, data').eq('active', true),
  patchnotes: () => sb.from('patchnotes').select('*').order('created_at', { ascending: false }),
  credits: () => sb.from('credits').select('*').order('kind').order('title'),
};
