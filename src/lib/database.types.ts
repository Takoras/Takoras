// Généré depuis la base Supabase (MCP generate_typescript_types). Ne pas modifier à la main :
// regénérer après chaque migration. Seuls Tables et Functions sont gardés (les vues, enums et types composés sont vides).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}[];
// Raccourci : Insert/Update dérivés de Row (la base remplit les défauts)
type T<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: Rel };

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      announcements: T<{ author: string | null; banner: boolean; body: string; created_at: string; fullscreen: boolean; id: number }>;
      battles: T<{
        created_at: string;
        deadline: string | null;
        events: Json;
        id: string;
        p1: string;
        p2: string;
        state: Json | null;
        status: string;
        updated_at: string;
        version: number;
        winner: string | null;
      }>;
      daily_stats: T<{
        battles: number;
        bought: number;
        claimed: string[];
        day: string;
        pulls: number;
        rares: number;
        sold: number;
        user_id: string;
        variants: number;
        wins: number;
      }>;
      feedback: T<{
        body: string;
        created_at: string;
        device: string | null;
        id: number;
        kind: string;
        page: string | null;
        pseudo: string | null;
        status: string;
        user_id: string | null;
      }>;
      friendships: T<{ a: string; b: string; created_at: string; requested_by: string; status: string }>;
      jetons: T<{ name: string; odds: number; serie: string }>;
      messages: T<{ body: string; created_at: string; id: number; read_at: string | null; receiver: string; sender: string }>;
      patchnotes: T<{ created_at: string; id: number; lines: Json; lines_en: Json | null; title: string; title_en: string | null }>;
      pending_pulls: T<{
        created_at: string;
        id: number;
        jeton: string;
        luck: number | null;
        odds: number;
        serie: string;
        user_id: string;
        variant: string | null;
      }>;
      price_changes: T<{ created_at: string; id: number; item: string; new_price: number; old_price: number }>;
      profiles: T<{
        avatar: string;
        avatars: string[];
        banned: boolean;
        banner: string | null;
        banners: string[];
        battle_losses: number;
        battle_wins: number;
        beta: boolean;
        bio: string;
        coins: number;
        created_at: string;
        daily_last: string | null;
        daily_streak: number;
        deck: number[];
        fast_until: string | null;
        id: string;
        is_admin: boolean;
        luck_left: number;
        luck_mult: number;
        num: number;
        potions: Json;
        pseudo: string | null;
        pseudo_changed_at: string | null;
        pseudo_free: boolean;
        regen_s: number;
        showcase: number[];
        stock: number;
        stock_last: string;
        stock_max: number;
        tester: boolean;
      }>;
      promo_codes: T<{
        active: boolean;
        code: string;
        coins: number;
        created_at: string;
        expires_at: string | null;
        items: Json;
        max_uses: number | null;
        pulls: number;
        uses: number;
      }>;
      promo_redeems: T<{ at: string; code: string; user_id: string }>;
      pulls: T<{
        created_at: string;
        fused: boolean;
        id: number;
        jeton: string;
        locked: boolean;
        luck: number | null;
        odds: number;
        serie: string;
        sold_at: string | null;
        user_id: string;
        variant: string | null;
      }>;
      quests: T<{ id: string; reward_coins: number; reward_item: string | null; reward_qty: number; stat: string; target: number }>;
      shop_buys: T<{ day: string; item: string; qty: number; user_id: string }>;
      shop_buys2: T<{ item: string; period: number; qty: number; user_id: string }>;
      shop_items: T<{ active: boolean; daily_limit: number; data: Json; id: string; kind: string; price: number }>;
      shop_overrides: T<{ item: string; period: number; stock: number }>;
      shop_price_overrides: T<{ item: string; period: number; price: number }>;
      shop_settings: T<{ k: string; v: string }>;
      site_settings: T<{ k: string; v: string }>;
      token_levels: T<{ jeton: string; lvl: number; serie: string; user_id: string }>;
      user_items: T<{ item: string; qty: number; user_id: string }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      admin_announce: { Args: { p_banner: boolean; p_body: string; p_fullscreen: boolean }; Returns: number };
      admin_ban: { Args: { p_ban: boolean; target: string }; Returns: undefined };
      admin_clear_showcase: { Args: { target: string }; Returns: undefined };
      admin_code_delete: { Args: { p_code: string }; Returns: undefined };
      admin_code_save: {
        Args: { p_code: string; p_coins: number; p_expires: string; p_items: Json; p_max: number; p_pulls: number };
        Returns: undefined;
      };
      admin_code_toggle: { Args: { p_active: boolean; p_code: string }; Returns: undefined };
      admin_codes: { Args: never; Returns: Json };
      admin_delete_announcement: { Args: { p_id: number }; Returns: undefined };
      admin_delete_message: { Args: { p_id: number }; Returns: undefined };
      admin_feedback: { Args: never; Returns: Json };
      admin_feedback_set: { Args: { p_id: number; p_status: string }; Returns: undefined };
      admin_give: { Args: { p_coins?: number; p_pulls?: number; target: string | null }; Returns: number };
      admin_give_item: { Args: { p_item: string; target: string }; Returns: undefined };
      admin_give_jeton: { Args: { p_jeton: string; target: string }; Returns: undefined };
      admin_inventory: {
        Args: { target: string };
        Returns: { created_at: string; id: number; jeton: string; locked: boolean; odds: number; showcased: boolean }[];
      };
      admin_lock_pulls: { Args: { ids: number[]; p_locked: boolean; target: string }; Returns: undefined };
      admin_messages: {
        Args: { target: string };
        Returns: { body: string; created_at: string; from_pseudo: string; id: number; to_pseudo: string }[];
      };
      admin_patchnote_delete: { Args: { p_id: number }; Returns: undefined };
      admin_patchnote_save: {
        Args: { p_id: number; p_lines: Json; p_lines_en?: Json; p_title: string; p_title_en?: string };
        Returns: number;
      };
      admin_player: { Args: { target: string }; Returns: Json };
      admin_players: {
        Args: { q?: string };
        Returns: {
          banned: boolean;
          best_odds: number;
          coins: number;
          created_at: string;
          id: string;
          pseudo: string;
          pulls: number;
          stock: number;
          stock_max: number;
        }[];
      };
      admin_remove_pulls: { Args: { ids: number[]; target: string }; Returns: number };
      admin_reset: { Args: { target: string | null }; Returns: number };
      admin_set_beta: { Args: { p_on: boolean }; Returns: undefined };
      admin_set_items: { Args: { p_item: string; p_qty: number; target: string }; Returns: undefined };
      admin_set_tester: { Args: { p_on: boolean; target: string }; Returns: undefined };
      admin_set_pseudo: { Args: { p: string; target: string }; Returns: undefined };
      admin_shop: { Args: never; Returns: Json };
      admin_shop_reroll: { Args: never; Returns: undefined };
      admin_shop_set: { Args: { p_active: boolean; p_item: string; p_price: number; p_stock: number }; Returns: undefined };
      admin_stats: { Args: never; Returns: Json };
      avatars_of: { Args: { p: string[] }; Returns: { avatar: string; pseudo: string }[] };
      beta_give: {
        Args: { p_coins?: number; p_item?: string; p_jeton?: string; p_pulls?: number; p_qty?: number; p_variant?: string };
        Returns: Json;
      };
      beta_of: { Args: { p: string[] }; Returns: { pseudo: string }[] };
      buy_item: { Args: { p_item: string }; Returns: Json };
      change_pseudo: { Args: { p: string }; Returns: undefined };
      claim_daily: { Args: never; Returns: Json };
      claim_quest: { Args: { p_id: string }; Returns: Json };
      collection_of: {
        Args: { p_pseudo: string };
        Returns: { jeton: string; serie: string; total: number; variant: string }[];
      };
      eco_state: { Args: never; Returns: Json };
      friend_remove: { Args: { p_other: string }; Returns: undefined };
      friend_request: { Args: { p_pseudo: string }; Returns: string };
      friend_respond: { Args: { p_accept: boolean; p_other: string }; Returns: undefined };
      friend_status: { Args: { p_pseudo: string }; Returns: Json };
      leaderboard: {
        Args: { kind: string; n?: number; since?: string | null };
        Returns: { jeton: string; odds: number; pseudo: string; value: number }[];
      };
      level_up: { Args: { p_jeton: string; p_serie?: string }; Returns: Json };
      live_feed: {
        Args: { n?: number };
        Returns: { created_at: string; jeton: string; odds: number; pseudo: string; serie: string; variant: string }[];
      };
      lock_pulls: { Args: { ids: number[]; p_locked: boolean }; Returns: number };
      mark_read: { Args: { p_other: string }; Returns: undefined };
      my_collection: {
        Args: never;
        Returns: { jeton: string; owned: number; serie: string; total: number; variant: string }[];
      };
      my_conversation: {
        Args: { p_before?: number; p_other: string };
        Returns: { body: string; created_at: string; id: number; mine: boolean }[];
      };
      my_daily: { Args: never; Returns: Json };
      my_deck: {
        Args: never;
        Returns: { id: number; jeton: string; lvl: number; odds: number; serie: string; variant: string }[];
      };
      my_friends: {
        Args: never;
        Returns: { id: string; incoming: boolean; last_at: string; pseudo: string; status: string; unread: number }[];
      };
      my_inventory_groups: { Args: never; Returns: Json };
      my_items: { Args: never; Returns: { data: Json; item: string; kind: string; qty: number }[] };
      my_levels: { Args: never; Returns: { jeton: string; lvl: number; serie: string }[] };
      my_quests: { Args: never; Returns: Json };
      profile_public: { Args: { p_pseudo: string }; Returns: Json };
      redeem_code: { Args: { p_code: string }; Returns: Json };
      refund_pulls: { Args: { ids: number[] }; Returns: Json };
      sell_pulls: { Args: { ids: number[] }; Returns: Json };
      send_feedback: { Args: { p_body: string; p_device: string; p_kind: string; p_page: string }; Returns: undefined };
      send_message: { Args: { p_body: string; p_to: string }; Returns: number };
      set_deck: { Args: { ids: number[] }; Returns: undefined };
      set_pseudo: { Args: { p: string }; Returns: undefined };
      shop_today: { Args: never; Returns: Json };
      take_pulls: { Args: { force?: string; luck?: number; n: number; p_variant?: string }; Returns: Json };
      update_profile: {
        Args: { p_avatar: string; p_banner: string | null; p_bio: string; p_showcase: (number | null)[] };
        Returns: undefined;
      };
      upgrade_regen: { Args: never; Returns: Json };
      upgrade_stock: { Args: never; Returns: Json };
      use_items: { Args: { p_item: string; p_qty: number }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<N extends keyof Database['public']['Tables']> = Database['public']['Tables'][N]['Row'];
export type Rpc = Database['public']['Functions'];
