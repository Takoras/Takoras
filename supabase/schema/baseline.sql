-- =====================================================================
-- Takoras : schéma de référence (baseline) de la base Supabase
-- Projet : joyskjoofihwhycyreyn — extrait le 2026-10-21 en LECTURE SEULE
-- Généré par scripts/db/extract.sql (voir scripts/db/README.md).
-- NE PAS MODIFIER À LA MAIN : toute évolution passe par supabase/migrations/.
-- Ce fichier ne contient aucun secret (pas de clé, pas de mot de passe, pas de données).
-- Hors périmètre : schémas auth/storage/realtime gérés par Supabase. Seul objet
-- notable hors public (non rejoué ici) : CREATE TRIGGER on_auth_user_created AFTER INSERT
-- ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- =====================================================================

-- Comptes : 99 fonctions (87 SECURITY DEFINER), 24 tables, 12 policies, 0 triggers, 15 index hors contraintes, 5 tables realtime

-- =====================================================================
-- 1. EXTENSIONS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions; -- version 1.11
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions; -- version 1.3
CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog; -- version 1.0
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault; -- version 0.3.1
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions; -- version 1.1

-- =====================================================================
-- 2. TABLES (séquences, colonnes, défauts, contraintes)
-- =====================================================================

CREATE SEQUENCE IF NOT EXISTS public.pending_pulls_id_seq AS bigint START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807;
CREATE SEQUENCE IF NOT EXISTS public.profiles_num_seq AS bigint START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807;

CREATE TABLE public.announcements (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  body text NOT NULL,
  fullscreen boolean DEFAULT true NOT NULL,
  banner boolean DEFAULT true NOT NULL,
  author text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.battles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  p1 uuid NOT NULL,
  p2 uuid NOT NULL,
  status text DEFAULT 'invite'::text NOT NULL,
  state jsonb,
  events jsonb DEFAULT '[]'::jsonb NOT NULL,
  version integer DEFAULT 0 NOT NULL,
  deadline timestamp with time zone,
  winner uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.daily_stats (
  user_id uuid NOT NULL,
  day date NOT NULL,
  pulls integer DEFAULT 0 NOT NULL,
  rares integer DEFAULT 0 NOT NULL,
  sold integer DEFAULT 0 NOT NULL,
  bought integer DEFAULT 0 NOT NULL,
  variants integer DEFAULT 0 NOT NULL,
  battles integer DEFAULT 0 NOT NULL,
  wins integer DEFAULT 0 NOT NULL,
  claimed text[] DEFAULT '{}'::text[] NOT NULL
);

CREATE TABLE public.feedback (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  pseudo text,
  kind text NOT NULL,
  body text NOT NULL,
  page text,
  device text,
  status text DEFAULT 'new'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.friendships (
  a uuid NOT NULL,
  b uuid NOT NULL,
  status text NOT NULL,
  requested_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.jetons (
  serie text NOT NULL,
  name text NOT NULL,
  odds integer NOT NULL
);

CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  sender uuid NOT NULL,
  receiver uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  read_at timestamp with time zone
);

CREATE TABLE public.patchnotes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  lines jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  title_en text,
  lines_en jsonb
);

CREATE TABLE public.pending_pulls (
  id bigint DEFAULT nextval('pending_pulls_id_seq'::regclass) NOT NULL,
  user_id uuid NOT NULL,
  serie text NOT NULL,
  jeton text NOT NULL,
  odds integer NOT NULL,
  variant text,
  luck numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.price_changes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  item text NOT NULL,
  old_price integer NOT NULL,
  new_price integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  pseudo text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  coins bigint DEFAULT 0 NOT NULL,
  stock integer DEFAULT 5 NOT NULL,
  stock_max integer DEFAULT 5 NOT NULL,
  stock_last timestamp with time zone DEFAULT now() NOT NULL,
  is_admin boolean DEFAULT false NOT NULL,
  avatar text DEFAULT 'default'::text NOT NULL,
  banner text,
  banners text[] DEFAULT '{}'::text[] NOT NULL,
  bio text DEFAULT ''::text NOT NULL,
  showcase bigint[] DEFAULT '{}'::bigint[] NOT NULL,
  luck_mult numeric DEFAULT 1 NOT NULL,
  luck_left integer DEFAULT 0 NOT NULL,
  fast_until timestamp with time zone,
  potions jsonb DEFAULT '[]'::jsonb NOT NULL,
  banned boolean DEFAULT false NOT NULL,
  num bigint DEFAULT nextval('profiles_num_seq'::regclass) NOT NULL,
  pseudo_free boolean DEFAULT true NOT NULL,
  pseudo_changed_at timestamp with time zone,
  deck bigint[] DEFAULT '{}'::bigint[] NOT NULL,
  battle_wins integer DEFAULT 0 NOT NULL,
  battle_losses integer DEFAULT 0 NOT NULL,
  avatars text[] DEFAULT '{}'::text[] NOT NULL,
  beta boolean DEFAULT false NOT NULL,
  regen_s integer DEFAULT 180 NOT NULL,
  daily_last date,
  daily_streak integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.promo_codes (
  code text NOT NULL,
  coins bigint DEFAULT 0 NOT NULL,
  pulls integer DEFAULT 0 NOT NULL,
  items jsonb DEFAULT '[]'::jsonb NOT NULL,
  max_uses integer,
  uses integer DEFAULT 0 NOT NULL,
  expires_at timestamp with time zone,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promo_redeems (
  code text NOT NULL,
  user_id uuid NOT NULL,
  at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.pulls (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  serie text NOT NULL,
  jeton text NOT NULL,
  odds integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sold_at timestamp with time zone,
  locked boolean DEFAULT false NOT NULL,
  variant text,
  luck numeric,
  fused boolean DEFAULT false NOT NULL
);

CREATE TABLE public.quests (
  id text NOT NULL,
  stat text NOT NULL,
  target integer NOT NULL,
  reward_coins integer DEFAULT 0 NOT NULL,
  reward_item text,
  reward_qty integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.shop_buys (
  user_id uuid NOT NULL,
  day date NOT NULL,
  item text NOT NULL,
  qty integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.shop_buys2 (
  user_id uuid NOT NULL,
  period bigint NOT NULL,
  item text NOT NULL,
  qty integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.shop_items (
  id text NOT NULL,
  kind text NOT NULL,
  price integer NOT NULL,
  daily_limit integer DEFAULT 1 NOT NULL,
  data jsonb DEFAULT '{}'::jsonb NOT NULL,
  active boolean DEFAULT true NOT NULL
);

CREATE TABLE public.shop_overrides (
  item text NOT NULL,
  period bigint NOT NULL,
  stock integer NOT NULL
);

CREATE TABLE public.shop_price_overrides (
  item text NOT NULL,
  period bigint NOT NULL,
  price integer NOT NULL
);

CREATE TABLE public.shop_settings (
  k text NOT NULL,
  v text NOT NULL
);

CREATE TABLE public.site_settings (
  k text NOT NULL,
  v text NOT NULL
);

CREATE TABLE public.token_levels (
  user_id uuid NOT NULL,
  serie text DEFAULT 'Takoras'::text NOT NULL,
  jeton text NOT NULL,
  lvl integer DEFAULT 1 NOT NULL
);

CREATE TABLE public.user_items (
  user_id uuid NOT NULL,
  item text NOT NULL,
  qty integer DEFAULT 0 NOT NULL
);

ALTER SEQUENCE public.pending_pulls_id_seq OWNED BY public.pending_pulls.id;
ALTER SEQUENCE public.profiles_num_seq OWNED BY public.profiles.num;

ALTER TABLE ONLY public.announcements ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.battles ADD CONSTRAINT battles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.daily_stats ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (user_id, day);
ALTER TABLE ONLY public.feedback ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.friendships ADD CONSTRAINT friendships_pkey PRIMARY KEY (a, b);
ALTER TABLE ONLY public.jetons ADD CONSTRAINT jetons_pkey PRIMARY KEY (serie, name);
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.patchnotes ADD CONSTRAINT patchnotes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pending_pulls ADD CONSTRAINT pending_pulls_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.price_changes ADD CONSTRAINT price_changes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_codes ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (code);
ALTER TABLE ONLY public.promo_redeems ADD CONSTRAINT promo_redeems_pkey PRIMARY KEY (code, user_id);
ALTER TABLE ONLY public.pulls ADD CONSTRAINT pulls_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quests ADD CONSTRAINT quests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.shop_buys ADD CONSTRAINT shop_buys_pkey PRIMARY KEY (user_id, day, item);
ALTER TABLE ONLY public.shop_buys2 ADD CONSTRAINT shop_buys2_pkey PRIMARY KEY (user_id, period, item);
ALTER TABLE ONLY public.shop_items ADD CONSTRAINT shop_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.shop_overrides ADD CONSTRAINT shop_overrides_pkey PRIMARY KEY (item, period);
ALTER TABLE ONLY public.shop_price_overrides ADD CONSTRAINT shop_price_overrides_pkey PRIMARY KEY (item, period);
ALTER TABLE ONLY public.shop_settings ADD CONSTRAINT shop_settings_pkey PRIMARY KEY (k);
ALTER TABLE ONLY public.site_settings ADD CONSTRAINT site_settings_pkey PRIMARY KEY (k);
ALTER TABLE ONLY public.token_levels ADD CONSTRAINT token_levels_pkey PRIMARY KEY (user_id, serie, jeton);
ALTER TABLE ONLY public.user_items ADD CONSTRAINT user_items_pkey PRIMARY KEY (user_id, item);
ALTER TABLE ONLY public.announcements ADD CONSTRAINT announcements_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 500)));
ALTER TABLE ONLY public.battles ADD CONSTRAINT battles_status_check CHECK ((status = ANY (ARRAY['invite'::text, 'live'::text, 'done'::text, 'declined'::text, 'cancelled'::text])));
ALTER TABLE ONLY public.feedback ADD CONSTRAINT feedback_body_check CHECK (((char_length(body) >= 5) AND (char_length(body) <= 1500)));
ALTER TABLE ONLY public.feedback ADD CONSTRAINT feedback_kind_check CHECK ((kind = ANY (ARRAY['bug'::text, 'idea'::text, 'add'::text, 'other'::text])));
ALTER TABLE ONLY public.feedback ADD CONSTRAINT feedback_status_check CHECK ((status = ANY (ARRAY['new'::text, 'seen'::text, 'done'::text])));
ALTER TABLE ONLY public.friendships ADD CONSTRAINT friendships_check CHECK ((a < b));
ALTER TABLE ONLY public.friendships ADD CONSTRAINT friendships_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text])));
ALTER TABLE ONLY public.jetons ADD CONSTRAINT jetons_odds_check CHECK ((odds >= 1));
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 500)));
ALTER TABLE ONLY public.patchnotes ADD CONSTRAINT patchnotes_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 80)));
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_bio_check CHECK ((char_length(bio) <= 120));
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_coins_check CHECK ((coins >= 0));
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_pseudo_check CHECK ((pseudo ~ '^[A-Za-z0-9_\-\.]{3,16}$'::text));
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_regen_s_check CHECK (((regen_s >= 60) AND (regen_s <= 180)));
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_stock_check CHECK ((stock >= 0));
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_stock_max_check CHECK (((stock_max >= 5) AND (stock_max <= 50)));
ALTER TABLE ONLY public.promo_codes ADD CONSTRAINT promo_codes_code_check CHECK ((code ~ '^[A-Z0-9_\-]{3,24}$'::text));
ALTER TABLE ONLY public.promo_codes ADD CONSTRAINT promo_codes_coins_check CHECK ((coins >= 0));
ALTER TABLE ONLY public.promo_codes ADD CONSTRAINT promo_codes_max_uses_check CHECK (((max_uses IS NULL) OR (max_uses > 0)));
ALTER TABLE ONLY public.promo_codes ADD CONSTRAINT promo_codes_pulls_check CHECK ((pulls >= 0));
ALTER TABLE ONLY public.pulls ADD CONSTRAINT pulls_jeton_check CHECK (((length(jeton) >= 1) AND (length(jeton) <= 40)));
ALTER TABLE ONLY public.pulls ADD CONSTRAINT pulls_odds_check CHECK (((odds >= 1) AND (odds <= 100000000)));
ALTER TABLE ONLY public.pulls ADD CONSTRAINT pulls_serie_check CHECK (((length(serie) >= 1) AND (length(serie) <= 40)));
ALTER TABLE ONLY public.pulls ADD CONSTRAINT pulls_variant_check CHECK ((variant = ANY (ARRAY['gold'::text, 'celeste'::text, 'ombre'::text])));
ALTER TABLE ONLY public.shop_items ADD CONSTRAINT shop_items_kind_check CHECK ((kind = ANY (ARRAY['potion'::text, 'instant'::text, 'hourglass'::text, 'banner'::text, 'avatar'::text])));
ALTER TABLE ONLY public.shop_items ADD CONSTRAINT shop_items_price_check CHECK ((price > 0));
ALTER TABLE ONLY public.shop_overrides ADD CONSTRAINT shop_overrides_stock_check CHECK ((stock >= 0));
ALTER TABLE ONLY public.shop_price_overrides ADD CONSTRAINT shop_price_overrides_price_check CHECK ((price >= 0));
ALTER TABLE ONLY public.token_levels ADD CONSTRAINT token_levels_lvl_check CHECK (((lvl >= 1) AND (lvl <= 10)));
ALTER TABLE ONLY public.user_items ADD CONSTRAINT user_items_qty_check CHECK ((qty >= 0));
ALTER TABLE ONLY public.battles ADD CONSTRAINT battles_p1_fkey FOREIGN KEY (p1) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.battles ADD CONSTRAINT battles_p2_fkey FOREIGN KEY (p2) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.daily_stats ADD CONSTRAINT daily_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.friendships ADD CONSTRAINT friendships_a_fkey FOREIGN KEY (a) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.friendships ADD CONSTRAINT friendships_b_fkey FOREIGN KEY (b) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_receiver_fkey FOREIGN KEY (receiver) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_sender_fkey FOREIGN KEY (sender) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pending_pulls ADD CONSTRAINT pending_pulls_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_redeems ADD CONSTRAINT promo_redeems_code_fkey FOREIGN KEY (code) REFERENCES promo_codes(code) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_redeems ADD CONSTRAINT promo_redeems_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pulls ADD CONSTRAINT pulls_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.shop_buys ADD CONSTRAINT shop_buys_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.shop_buys2 ADD CONSTRAINT shop_buys2_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.shop_overrides ADD CONSTRAINT shop_overrides_item_fkey FOREIGN KEY (item) REFERENCES shop_items(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.shop_price_overrides ADD CONSTRAINT shop_price_overrides_item_fkey FOREIGN KEY (item) REFERENCES shop_items(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.token_levels ADD CONSTRAINT token_levels_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_items ADD CONSTRAINT user_items_item_fkey FOREIGN KEY (item) REFERENCES shop_items(id);
ALTER TABLE ONLY public.user_items ADD CONSTRAINT user_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- =====================================================================
-- 3. INDEX (hors index portés par une contrainte)
-- =====================================================================

CREATE INDEX battles_p1 ON public.battles USING btree (p1, status);
CREATE INDEX battles_p2 ON public.battles USING btree (p2, status);
CREATE INDEX feedback_user_idx ON public.feedback USING btree (user_id);
CREATE INDEX friendships_b_idx ON public.friendships USING btree (b);
CREATE INDEX messages_pair ON public.messages USING btree (LEAST(sender, receiver), GREATEST(sender, receiver), created_at DESC);
CREATE INDEX messages_receiver_idx ON public.messages USING btree (receiver);
CREATE INDEX messages_sender_idx ON public.messages USING btree (sender);
CREATE INDEX pending_pulls_user_idx ON public.pending_pulls USING btree (user_id, id);
CREATE UNIQUE INDEX profiles_num_key ON public.profiles USING btree (num);
CREATE UNIQUE INDEX profiles_pseudo_lower ON public.profiles USING btree (lower(pseudo));
CREATE INDEX promo_redeems_user_idx ON public.promo_redeems USING btree (user_id);
CREATE INDEX pulls_created ON public.pulls USING btree (created_at DESC);
CREATE INDEX pulls_good_created ON public.pulls USING btree (created_at DESC) WHERE ((odds >= 100) OR (variant IS NOT NULL));
CREATE INDEX pulls_user_created ON public.pulls USING btree (user_id, created_at DESC);
CREATE INDEX user_items_item_idx ON public.user_items USING btree (item);

-- =====================================================================
-- 4. FONCTIONS (schéma public)
-- =====================================================================

-- fonction : _add_item(uid uuid, p_item text, n integer)
CREATE OR REPLACE FUNCTION public._add_item(uid uuid, p_item text, n integer DEFAULT 1)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into public.user_items (user_id, item, qty) values (uid, p_item, n)
  on conflict (user_id, item) do update set qty = public.user_items.qty + n;
$function$
;

-- fonction : _apply_item(uid uuid, it shop_items)
CREATE OR REPLACE FUNCTION public._apply_item(uid uuid, it shop_items)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; m numeric := (it.data->>'mult')::numeric; n int := (it.data->>'rolls')::int;
begin
  select * into r from public.profiles where id = uid for update;
  if it.kind = 'potion' then
    if exists (select 1 from jsonb_array_elements(r.potions) x where (x->>'m')::numeric = m) then
      update public.profiles set potions = (select jsonb_agg(case when (x->>'m')::numeric = m then jsonb_build_object('m', x->'m', 'n', (x->>'n')::int + n) else x end)
                                            from jsonb_array_elements(r.potions) x) where id = uid;
    else
      update public.profiles set potions = potions || jsonb_build_array(jsonb_build_object('m', m, 'n', n)) where id = uid;
    end if;
  elsif it.kind = 'instant' then
    if r.stock >= r.stock_max then raise exception 'stock_full'; end if;
    update public.profiles set stock = stock + 1 where id = uid;
  elsif it.kind = 'hourglass' then
    perform public._regen(uid);
    update public.profiles set fast_until = greatest(now(), coalesce(fast_until, now())) + make_interval(mins => (it.data->>'minutes')::int) where id = uid;
  elsif it.kind = 'banner' then
    if substr(it.id, 3) = any(r.banners) then raise exception 'owned'; end if;
    update public.profiles set banners = array_append(banners, substr(it.id, 3)) where id = uid;
  elsif it.kind = 'avatar' then
    if substr(it.id, 3) = any(r.avatars) then raise exception 'owned'; end if;
    update public.profiles set avatars = array_append(avatars, substr(it.id, 3)) where id = uid;
  end if;
end $function$
;

-- fonction : _beta_open()
CREATE OR REPLACE FUNCTION public._beta_open()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select v = 'on' from public.site_settings where k = 'beta'), false) $function$
;

-- fonction : _bump(uid uuid, p_pulls integer, p_rares integer, p_sold integer, p_bought integer, p_variants integer, p_battles integer, p_wins integer)
CREATE OR REPLACE FUNCTION public._bump(uid uuid, p_pulls integer DEFAULT 0, p_rares integer DEFAULT 0, p_sold integer DEFAULT 0, p_bought integer DEFAULT 0, p_variants integer DEFAULT 0, p_battles integer DEFAULT 0, p_wins integer DEFAULT 0)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into public.daily_stats (user_id, day, pulls, rares, sold, bought, variants, battles, wins)
  values (uid, public._today(), p_pulls, p_rares, p_sold, p_bought, p_variants, p_battles, p_wins)
  on conflict (user_id, day) do update set pulls = daily_stats.pulls + p_pulls, rares = daily_stats.rares + p_rares, sold = daily_stats.sold + p_sold,
    bought = daily_stats.bought + p_bought, variants = daily_stats.variants + p_variants, battles = daily_stats.battles + p_battles, wins = daily_stats.wins + p_wins;
$function$
;

-- fonction : _check_ban()
CREATE OR REPLACE FUNCTION public._check_ban()
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select banned from public.profiles where id = auth.uid()) then raise exception 'banned'; end if;
end $function$
;

-- fonction : _daily_amount(streak integer)
CREATE OR REPLACE FUNCTION public._daily_amount(streak integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select 500 + 250 * (least(greatest(streak, 1), 7) - 1);
$function$
;

-- fonction : _draw(p_serie text, p_luck numeric)
CREATE OR REPLACE FUNCTION public._draw(p_serie text, p_luck numeric)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare j record; last text;
begin
  for j in select name, odds from public.jetons where serie = p_serie order by odds desc loop
    if random() < p_luck / j.odds then return j.name; end if;
    last := j.name;
  end loop;
  return last;
end $function$
;

-- fonction : _free_pseudo(raw text)
CREATE OR REPLACE FUNCTION public._free_pseudo(raw text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare b text := left(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9_\-\.]', '', 'g'), 16); c text; i int := 0;
begin
  if char_length(b) < 3 then return null; end if;
  c := b;
  while exists (select 1 from public.profiles where lower(pseudo) = lower(c)) loop
    i := i + 1;
    if i > 50 then return null; end if;
    c := left(b, 16 - char_length(i::text)) || i;
  end loop;
  return c;
end $function$
;

-- fonction : _is_admin()
CREATE OR REPLACE FUNCTION public._is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select is_admin from public.profiles where id = (select auth.uid())), false);
$function$
;

-- fonction : _is_tester()
CREATE OR REPLACE FUNCTION public._is_tester()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select beta from public.profiles where id = (select auth.uid())), false) and public._beta_open() $function$
;

-- fonction : _luck(pots jsonb)
CREATE OR REPLACE FUNCTION public._luck(pots jsonb)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select least(500, 1 + coalesce(sum((x->>'m')::numeric - 1), 0)) from jsonb_array_elements(pots) x where (x->>'n')::int > 0;
$function$
;

-- fonction : _period()
CREATE OR REPLACE FUNCTION public._period()
 RETURNS bigint
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select floor(extract(epoch from now()) / 18000)::bigint $function$
;

-- fonction : _price(p_item text, per bigint)
CREATE OR REPLACE FUNCTION public._price(p_item text, per bigint)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select o.price from public.shop_price_overrides o where o.item = p_item and o.period = per),
                  (select s.price from public.shop_items s where s.id = p_item));
$function$
;

-- fonction : _regen(p uuid)
CREATE OR REPLACE FUNCTION public._regen(p uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; g int; step int;
begin
  select * into r from public.profiles where id = p for update;
  if not found then return; end if;
  if r.stock >= r.stock_max then update public.profiles set stock_last = now() where id = p; return; end if;
  step := case when r.fast_until > now() then r.regen_s / 2 else r.regen_s end;
  g := floor(extract(epoch from (now() - r.stock_last)) / step);
  if g > 0 then
    update public.profiles
      set stock = least(stock_max, stock + g),
          stock_last = case when stock + g >= stock_max then now() else stock_last + make_interval(secs => g * step) end
      where id = p;
  end if;
end $function$
;

-- fonction : _regen_cost(target integer)
CREATE OR REPLACE FUNCTION public._regen_cost(target integer)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  -- niveau 1 (170 s) = 300 … niveau 12 (60 s) ≈ 26 000
  select (round(300 * power(greatest(1, (180 - target) / 10), 1.8) / 50) * 50)::bigint;
$function$
;

-- fonction : _roll_variant()
CREATE OR REPLACE FUNCTION public._roll_variant()
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select case when r < 1.0 / 500 then 'ombre' when r < 1.0 / 500 + 1.0 / 200 then 'celeste' when r < 1.0 / 500 + 1.0 / 200 + 1.0 / 20 then 'gold' else null end from (select random() r) x $function$
;

-- fonction : _sell_value(o integer)
CREATE OR REPLACE FUNCTION public._sell_value(o integer)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select greatest(1, round(o * 0.5))::bigint $function$
;

-- fonction : _shop_ids(d date)
CREATE OR REPLACE FUNCTION public._shop_ids(d date)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select array(
    (select id from public.shop_items where active and kind = 'potion' order by md5(id || d::text) limit 2)
    union all
    (select id from public.shop_items where active and kind in ('instant', 'hourglass') order by md5(id || d::text) limit 2)
    union all
    (select id from public.shop_items where active and kind = 'banner' order by md5(id || d::text) limit 2)
  );
$function$
;

-- fonction : _stock(p_item text, per bigint)
CREATE OR REPLACE FUNCTION public._stock(p_item text, per bigint)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare r numeric; ov int; seed text := coalesce((select v from public.shop_settings where k = 'seed'), '0');
begin
  select stock into ov from public.shop_overrides where item = p_item and period = per;
  if ov is not null then return ov; end if;
  r := ('x' || substr(md5(p_item || ':' || per || ':' || seed), 1, 8))::bit(32)::bigint / 4294967296.0;
  return case p_item
    when 'potion1' then 5 + floor(r * 4)
    when 'potion2' then 2 + floor(r * 3)
    when 'potion3' then floor(r * 3)
    when 'potion10' then case when r < .35 then 1 else 0 end
    when 'potion25' then case when r < .15 then 1 else 0 end
    when 'potion50' then case when r < .06 then 1 else 0 end
    when 'potion100' then case when r < .02 then 1 else 0 end
    when 'instant' then 1 + floor(r * 3)
    when 'hourglass' then floor(r * 3)
    else 1 end;
end $function$
;

-- fonction : _today()
CREATE OR REPLACE FUNCTION public._today()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select (now() at time zone 'Europe/Paris')::date $function$
;

-- fonction : _upgrade_cost(target integer)
CREATE OR REPLACE FUNCTION public._upgrade_cost(target integer)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select greatest(100, round(100 * power(greatest(1, target - 5), 1.4) / 50) * 50)::bigint;
$function$
;

-- fonction : _vmult(v text)
CREATE OR REPLACE FUNCTION public._vmult(v text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case v when 'gold' then 3 when 'celeste' then 10 when 'ombre' then 25 else 1 end $function$
;

-- fonction : _vodds(v text)
CREATE OR REPLACE FUNCTION public._vodds(v text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case v when 'gold' then 20 when 'celeste' then 200 when 'ombre' then 500 else 1 end $function$
;

-- fonction : admin_announce(p_body text, p_fullscreen boolean, p_banner boolean)
CREATE OR REPLACE FUNCTION public.admin_announce(p_body text, p_fullscreen boolean, p_banner boolean)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k bigint;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  insert into public.announcements (body, fullscreen, banner, author)
    values (trim(p_body), p_fullscreen, p_banner, (select pseudo from public.profiles where id = auth.uid())) returning id into k;
  return k;
end $function$
;

-- fonction : admin_ban(target uuid, p_ban boolean)
CREATE OR REPLACE FUNCTION public.admin_ban(target uuid, p_ban boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  if target = auth.uid() then raise exception 'self'; end if;
  update public.profiles set banned = p_ban where id = target;
end $function$
;

-- fonction : admin_clear_showcase(target uuid)
CREATE OR REPLACE FUNCTION public.admin_clear_showcase(target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set showcase = '{}', bio = '' where id = target;
end $function$
;

-- fonction : admin_code_delete(p_code text)
CREATE OR REPLACE FUNCTION public.admin_code_delete(p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.promo_codes where code = p_code;
end $function$
;

-- fonction : admin_code_save(p_code text, p_coins bigint, p_pulls integer, p_items jsonb, p_max integer, p_expires timestamp with time zone)
CREATE OR REPLACE FUNCTION public.admin_code_save(p_code text, p_coins bigint, p_pulls integer, p_items jsonb, p_max integer, p_expires timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  if upper(trim(p_code)) !~ '^[A-Z0-9_\-]{3,24}$' then raise exception 'bad_code'; end if;
  insert into public.promo_codes (code, coins, pulls, items, max_uses, expires_at)
    values (upper(trim(p_code)), greatest(0, coalesce(p_coins, 0)), greatest(0, coalesce(p_pulls, 0)), coalesce(p_items, '[]'), nullif(p_max, 0), p_expires)
  on conflict (code) do update set coins = excluded.coins, pulls = excluded.pulls, items = excluded.items, max_uses = excluded.max_uses, expires_at = excluded.expires_at;
end $function$
;

-- fonction : admin_code_toggle(p_code text, p_active boolean)
CREATE OR REPLACE FUNCTION public.admin_code_toggle(p_code text, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.promo_codes set active = p_active where code = p_code;
end $function$
;

-- fonction : admin_codes()
CREATE OR REPLACE FUNCTION public.admin_codes()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when public._is_admin() then coalesce(json_agg(row_to_json(c) order by c.created_at desc), '[]') end from public.promo_codes c;
$function$
;

-- fonction : admin_delete_announcement(p_id bigint)
CREATE OR REPLACE FUNCTION public.admin_delete_announcement(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.announcements where id = p_id;
end $function$
;

-- fonction : admin_delete_message(p_id bigint)
CREATE OR REPLACE FUNCTION public.admin_delete_message(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.messages where id = p_id;
end $function$
;

-- fonction : admin_feedback()
CREATE OR REPLACE FUNCTION public.admin_feedback()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when public._is_admin() then coalesce(json_agg(row_to_json(f) order by f.created_at desc), '[]') end
  from (select id, pseudo, kind, body, page, device, status, created_at from public.feedback order by created_at desc limit 300) f;
$function$
;

-- fonction : admin_feedback_set(p_id bigint, p_status text)
CREATE OR REPLACE FUNCTION public.admin_feedback_set(p_id bigint, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  if p_status = 'delete' then delete from public.feedback where id = p_id;
  else update public.feedback set status = p_status where id = p_id; end if;
end $function$
;

-- fonction : admin_give(target uuid, p_coins bigint, p_pulls integer)
CREATE OR REPLACE FUNCTION public.admin_give(target uuid, p_coins bigint DEFAULT 0, p_pulls integer DEFAULT 0)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k int;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set coins = greatest(0, coins + p_coins), stock = least(50, greatest(0, stock + p_pulls))
    where target is null or id = target;
  get diagnostics k = row_count;
  return k;
end $function$
;

-- fonction : admin_give_item(target uuid, p_item text)
CREATE OR REPLACE FUNCTION public.admin_give_item(target uuid, p_item text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare it public.shop_items;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  select * into it from public.shop_items where id = p_item;
  if not found then raise exception 'unknown_item'; end if;
  if it.kind in ('banner', 'avatar') then perform public._apply_item(target, it); else perform public._add_item(target, p_item, 1); end if;
end $function$
;

-- fonction : admin_give_jeton(target uuid, p_jeton text)
CREATE OR REPLACE FUNCTION public.admin_give_jeton(target uuid, p_jeton text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o int;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  select odds into o from public.jetons where serie = 'Takoras' and name = p_jeton;
  if o is null then raise exception 'unknown_jeton'; end if;
  insert into public.pulls (user_id, serie, jeton, odds) values (target, 'Takoras', p_jeton, o);
end $function$
;

-- fonction : admin_inventory(target uuid)
CREATE OR REPLACE FUNCTION public.admin_inventory(target uuid)
 RETURNS TABLE(id bigint, jeton text, odds integer, locked boolean, showcased boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return query select p.id, p.jeton, p.odds, p.locked, p.id = any(pr.showcase), p.created_at
    from public.pulls p join public.profiles pr on pr.id = p.user_id
    where p.user_id = target and p.sold_at is null order by p.odds desc, p.created_at desc;
end $function$
;

-- fonction : admin_lock_pulls(target uuid, ids bigint[], p_locked boolean)
CREATE OR REPLACE FUNCTION public.admin_lock_pulls(target uuid, ids bigint[], p_locked boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.pulls set locked = p_locked where user_id = target and id = any(ids);
end $function$
;

-- fonction : admin_messages(target uuid)
CREATE OR REPLACE FUNCTION public.admin_messages(target uuid)
 RETURNS TABLE(id bigint, from_pseudo text, to_pseudo text, body text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return query select m.id, s.pseudo, r.pseudo, m.body, m.created_at
    from public.messages m join public.profiles s on s.id = m.sender join public.profiles r on r.id = m.receiver
    where target in (m.sender, m.receiver) order by m.id desc limit 200;
end $function$
;

-- fonction : admin_patchnote_delete(p_id bigint)
CREATE OR REPLACE FUNCTION public.admin_patchnote_delete(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.patchnotes where id = p_id;
end $function$
;

-- fonction : admin_patchnote_save(p_id bigint, p_title text, p_lines jsonb, p_title_en text, p_lines_en jsonb)
CREATE OR REPLACE FUNCTION public.admin_patchnote_save(p_id bigint, p_title text, p_lines jsonb, p_title_en text DEFAULT NULL::text, p_lines_en jsonb DEFAULT NULL::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k bigint;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  if p_id is null then insert into public.patchnotes (title, lines, title_en, lines_en) values (trim(p_title), coalesce(p_lines, '[]'), nullif(trim(p_title_en), ''), p_lines_en) returning id into k;
  else update public.patchnotes set title = trim(p_title), lines = coalesce(p_lines, '[]'), title_en = nullif(trim(p_title_en), ''), lines_en = p_lines_en where id = p_id returning id into k; end if;
  return k;
end $function$
;

-- fonction : admin_player(target uuid)
CREATE OR REPLACE FUNCTION public.admin_player(target uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  select * into r from public.profiles where id = target;
  return json_build_object('id', r.id, 'pseudo', r.pseudo, 'coins', r.coins, 'stock', r.stock, 'stock_max', r.stock_max,
    'is_admin', r.is_admin, 'banned', r.banned, 'bio', r.bio, 'showcase', r.showcase, 'banner', r.banner, 'banners', r.banners, 'potions', r.potions, 'luck', public._luck(r.potions),
    'fast_until', r.fast_until, 'created_at', r.created_at,
    'email', (select email from auth.users where id = target),
    'items', (select coalesce(json_agg(json_build_object('item', item, 'qty', qty)), '[]') from public.user_items where user_id = target and qty > 0),
    'inventory', (select coalesce(json_agg(json_build_object('jeton', jeton, 'n', n, 'odds', odds) order by odds desc), '[]')
                  from (select jeton, odds, count(*) n from public.pulls where user_id = target and sold_at is null group by jeton, odds) x),
    'recent', (select coalesce(json_agg(json_build_object('jeton', jeton, 'odds', odds, 'at', created_at, 'sold', sold_at is not null) order by created_at desc), '[]')
               from (select * from public.pulls where user_id = target order by created_at desc limit 15) y));
end $function$
;

-- fonction : admin_players(q text)
CREATE OR REPLACE FUNCTION public.admin_players(q text DEFAULT ''::text)
 RETURNS TABLE(id uuid, pseudo text, coins bigint, stock integer, stock_max integer, pulls bigint, best_odds integer, created_at timestamp with time zone, banned boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return query
    select p.id, p.pseudo, p.coins, p.stock, p.stock_max,
           (select count(*) from public.pulls x where x.user_id = p.id),
           (select max(x.odds) from public.pulls x where x.user_id = p.id),
           p.created_at, p.banned
    from public.profiles p
    where coalesce(q, '') = '' or p.pseudo ilike q || '%'
    order by p.created_at desc limit 100;
end $function$
;

-- fonction : admin_remove_pulls(target uuid, ids bigint[])
CREATE OR REPLACE FUNCTION public.admin_remove_pulls(target uuid, ids bigint[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k int;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.pulls where user_id = target and id = any(ids);
  get diagnostics k = row_count;
  update public.profiles set showcase = array(select case when x = any(ids) then null else x end from unnest(showcase) x) where id = target;
  return k;
end $function$
;

-- fonction : admin_reset(target uuid)
CREATE OR REPLACE FUNCTION public.admin_reset(target uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k int;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.pulls where target is null or user_id = target;
  delete from public.shop_buys where target is null or user_id = target;
  delete from public.shop_buys2 where target is null or user_id = target;
  delete from public.user_items where target is null or user_id = target;
  delete from public.pending_pulls where target is null or user_id = target;
  delete from public.token_levels where target is null or user_id = target;
  update public.profiles set coins = 0, stock = 5, stock_max = 5, stock_last = now(), showcase = '{}', deck = '{}', avatar = 'default',
    potions = '[]', regen_s = 180, daily_last = null, daily_streak = 0, luck_mult = 1, luck_left = 0, fast_until = null
    where target is null or id = target;
  get diagnostics k = row_count;
  return k;
end $function$
;

-- fonction : admin_set_beta(p_on boolean)
CREATE OR REPLACE FUNCTION public.admin_set_beta(p_on boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  insert into public.site_settings (k, v) values ('beta', case when p_on then 'on' else 'off' end) on conflict (k) do update set v = excluded.v;
end $function$
;

-- fonction : admin_set_items(target uuid, p_item text, p_qty integer)
CREATE OR REPLACE FUNCTION public.admin_set_items(target uuid, p_item text, p_qty integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  insert into public.user_items (user_id, item, qty) values (target, p_item, greatest(0, p_qty))
    on conflict (user_id, item) do update set qty = greatest(0, p_qty);
end $function$
;

-- fonction : admin_set_pseudo(target uuid, p text)
CREATE OR REPLACE FUNCTION public.admin_set_pseudo(target uuid, p text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  if p !~ '^[A-Za-z0-9_\-\.]{3,16}$' then raise exception 'bad_pseudo'; end if;
  if exists (select 1 from public.profiles where lower(pseudo) = lower(p) and id <> target) then raise exception 'pseudo_taken'; end if;
  update public.profiles set pseudo = p where id = target;
end $function$
;

-- fonction : admin_shop()
CREATE OR REPLACE FUNCTION public.admin_shop()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when public._is_admin() then json_agg(json_build_object('id', s.id, 'kind', s.kind, 'price', public._price(s.id, public._period()), 'base_price', s.price, 'active', s.active, 'data', s.data,
    'stock', public._stock(s.id, public._period()),
    'sold', (select coalesce(sum(qty), 0) from public.shop_buys2 b where b.item = s.id and b.period = public._period()))
    order by case s.kind when 'potion' then 0 when 'instant' then 1 when 'hourglass' then 1 else 2 end, s.price) end
  from public.shop_items s;
$function$
;

-- fonction : admin_shop_reroll()
CREATE OR REPLACE FUNCTION public.admin_shop_reroll()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.shop_settings set v = (v::int + 1)::text where k = 'seed';
  delete from public.shop_overrides where period = public._period();
  delete from public.shop_price_overrides where period = public._period();
  delete from public.shop_buys2 where period = public._period();
end $function$
;

-- fonction : admin_shop_set(p_item text, p_price integer, p_active boolean, p_stock integer)
CREATE OR REPLACE FUNCTION public.admin_shop_set(p_item text, p_price integer, p_active boolean, p_stock integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare per bigint := public._period(); old int;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.shop_items set active = coalesce(p_active, active) where id = p_item;
  if p_price is not null then
    old := public._price(p_item, per);
    if p_price <> old then
      if p_price = (select price from public.shop_items where id = p_item) then
        delete from public.shop_price_overrides where item = p_item and period = per;
      else
        insert into public.shop_price_overrides (item, period, price) values (p_item, per, p_price)
          on conflict (item, period) do update set price = excluded.price;
      end if;
      insert into public.price_changes (item, old_price, new_price) values (p_item, old, p_price);
    end if;
  end if;
  if p_stock is not null then
    insert into public.shop_overrides (item, period, stock) values (p_item, per, p_stock)
      on conflict (item, period) do update set stock = excluded.stock;
  end if;
end $function$
;

-- fonction : admin_stats()
CREATE OR REPLACE FUNCTION public.admin_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when public._is_admin() then json_build_object(
    'players', (select count(*) from public.profiles),
    'pulls_today', (select count(*) from public.pulls where created_at >= current_date),
    'pulls_total', (select count(*) from public.pulls),
    'coins_total', (select coalesce(sum(coins), 0) from public.profiles),
    'best_today', (select max(odds) from public.pulls where created_at >= current_date)) end;
$function$
;

-- fonction : avatars_of(p text[])
CREATE OR REPLACE FUNCTION public.avatars_of(p text[])
 RETURNS TABLE(pseudo text, avatar text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pr.pseudo, pr.avatar from public.profiles pr where pr.pseudo = any(p) and pr.avatar <> 'default';
$function$
;

-- fonction : battle_result(p_win uuid, p_lose uuid)
CREATE OR REPLACE FUNCTION public.battle_result(p_win uuid, p_lose uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.profiles set battle_wins = battle_wins + (id = p_win)::int, battle_losses = battle_losses + (id = p_lose)::int where id in (p_win, p_lose);
  perform public._bump(p_win, p_battles => 1, p_wins => 1);
  perform public._bump(p_lose, p_battles => 1);
end $function$
;

-- fonction : beta_give(p_coins bigint, p_pulls integer, p_item text, p_qty integer, p_jeton text, p_variant text)
CREATE OR REPLACE FUNCTION public.beta_give(p_coins bigint DEFAULT 0, p_pulls integer DEFAULT 0, p_item text DEFAULT NULL::text, p_qty integer DEFAULT 1, p_jeton text DEFAULT NULL::text, p_variant text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); it public.shop_items; o int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not public._is_tester() then raise exception 'forbidden'; end if;
  update public.profiles set coins = least(1000000000000, greatest(0, coins + coalesce(p_coins, 0))), stock = least(50, greatest(0, stock + coalesce(p_pulls, 0))) where id = uid;
  if p_item is not null then
    select * into it from public.shop_items where id = p_item;
    if not found then raise exception 'unknown_item'; end if;
    if it.kind in ('banner', 'avatar') then
      begin perform public._apply_item(uid, it); exception when others then null; end; -- déjà possédé : rien
    else perform public._add_item(uid, it.id, greatest(1, least(100, coalesce(p_qty, 1)))); end if;
  end if;
  if p_jeton is not null then
    select odds into o from public.jetons where serie = 'Takoras' and name = p_jeton;
    if o is null then raise exception 'unknown_jeton'; end if;
    insert into public.pulls (user_id, serie, jeton, odds, variant)
      select uid, 'Takoras', p_jeton, o, nullif(p_variant, '') from generate_series(1, greatest(1, least(50, coalesce(p_qty, 1))));
  end if;
  return public.eco_state();
end $function$
;

-- fonction : beta_of(p text[])
CREATE OR REPLACE FUNCTION public.beta_of(p text[])
 RETURNS TABLE(pseudo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pr.pseudo from public.profiles pr where pr.pseudo = any(p) and pr.beta $function$
;

-- fonction : buy_item(p_item text)
CREATE OR REPLACE FUNCTION public.buy_item(p_item text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); it public.shop_items; r public.profiles; q int; per bigint := public._period(); pr int;
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  select * into it from public.shop_items where id = p_item and active;
  if not found then raise exception 'not_in_shop'; end if;
  pr := public._price(p_item, per);
  select * into r from public.profiles where id = uid for update;
  select coalesce((select qty from public.shop_buys2 where user_id = uid and period = per and item = p_item), 0) into q;
  if q >= public._stock(p_item, per) then raise exception 'limit_reached'; end if;
  if r.coins < pr then raise exception 'not_enough_coins'; end if;
  if it.kind in ('banner', 'avatar') then perform public._apply_item(uid, it); else perform public._add_item(uid, it.id, 1); end if;
  update public.profiles set coins = coins - pr where id = uid;
  insert into public.shop_buys2 (user_id, period, item, qty) values (uid, per, p_item, 1)
    on conflict (user_id, period, item) do update set qty = public.shop_buys2.qty + 1;
  perform public._bump(uid, p_bought => 1);
  return public.eco_state();
end $function$
;

-- fonction : change_pseudo(p text)
CREATE OR REPLACE FUNCTION public.change_pseudo(p text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban();
  p := trim(p);
  if p !~ '^[A-Za-z0-9_\-\.]{3,16}$' then raise exception 'bad_pseudo'; end if;
  select * into r from public.profiles where id = auth.uid() for update;
  if r.pseudo = p then return; end if;
  if exists (select 1 from public.profiles where lower(pseudo) = lower(p) and id <> auth.uid()) then raise exception 'pseudo_taken'; end if;
  if r.pseudo is not null and lower(r.pseudo) <> lower(p) and not r.pseudo_free
     and r.pseudo_changed_at > now() - interval '30 days' then raise exception 'pseudo_cooldown'; end if;
  update public.profiles set pseudo = p,
    -- changer juste les majuscules ne compte pas
    pseudo_free = case when r.pseudo is null or lower(r.pseudo) = lower(p) then pseudo_free else false end,
    pseudo_changed_at = case when r.pseudo is null or lower(r.pseudo) = lower(p) then pseudo_changed_at
                             when r.pseudo_free then pseudo_changed_at else now() end
  where id = auth.uid();
end $function$
;

-- fonction : claim_daily()
CREATE OR REPLACE FUNCTION public.claim_daily()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; st int; amt int;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  select * into r from public.profiles where id = auth.uid() for update;
  if r.daily_last = public._today() then raise exception 'daily_already'; end if;
  st := case when r.daily_last = public._today() - 1 then r.daily_streak + 1 else 1 end;
  amt := public._daily_amount(st);
  update public.profiles set coins = coins + amt, daily_last = public._today(), daily_streak = st where id = auth.uid();
  return json_build_object('amount', amt, 'streak', st, 'state', public.eco_state());
end $function$
;

-- fonction : claim_quest(p_id text)
CREATE OR REPLACE FUNCTION public.claim_quest(p_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); q public.quests; s public.daily_stats;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban();
  if not exists (select 1 from (select qq.id from public.quests qq order by md5(uid::text || public._today()::text || qq.id) limit 3) x where x.id = p_id) then raise exception 'quest_unknown'; end if;
  select * into q from public.quests where id = p_id;
  select * into s from public.daily_stats where user_id = uid and day = public._today() for update;
  if not found or coalesce((to_jsonb(s) ->> q.stat)::int, 0) < q.target then raise exception 'quest_not_done'; end if;
  if p_id = any(s.claimed) then raise exception 'quest_claimed'; end if;
  update public.daily_stats set claimed = array_append(claimed, p_id) where user_id = uid and day = public._today();
  if q.reward_coins > 0 then update public.profiles set coins = coins + q.reward_coins where id = uid; end if;
  if q.reward_item is not null then perform public._add_item(uid, q.reward_item, q.reward_qty); end if;
  return public.eco_state();
end $function$
;

-- fonction : collection_of(p_pseudo text)
CREATE OR REPLACE FUNCTION public.collection_of(p_pseudo text)
 RETURNS TABLE(jeton text, variant text, total bigint, serie text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.jeton, coalesce(p.variant, ''), count(*), p.serie
  from public.pulls p join public.profiles pr on pr.id = p.user_id
  where lower(pr.pseudo) = lower(p_pseudo) group by p.jeton, coalesce(p.variant, ''), p.serie;
$function$
;

-- fonction : eco_state()
CREATE OR REPLACE FUNCTION public.eco_state()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; step int;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  perform public._regen(auth.uid());
  select * into r from public.profiles where id = auth.uid();
  step := case when r.fast_until > now() then r.regen_s / 2 else r.regen_s end;
  return json_build_object('coins', r.coins, 'stock', r.stock, 'max', r.stock_max, 'admin', r.is_admin, 'pseudo', r.pseudo, 'banned', r.banned, 'beta', r.beta, 'tester', r.beta and public._beta_open(),
    'next_in', greatest(0, step - extract(epoch from (now() - r.stock_last)))::int, 'step', step, 'regen', r.regen_s, 'streak', case when r.daily_last >= public._today() - 1 then r.daily_streak else 0 end, 'streak_today', r.daily_last = public._today(),
    'potions', r.potions, 'luck', public._luck(r.potions),
    'fast_left', greatest(0, extract(epoch from (coalesce(r.fast_until, now()) - now())))::int);
end $function$
;

-- fonction : friend_remove(p_other uuid)
CREATE OR REPLACE FUNCTION public.friend_remove(p_other uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  delete from public.friendships where a = least((select auth.uid()), p_other) and b = greatest((select auth.uid()), p_other);
$function$
;

-- fonction : friend_request(p_pseudo text)
CREATE OR REPLACE FUNCTION public.friend_request(p_pseudo text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid := auth.uid(); other uuid; x uuid; y uuid; f public.friendships;
begin
  if me is null then raise exception 'not_logged_in'; end if;
  select id into other from public.profiles where lower(pseudo) = lower(trim(p_pseudo));
  if other is null then raise exception 'unknown_player'; end if;
  if other = me then raise exception 'self'; end if;
  x := least(me, other); y := greatest(me, other);
  select * into f from public.friendships where a = x and b = y;
  if found then
    if f.status = 'accepted' then return 'already'; end if;
    if f.requested_by <> me then  -- il m'avait déjà demandé : on accepte
      update public.friendships set status = 'accepted' where a = x and b = y; return 'accepted';
    end if;
    return 'pending';
  end if;
  insert into public.friendships (a, b, status, requested_by) values (x, y, 'pending', me);
  return 'sent';
end $function$
;

-- fonction : friend_respond(p_other uuid, p_accept boolean)
CREATE OR REPLACE FUNCTION public.friend_respond(p_other uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid := auth.uid();
begin
  if p_accept then
    update public.friendships set status = 'accepted' where a = least(me, p_other) and b = greatest(me, p_other) and status = 'pending' and requested_by <> me;
  else
    delete from public.friendships where a = least(me, p_other) and b = greatest(me, p_other);
  end if;
end $function$
;

-- fonction : friend_status(p_pseudo text)
CREATE OR REPLACE FUNCTION public.friend_status(p_pseudo text)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select json_build_object('id', o.id, 'status', f.status, 'incoming', f.status = 'pending' and f.requested_by <> (select auth.uid()))
  from public.profiles o
  left join public.friendships f on f.a = least((select auth.uid()), o.id) and f.b = greatest((select auth.uid()), o.id)
  where lower(o.pseudo) = lower(p_pseudo);
$function$
;

-- fonction : handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ps text := new.raw_user_meta_data->>'pseudo';
begin
  if ps is null or ps !~ '^[A-Za-z0-9_\-\.]{3,16}$' or exists (select 1 from public.profiles where lower(pseudo) = lower(ps)) then ps := null; end if;
  ps := coalesce(ps, public._free_pseudo(new.raw_user_meta_data->>'full_name'),
                 public._free_pseudo(new.raw_user_meta_data->'custom_claims'->>'global_name'),
                 public._free_pseudo(split_part(new.raw_user_meta_data->>'name', '#', 1)));
  insert into public.profiles (id, pseudo, beta) values (new.id, ps, public._beta_open());
  return new;
end $function$
;

-- fonction : leaderboard(kind text, since timestamp with time zone, n integer)
CREATE OR REPLACE FUNCTION public.leaderboard(kind text, since timestamp with time zone DEFAULT NULL::timestamp with time zone, n integer DEFAULT 20)
 RETURNS TABLE(pseudo text, value bigint, jeton text, odds integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with s as (
    select p.user_id, count(*) as cnt, count(distinct p.serie || '/' || p.jeton) as collec,
           count(*) filter (where p.variant is not null and p.variant <> '') as vars,
           (array_agg(p.jeton order by p.odds desc, p.created_at))[1] as best_jeton, max(p.odds) as best_odds
    from public.pulls p
    where since is null or p.created_at >= since
    group by p.user_id
  )
  select pr.pseudo,
         case kind when 'gain' then s.best_odds::bigint when 'collec' then s.collec when 'variants' then s.vars else s.cnt end as value,
         s.best_jeton, s.best_odds
  from s join public.profiles pr on pr.id = s.user_id
  where pr.pseudo is not null and (kind <> 'variants' or s.vars > 0)
  order by value desc, pr.created_at
  limit least(greatest(n, 1), 100);
$function$
;

-- fonction : level_up(p_jeton text, p_serie text)
CREATE OR REPLACE FUNCTION public.level_up(p_jeton text, p_serie text DEFAULT 'Takoras'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); r public.profiles; cur int; total int; ids bigint[];
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  select * into r from public.profiles where id = uid for update;
  select coalesce((select lvl from public.token_levels where user_id = uid and serie = p_serie and jeton = p_jeton), 1) into cur;
  if cur >= 10 then raise exception 'max_reached'; end if;
  select count(*) into total from public.pulls where user_id = uid and serie = p_serie and jeton = p_jeton and sold_at is null;
  select array_agg(id) into ids from (
    select p.id from public.pulls p
    where p.user_id = uid and p.serie = p_serie and p.jeton = p_jeton and p.sold_at is null and not p.locked
      and not (p.id = any(coalesce(array_remove(r.showcase, null), '{}'))) and not (p.id = any(coalesce(array_remove(r.deck, null), '{}')))
    order by case coalesce(p.variant, '') when '' then 0 when 'gold' then 1 when 'celeste' then 2 else 3 end, p.created_at
    limit cur) x;
  if coalesce(array_length(ids, 1), 0) < cur or total - cur < 1 then raise exception 'not_enough_dupes'; end if;
  update public.pulls set sold_at = now(), fused = true where id = any(ids);
  insert into public.token_levels (user_id, serie, jeton, lvl) values (uid, p_serie, p_jeton, cur + 1)
    on conflict (user_id, serie, jeton) do update set lvl = excluded.lvl;
  return json_build_object('lvl', cur + 1, 'used', cur);
end $function$
;

-- fonction : live_feed(n integer)
CREATE OR REPLACE FUNCTION public.live_feed(n integer DEFAULT 20)
 RETURNS TABLE(pseudo text, serie text, jeton text, odds integer, variant text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pr.pseudo, p.serie, p.jeton, p.odds, p.variant, p.created_at
  from public.pulls p join public.profiles pr on pr.id = p.user_id
  where pr.pseudo is not null
    and (p.odds >= 100 or p.variant is not null)
    and p.odds::bigint * public._vodds(p.variant) >= 100
  order by p.created_at desc limit least(greatest(n, 1), 50);
$function$
;

-- fonction : lock_pulls(ids bigint[], p_locked boolean)
CREATE OR REPLACE FUNCTION public.lock_pulls(ids bigint[], p_locked boolean)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k int;
begin
  update public.pulls set locked = p_locked where id = any(ids) and user_id = auth.uid() and sold_at is null;
  get diagnostics k = row_count; return k;
end $function$
;

-- fonction : mark_read(p_other uuid)
CREATE OR REPLACE FUNCTION public.mark_read(p_other uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.messages set read_at = now() where receiver = (select auth.uid()) and sender = p_other and read_at is null;
$function$
;

-- fonction : my_collection()
CREATE OR REPLACE FUNCTION public.my_collection()
 RETURNS TABLE(jeton text, variant text, total bigint, owned bigint, serie text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.jeton, coalesce(p.variant, ''), count(*), count(*) filter (where p.sold_at is null), p.serie
  from public.pulls p where p.user_id = (select auth.uid()) group by p.jeton, coalesce(p.variant, ''), p.serie;
$function$
;

-- fonction : my_conversation(p_other uuid, p_before bigint)
CREATE OR REPLACE FUNCTION public.my_conversation(p_other uuid, p_before bigint DEFAULT NULL::bigint)
 RETURNS TABLE(id bigint, mine boolean, body text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select * from (
    select m.id, m.sender = (select auth.uid()), m.body, m.created_at from public.messages m
    where ((m.sender = (select auth.uid()) and m.receiver = p_other) or (m.sender = p_other and m.receiver = (select auth.uid())))
      and (p_before is null or m.id < p_before)
    order by m.id desc limit 60) x order by id;
$function$
;

-- fonction : my_daily()
CREATE OR REPLACE FUNCTION public.my_daily()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; nxt int;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  select * into r from public.profiles where id = auth.uid();
  nxt := case when r.daily_last = public._today() - 1 then r.daily_streak + 1 when r.daily_last = public._today() then r.daily_streak else 1 end;
  return json_build_object('available', r.daily_last is distinct from public._today(), 'streak', case when r.daily_last >= public._today() - 1 then r.daily_streak else 0 end,
    'next_streak', nxt, 'amount', public._daily_amount(nxt), 'tomorrow', public._daily_amount(case when r.daily_last = public._today() then r.daily_streak + 1 else nxt + 1 end));
end $function$
;

-- fonction : my_deck()
CREATE OR REPLACE FUNCTION public.my_deck()
 RETURNS TABLE(id bigint, jeton text, odds integer, variant text, lvl integer, serie text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.id, p.jeton, p.odds, coalesce(p.variant, ''), coalesce(tl.lvl, 1), p.serie
  from public.profiles pr, unnest(pr.deck) with ordinality d(x, o)
  join public.pulls p on p.id = d.x and p.sold_at is null
  left join public.token_levels tl on tl.user_id = p.user_id and tl.serie = p.serie and tl.jeton = p.jeton
  where pr.id = (select auth.uid()) order by d.o;
$function$
;

-- fonction : my_friends()
CREATE OR REPLACE FUNCTION public.my_friends()
 RETURNS TABLE(id uuid, pseudo text, status text, incoming boolean, unread bigint, last_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select o.id, o.pseudo, f.status, f.status = 'pending' and f.requested_by <> (select auth.uid()),
    (select count(*) from public.messages m where m.sender = o.id and m.receiver = (select auth.uid()) and m.read_at is null),
    (select max(m.created_at) from public.messages m where (m.sender = o.id and m.receiver = (select auth.uid())) or (m.receiver = o.id and m.sender = (select auth.uid())))
  from public.friendships f
  join public.profiles o on o.id = case when f.a = (select auth.uid()) then f.b else f.a end
  where (select auth.uid()) in (f.a, f.b)
  order by 5 desc, 6 desc nulls last, o.pseudo;
$function$
;

-- fonction : my_inventory()
CREATE OR REPLACE FUNCTION public.my_inventory()
 RETURNS TABLE(id bigint, jeton text, odds integer, variant text, locked boolean, showcased boolean, in_deck boolean, created_at timestamp with time zone, serie text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.id, p.jeton, p.odds, p.variant, p.locked, coalesce(p.id = any(array_remove(pr.showcase, null)), false), coalesce(p.id = any(array_remove(pr.deck, null)), false), p.created_at, p.serie
  from public.pulls p join public.profiles pr on pr.id = p.user_id
  where p.user_id = (select auth.uid()) and p.sold_at is null order by p.odds desc, p.created_at desc;
$function$
;

-- fonction : my_inventory_groups()
CREATE OR REPLACE FUNCTION public.my_inventory_groups()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with pr as (select array_remove(showcase, null) sc, array_remove(deck, null) dk from public.profiles where id = (select auth.uid())),
  x as (
    select p.serie, p.jeton, p.odds, coalesce(p.variant, '') variant, p.id, p.locked, p.created_at, p.luck,
           p.id = any(pr.sc) shown, p.id = any(pr.dk) in_deck
    from public.pulls p, pr where p.user_id = (select auth.uid()) and p.sold_at is null)
  select coalesce(json_agg(g), '[]') from (
    select serie, jeton, odds, variant,
           array_agg(id order by created_at desc) ids,
           coalesce(array_agg(id order by created_at desc) filter (where not locked and not shown and not in_deck), '{}') free,
           count(*) filter (where shown) shown, count(*) filter (where in_deck) deck,
           max(created_at) last, max(luck) best_luck
    from x group by serie, jeton, odds, variant) g;
$function$
;

-- fonction : my_items()
CREATE OR REPLACE FUNCTION public.my_items()
 RETURNS TABLE(item text, kind text, qty integer, data jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select u.item, s.kind, u.qty, s.data from public.user_items u join public.shop_items s on s.id = u.item
  where u.user_id = (select auth.uid()) and u.qty > 0 order by s.kind, s.price;
$function$
;

-- fonction : my_levels()
CREATE OR REPLACE FUNCTION public.my_levels()
 RETURNS TABLE(serie text, jeton text, lvl integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select serie, jeton, lvl from public.token_levels where user_id = (select auth.uid());
$function$
;

-- fonction : my_quests()
CREATE OR REPLACE FUNCTION public.my_quests()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); s public.daily_stats; out json;
begin
  if uid is null then return null; end if;
  select * into s from public.daily_stats where user_id = uid and day = public._today();
  select json_build_object(
    'reset_in', extract(epoch from ((public._today() + 1)::timestamp at time zone 'Europe/Paris' - now()))::int,
    'quests', json_agg(json_build_object('id', q.id, 'stat', q.stat, 'target', q.target, 'coins', q.reward_coins, 'item', q.reward_item, 'qty', q.reward_qty,
      'value', least(q.target, coalesce((to_jsonb(s) ->> q.stat)::int, 0)), 'claimed', coalesce(q.id = any(s.claimed), false)) order by q.k))
  into out
  from (select qq.*, md5(uid::text || public._today()::text || qq.id) k from public.quests qq order by k limit 3) q;
  return out;
end $function$
;

-- fonction : profile_public(p_pseudo text)
CREATE OR REPLACE FUNCTION public.profile_public(p_pseudo text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; mine boolean;
begin
  select * into r from public.profiles where lower(pseudo) = lower(p_pseudo);
  if not found then return null; end if;
  mine := r.id = (select auth.uid());
  return json_build_object(
    'pseudo', r.pseudo, 'num', r.num, 'streak', case when r.daily_last >= public._today() - 1 then r.daily_streak else 0 end, 'beta', r.beta, 'wins', r.battle_wins, 'losses', r.battle_losses, 'avatar', r.avatar, 'banner', r.banner, 'bio', r.bio, 'joined', r.created_at,
    'banners', case when mine then to_json(r.banners) else null end, 'avatars', case when mine then to_json(r.avatars) else null end,
    'email', case when mine then (select email from auth.users where id = r.id) else null end,
    'provider', case when mine then (select raw_app_meta_data->>'provider' from auth.users where id = r.id) else null end,
    'pseudo_free', case when mine then r.pseudo_free end,
    'pseudo_next', case when mine and not r.pseudo_free and r.pseudo_changed_at > now() - interval '30 days' then r.pseudo_changed_at + interval '30 days' end,
    'showcase', (select json_agg(case when p.id is null then null else json_build_object('id', p.id, 'jeton', p.jeton, 'odds', p.odds, 'variant', p.variant) end order by i)
                 from generate_series(1, 5) i left join public.pulls p on p.id = r.showcase[i] and p.sold_at is null),
    'pulls', (select count(*) from public.pulls p where p.user_id = r.id),
    'best', (select max(p.odds) from public.pulls p where p.user_id = r.id),
    'best_variant', null, 'best_pull', (select json_build_object('jeton', p.jeton, 'odds', p.odds, 'variant', p.variant, 'eff', p.odds::bigint * public._vodds(p.variant))
                   from public.pulls p where p.user_id = r.id order by p.odds::bigint * public._vodds(p.variant) desc, p.created_at limit 1),
    'collection', (select count(distinct p.jeton) from public.pulls p where p.user_id = r.id),
    'owned', (select count(*) from public.pulls p where p.user_id = r.id and p.sold_at is null)
  );
end $function$
;

-- fonction : pseudo_available(p text)
CREATE OR REPLACE FUNCTION public.pseudo_available(p text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select not exists (select 1 from public.profiles where lower(pseudo) = lower(p));
$function$
;

-- fonction : redeem_code(p_code text)
CREATE OR REPLACE FUNCTION public.redeem_code(p_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); c public.promo_codes; x jsonb; it public.shop_items; q int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban();
  select * into c from public.promo_codes where code = upper(trim(p_code)) for update;
  if not found or not c.active then raise exception 'code_invalid'; end if;
  if c.expires_at is not null and c.expires_at < now() then raise exception 'code_expired'; end if;
  if c.max_uses is not null and c.uses >= c.max_uses then raise exception 'code_used_up'; end if;
  if exists (select 1 from public.promo_redeems where code = c.code and user_id = uid) then raise exception 'code_already'; end if;
  insert into public.promo_redeems (code, user_id) values (c.code, uid);
  update public.promo_codes set uses = uses + 1 where code = c.code;
  update public.profiles set coins = coins + c.coins, stock = least(50, stock + c.pulls) where id = uid;
  for x in select * from jsonb_array_elements(c.items) loop
    select * into it from public.shop_items where id = x->>'item';
    if not found then continue; end if;
    q := greatest(1, coalesce((x->>'qty')::int, 1));
    if it.kind in ('banner', 'avatar') then perform public._apply_item(uid, it); else perform public._add_item(uid, it.id, q); end if;
  end loop;
  return json_build_object('coins', c.coins, 'pulls', c.pulls, 'items', c.items, 'state', public.eco_state());
end $function$
;

-- fonction : refund_pulls(ids bigint[])
CREATE OR REPLACE FUNCTION public.refund_pulls(ids bigint[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); k int; r public.profiles;
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  select * into r from public.profiles where id = uid for update;
  -- seulement des jetons à toi, tirés il y a moins de 2 h, ni vendus, ni verrouillés, ni en vitrine / deck
  with gone as (
    delete from public.pulls p
    where p.user_id = uid and p.id = any(ids) and p.sold_at is null and not p.locked and p.created_at > now() - interval '2 hours'
      and not (p.id = any(coalesce(array_remove(r.showcase, null), '{}'))) and not (p.id = any(coalesce(array_remove(r.deck, null), '{}')))
    returning p.*)
  insert into public.pending_pulls (user_id, serie, jeton, odds, variant, luck)
    select user_id, serie, jeton, odds, variant, luck from gone order by id;
  get diagnostics k = row_count;
  update public.profiles set stock = least(50, stock + k) where id = uid;
  return json_build_object('refunded', k, 'state', public.eco_state());
end $function$
;

-- fonction : sell_pulls(ids bigint[])
CREATE OR REPLACE FUNCTION public.sell_pulls(ids bigint[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); total bigint; k int; sc bigint[]; dk bigint[];
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  select array_remove(coalesce(showcase, '{}'), null), array_remove(coalesce(deck, '{}'), null) into sc, dk from public.profiles where id = uid;
  with s as (
    update public.pulls set sold_at = now()
    where id = any(ids) and user_id = uid and sold_at is null and not locked
      and not (id = any(sc)) and not (id = any(dk))
    returning odds, variant
  ) select coalesce(sum(public._sell_value(odds) * public._vmult(variant)), 0), count(*) into total, k from s;
  update public.profiles set coins = coins + total where id = uid;
  if k > 0 then perform public._bump(uid, p_sold => k); end if;
  return json_build_object('sold', k, 'coins', total, 'state', public.eco_state());
end $function$
;

-- fonction : send_feedback(p_kind text, p_body text, p_page text, p_device text)
CREATE OR REPLACE FUNCTION public.send_feedback(p_kind text, p_body text, p_page text, p_device text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban();
  if p_kind not in ('bug', 'idea', 'add', 'other') then raise exception 'bad_kind'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 5 then raise exception 'feedback_short'; end if;
  -- anti-spam : 5 retours max par 10 minutes
  if (select count(*) from public.feedback where user_id = uid and created_at > now() - interval '10 minutes') >= 5 then raise exception 'slow_down'; end if;
  insert into public.feedback (user_id, pseudo, kind, body, page, device)
  values (uid, (select pseudo from public.profiles where id = uid), p_kind, left(trim(p_body), 1500), left(p_page, 120), left(p_device, 200));
end $function$
;

-- fonction : send_message(p_to uuid, p_body text)
CREATE OR REPLACE FUNCTION public.send_message(p_to uuid, p_body text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid := auth.uid(); k bigint;
begin
  if me is null then raise exception 'not_logged_in'; end if;
  if (select banned from public.profiles where id = me) then raise exception 'banned'; end if;
  if not exists (select 1 from public.friendships where a = least(me, p_to) and b = greatest(me, p_to) and status = 'accepted') then raise exception 'not_friends'; end if;
  if char_length(trim(p_body)) = 0 then raise exception 'empty'; end if;
  -- anti-spam : 5 messages max en 5 secondes
  if (select count(*) from public.messages where sender = me and created_at > now() - interval '5 seconds') >= 5 then raise exception 'slow_down'; end if;
  insert into public.messages (sender, receiver, body) values (me, p_to, left(trim(p_body), 500)) returning id into k;
  return k;
end $function$
;

-- fonction : set_deck(ids bigint[])
CREATE OR REPLACE FUNCTION public.set_deck(ids bigint[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); clean bigint[];
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if coalesce(array_length(ids, 1), 0) > 3 then raise exception 'deck_size'; end if;
  select coalesce(array_agg(x order by o), '{}') into clean from (
    select distinct on (p.serie, p.jeton) u.x, u.o from unnest(ids) with ordinality u(x, o)
    join public.pulls p on p.id = u.x and p.user_id = uid and p.sold_at is null
    order by p.serie, p.jeton, u.o) d;
  update public.profiles set deck = clean where id = uid;
end $function$
;

-- fonction : set_pseudo(p text)
CREATE OR REPLACE FUNCTION public.set_pseudo(p text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  if p !~ '^[A-Za-z0-9_\-\.]{3,16}$' then raise exception 'bad_pseudo'; end if;
  if exists (select 1 from public.profiles where lower(pseudo) = lower(p)) then raise exception 'pseudo_taken'; end if;
  update public.profiles set pseudo = p where id = auth.uid() and pseudo is null;
  if not found then raise exception 'pseudo_already_set'; end if;
end $function$
;

-- fonction : shop_today()
CREATE OR REPLACE FUNCTION public.shop_today()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select json_build_object(
    'reset_in', ((public._period() + 1) * 18000 - extract(epoch from now()))::int,
    'items', (select json_agg(json_build_object('id', s.id, 'kind', s.kind, 'price', public._price(s.id, public._period()), 'base_price', s.price, 'data', s.data,
               'stock', public._stock(s.id, public._period()),
               'bought', coalesce((select b.qty from public.shop_buys2 b where b.user_id = (select auth.uid()) and b.period = public._period() and b.item = s.id), 0),
               'owned', (s.kind = 'banner' and exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and substr(s.id, 3) = any(pr.banners))) or (s.kind = 'avatar' and exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and substr(s.id, 3) = any(pr.avatars))))
              order by case s.kind when 'potion' then 0 when 'instant' then 1 when 'hourglass' then 1 else 2 end, s.price)
             from public.shop_items s where s.active));
$function$
;

-- fonction : take_pulls(n integer, force text, luck numeric, p_variant text)
CREATE OR REPLACE FUNCTION public.take_pulls(n integer, force text DEFAULT NULL::text, luck numeric DEFAULT 1, p_variant text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); r public.profiles; res text[] := '{}'; vars text[] := '{}'; ids bigint[] := '{}'; nm text; o int; i int; l numeric; pots jsonb; v text;
  nr int := 0; nv int := 0; nf int := 0; lucks numeric[] := '{}'; pp public.pending_pulls; pid bigint;
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  perform public._regen(uid);
  select * into r from public.profiles where id = uid for update;
  if r.pseudo is null then raise exception 'no_pseudo'; end if;
  if n > 50 then raise exception 'too_many_pulls'; end if; -- max 50 d'un coup
  if n < 1 or n > r.stock then raise exception 'not_enough_pulls'; end if;
  update public.profiles set stock = stock - n, stock_last = case when r.stock >= r.stock_max then now() else stock_last end where id = uid;
  if not (r.is_admin or public._is_tester()) then force := null; luck := 1; p_variant := null; end if;
  if force is not null and not exists (select 1 from public.jetons where serie = 'Takoras' and name = force) then force := null; end if;
  pots := r.potions;
  for i in 1..n loop
    pp := null;
    -- d'abord les pulls remboursés (sauf tirage forcé de test) : même résultat qu'avant, pas de potion consommée
    if force is null and p_variant is null then
      select * into pp from public.pending_pulls where user_id = uid order by id limit 1 for update;
    end if;
    if pp.id is not null then
      delete from public.pending_pulls where id = pp.id;
      nm := pp.jeton; o := pp.odds; v := pp.variant; l := coalesce(pp.luck, 1);
    else
      -- chance de ce pull = luck admin × (1 + somme des bonus des potions actives)
      l := greatest(1, least(coalesce(luck, 1), 1000000)) * public._luck(pots);
      nm := coalesce(force, public._draw('Takoras', l));
      select odds into o from public.jetons where serie = 'Takoras' and name = nm;
      v := coalesce(p_variant, public._roll_variant());
      if p_variant = 'none' then v := null; end if;
      nf := nf + 1;
      if o >= 100 then nr := nr + 1; end if;
      if v is not null then nv := nv + 1; end if;
      -- chaque potion active perd un pull ; on retire celles qui sont finies
      select coalesce(jsonb_agg(jsonb_build_object('m', x->'m', 'n', (x->>'n')::int - 1)) filter (where (x->>'n')::int > 1), '[]')
        into pots from jsonb_array_elements(pots) x;
    end if;
    insert into public.pulls (user_id, serie, jeton, odds, variant, luck) values (uid, 'Takoras', nm, o, v, round(l, 2)) returning id into pid;
    ids := ids || pid; lucks := lucks || round(l, 2);
    res := res || nm; vars := vars || coalesce(v, '');
  end loop;
  update public.profiles set potions = pots where id = uid;
  -- les quêtes ne comptent que les nouveaux tirages (pas ceux qui ressortent après un remboursement)
  if nf > 0 then perform public._bump(uid, p_pulls => nf, p_rares => nr, p_variants => nv); end if;
  return json_build_object('results', res, 'variants', vars, 'lucks', lucks, 'ids', ids, 'state', public.eco_state());
end $function$
;

-- fonction : update_profile(p_avatar text, p_banner text, p_bio text, p_showcase bigint[])
CREATE OR REPLACE FUNCTION public.update_profile(p_avatar text, p_banner text, p_bio text, p_showcase bigint[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); r public.profiles;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  select * into r from public.profiles where id = uid;
  if p_avatar is distinct from r.avatar and not (coalesce(p_avatar, 'default') = any(array['default', 'bleu', 'rouge', 'vert', 'yeux', 'dunes']) or p_avatar = any(r.avatars)) then raise exception 'bad_avatar'; end if;
  if p_banner is not null and not p_banner = any(r.banners) then raise exception 'bad_banner'; end if;
  if char_length(coalesce(p_bio, '')) > 120 then raise exception 'bad_bio'; end if;
  if coalesce(array_length(p_showcase, 1), 0) > 5 then raise exception 'bad_showcase'; end if;
  if exists (select 1 from unnest(p_showcase) x where x is not null and not exists (select 1 from public.pulls p where p.id = x and p.user_id = uid and p.sold_at is null)) then raise exception 'bad_showcase'; end if;
  if (select count(x) - count(distinct x) from unnest(p_showcase) x) > 0 then raise exception 'bad_showcase'; end if;
  update public.profiles set avatar = coalesce(p_avatar, 'default'), banner = p_banner, bio = coalesce(p_bio, ''), showcase = p_showcase where id = uid;
end $function$
;

-- fonction : upgrade_regen()
CREATE OR REPLACE FUNCTION public.upgrade_regen()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; cost bigint;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  perform public._regen(auth.uid()); -- on compte d'abord ce qui a déjà rechargé à l'ancienne vitesse
  select * into r from public.profiles where id = auth.uid() for update;
  if r.regen_s <= 60 then raise exception 'max_reached'; end if;
  cost := public._regen_cost(r.regen_s - 10);
  if r.coins < cost then raise exception 'not_enough_coins'; end if;
  update public.profiles set coins = coins - cost, regen_s = regen_s - 10 where id = auth.uid();
  return public.eco_state();
end $function$
;

-- fonction : upgrade_stock()
CREATE OR REPLACE FUNCTION public.upgrade_stock()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.profiles; cost bigint;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  select * into r from public.profiles where id = auth.uid() for update;
  if r.stock_max >= 50 then raise exception 'max_reached'; end if;
  cost := public._upgrade_cost(r.stock_max + 1);
  if r.coins < cost then raise exception 'not_enough_coins'; end if;
  update public.profiles set coins = coins - cost, stock_max = stock_max + 1 where id = auth.uid();
  return public.eco_state();
end $function$
;

-- fonction : use_item(p_item text)
CREATE OR REPLACE FUNCTION public.use_item(p_item text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); it public.shop_items;
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  if not exists (select 1 from public.user_items where user_id = uid and item = p_item and qty > 0) then raise exception 'no_item'; end if;
  select * into it from public.shop_items where id = p_item;
  perform public._apply_item(uid, it);           -- lève une erreur si impossible (potion déjà active, stock plein…)
  update public.user_items set qty = qty - 1 where user_id = uid and item = p_item;
  return public.eco_state();
end $function$
;

-- fonction : use_items(p_item text, p_qty integer)
CREATE OR REPLACE FUNCTION public.use_items(p_item text, p_qty integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); it public.shop_items; have int; n int := 0; i int;
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban();
  select qty into have from public.user_items where user_id = uid and item = p_item for update;
  if coalesce(have, 0) < 1 then raise exception 'no_item'; end if;
  select * into it from public.shop_items where id = p_item;
  for i in 1..least(have, greatest(1, least(coalesce(p_qty, 1), 1000))) loop
    begin
      perform public._apply_item(uid, it);
    exception when others then
      if n = 0 then raise; end if; -- le premier échoue : on renvoie l'erreur (stock plein…)
      exit;                        -- sinon on garde ceux déjà utilisés
    end;
    n := n + 1;
  end loop;
  update public.user_items set qty = qty - n where user_id = uid and item = p_item;
  return json_build_object('used', n, 'state', public.eco_state());
end $function$
;

-- =====================================================================
-- 5. TRIGGERS
-- =====================================================================

-- (aucun trigger sur le schéma public)

-- =====================================================================
-- 6. RLS (activation par table)
-- =====================================================================

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jetons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patchnotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_pulls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redeems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_buys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_buys2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 7. POLICIES
-- =====================================================================

CREATE POLICY "annonces: lecture" ON public.announcements AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "combats: les miens" ON public.battles AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT auth.uid() AS uid) = p1) OR (( SELECT auth.uid() AS uid) = p2)));

CREATE POLICY "amis: les miens" ON public.friendships AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT auth.uid() AS uid) = a) OR (( SELECT auth.uid() AS uid) = b)));

CREATE POLICY "jetons: lecture" ON public.jetons AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "messages: les miens" ON public.messages AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT auth.uid() AS uid) = sender) OR (( SELECT auth.uid() AS uid) = receiver)));

CREATE POLICY "patchnotes: lecture" ON public.patchnotes AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "prix: lecture" ON public.price_changes AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "profil: lire le sien" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profil: modifier le sien" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "pulls: lire les siens" ON public.pulls AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "shop: lecture" ON public.shop_items AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "réglages: lecture" ON public.site_settings AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);

-- =====================================================================
-- 8. DROITS (tables, colonnes, fonctions) pour PUBLIC / anon / authenticated / service_role
-- =====================================================================

REVOKE ALL ON TABLE public.announcements FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcements TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcements TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcements TO service_role;
REVOKE ALL ON TABLE public.battles FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.battles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.battles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.battles TO service_role;
REVOKE ALL ON TABLE public.daily_stats FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.daily_stats TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.daily_stats TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.daily_stats TO service_role;
REVOKE ALL ON TABLE public.feedback FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.feedback TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.feedback TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.feedback TO service_role;
REVOKE ALL ON TABLE public.friendships FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.friendships TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.friendships TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.friendships TO service_role;
REVOKE ALL ON TABLE public.jetons FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.jetons TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.jetons TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.jetons TO service_role;
REVOKE ALL ON TABLE public.messages FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.messages TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.messages TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.messages TO service_role;
REVOKE ALL ON TABLE public.patchnotes FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.patchnotes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.patchnotes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.patchnotes TO service_role;
REVOKE ALL ON TABLE public.pending_pulls FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pending_pulls TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pending_pulls TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pending_pulls TO service_role;
REVOKE ALL ON TABLE public.price_changes FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.price_changes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.price_changes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.price_changes TO service_role;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.profiles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO service_role;
REVOKE ALL ON TABLE public.promo_codes FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.promo_codes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.promo_codes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.promo_codes TO service_role;
REVOKE ALL ON TABLE public.promo_redeems FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.promo_redeems TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.promo_redeems TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.promo_redeems TO service_role;
REVOKE ALL ON TABLE public.pulls FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pulls TO service_role;
GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pulls TO anon;
GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pulls TO authenticated;
REVOKE ALL ON TABLE public.quests FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.quests TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.quests TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.quests TO service_role;
REVOKE ALL ON TABLE public.shop_buys FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_buys TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_buys TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_buys TO service_role;
REVOKE ALL ON TABLE public.shop_buys2 FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_buys2 TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_buys2 TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_buys2 TO service_role;
REVOKE ALL ON TABLE public.shop_items FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_items TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_items TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_items TO service_role;
REVOKE ALL ON TABLE public.shop_overrides FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_overrides TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_overrides TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_overrides TO service_role;
REVOKE ALL ON TABLE public.shop_price_overrides FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_price_overrides TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_price_overrides TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_price_overrides TO service_role;
REVOKE ALL ON TABLE public.shop_settings FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_settings TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_settings TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shop_settings TO service_role;
REVOKE ALL ON TABLE public.site_settings FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_settings TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_settings TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_settings TO service_role;
REVOKE ALL ON TABLE public.token_levels FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.token_levels TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.token_levels TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.token_levels TO service_role;
REVOKE ALL ON TABLE public.user_items FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_items TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_items TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_items TO service_role;

GRANT UPDATE (pseudo) ON TABLE public.profiles TO authenticated;

REVOKE ALL ON FUNCTION public._add_item(uid uuid, p_item text, n integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._add_item(uid uuid, p_item text, n integer) TO service_role;
REVOKE ALL ON FUNCTION public._apply_item(uid uuid, it shop_items) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._apply_item(uid uuid, it shop_items) TO service_role;
REVOKE ALL ON FUNCTION public._beta_open() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._beta_open() TO service_role;
REVOKE ALL ON FUNCTION public._bump(uid uuid, p_pulls integer, p_rares integer, p_sold integer, p_bought integer, p_variants integer, p_battles integer, p_wins integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._bump(uid uuid, p_pulls integer, p_rares integer, p_sold integer, p_bought integer, p_variants integer, p_battles integer, p_wins integer) TO service_role;
REVOKE ALL ON FUNCTION public._check_ban() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._check_ban() TO service_role;
REVOKE ALL ON FUNCTION public._daily_amount(streak integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._daily_amount(streak integer) TO service_role;
REVOKE ALL ON FUNCTION public._draw(p_serie text, p_luck numeric) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._draw(p_serie text, p_luck numeric) TO service_role;
REVOKE ALL ON FUNCTION public._free_pseudo(raw text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._free_pseudo(raw text) TO service_role;
REVOKE ALL ON FUNCTION public._is_admin() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._is_admin() TO service_role;
REVOKE ALL ON FUNCTION public._is_tester() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._is_tester() TO service_role;
REVOKE ALL ON FUNCTION public._luck(pots jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._luck(pots jsonb) TO service_role;
REVOKE ALL ON FUNCTION public._period() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._period() TO service_role;
REVOKE ALL ON FUNCTION public._price(p_item text, per bigint) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._price(p_item text, per bigint) TO service_role;
REVOKE ALL ON FUNCTION public._regen(p uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._regen(p uuid) TO service_role;
REVOKE ALL ON FUNCTION public._regen_cost(target integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._regen_cost(target integer) TO service_role;
REVOKE ALL ON FUNCTION public._roll_variant() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._roll_variant() TO service_role;
REVOKE ALL ON FUNCTION public._sell_value(o integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._sell_value(o integer) TO service_role;
REVOKE ALL ON FUNCTION public._shop_ids(d date) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._shop_ids(d date) TO service_role;
REVOKE ALL ON FUNCTION public._stock(p_item text, per bigint) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._stock(p_item text, per bigint) TO service_role;
REVOKE ALL ON FUNCTION public._today() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._today() TO service_role;
REVOKE ALL ON FUNCTION public._upgrade_cost(target integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._upgrade_cost(target integer) TO service_role;
REVOKE ALL ON FUNCTION public._vmult(v text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._vmult(v text) TO service_role;
REVOKE ALL ON FUNCTION public._vodds(v text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._vodds(v text) TO service_role;
REVOKE ALL ON FUNCTION public.admin_announce(p_body text, p_fullscreen boolean, p_banner boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_announce(p_body text, p_fullscreen boolean, p_banner boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_ban(target uuid, p_ban boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_ban(target uuid, p_ban boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_clear_showcase(target uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_clear_showcase(target uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_code_delete(p_code text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_code_delete(p_code text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_code_save(p_code text, p_coins bigint, p_pulls integer, p_items jsonb, p_max integer, p_expires timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_code_save(p_code text, p_coins bigint, p_pulls integer, p_items jsonb, p_max integer, p_expires timestamp with time zone) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_code_toggle(p_code text, p_active boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_code_toggle(p_code text, p_active boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_codes() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_codes() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_delete_announcement(p_id bigint) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_announcement(p_id bigint) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_delete_message(p_id bigint) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_message(p_id bigint) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_feedback() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_feedback() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_feedback_set(p_id bigint, p_status text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_feedback_set(p_id bigint, p_status text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_give(target uuid, p_coins bigint, p_pulls integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_give(target uuid, p_coins bigint, p_pulls integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_give_item(target uuid, p_item text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_give_item(target uuid, p_item text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_give_jeton(target uuid, p_jeton text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_give_jeton(target uuid, p_jeton text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_inventory(target uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_inventory(target uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_lock_pulls(target uuid, ids bigint[], p_locked boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_lock_pulls(target uuid, ids bigint[], p_locked boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_messages(target uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_messages(target uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_patchnote_delete(p_id bigint) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_patchnote_delete(p_id bigint) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_patchnote_save(p_id bigint, p_title text, p_lines jsonb, p_title_en text, p_lines_en jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_patchnote_save(p_id bigint, p_title text, p_lines jsonb, p_title_en text, p_lines_en jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_player(target uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_player(target uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_players(q text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_players(q text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_remove_pulls(target uuid, ids bigint[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_pulls(target uuid, ids bigint[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_reset(target uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset(target uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_beta(p_on boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_beta(p_on boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_items(target uuid, p_item text, p_qty integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_items(target uuid, p_item text, p_qty integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_pseudo(target uuid, p text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_pseudo(target uuid, p text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_shop() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_shop() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_shop_reroll() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_shop_reroll() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_shop_set(p_item text, p_price integer, p_active boolean, p_stock integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_shop_set(p_item text, p_price integer, p_active boolean, p_stock integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.avatars_of(p text[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.avatars_of(p text[]) TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.battle_result(p_win uuid, p_lose uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.battle_result(p_win uuid, p_lose uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.beta_give(p_coins bigint, p_pulls integer, p_item text, p_qty integer, p_jeton text, p_variant text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.beta_give(p_coins bigint, p_pulls integer, p_item text, p_qty integer, p_jeton text, p_variant text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.beta_of(p text[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.beta_of(p text[]) TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.buy_item(p_item text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.buy_item(p_item text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.change_pseudo(p text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_pseudo(p text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_daily() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_daily() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_quest(p_id text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_quest(p_id text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.collection_of(p_pseudo text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collection_of(p_pseudo text) TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.eco_state() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.eco_state() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.friend_remove(p_other uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.friend_remove(p_other uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.friend_request(p_pseudo text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.friend_request(p_pseudo text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.friend_respond(p_other uuid, p_accept boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.friend_respond(p_other uuid, p_accept boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.friend_status(p_pseudo text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.friend_status(p_pseudo text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
REVOKE ALL ON FUNCTION public.leaderboard(kind text, since timestamp with time zone, n integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard(kind text, since timestamp with time zone, n integer) TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.level_up(p_jeton text, p_serie text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.level_up(p_jeton text, p_serie text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.live_feed(n integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_feed(n integer) TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.lock_pulls(ids bigint[], p_locked boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lock_pulls(ids bigint[], p_locked boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_read(p_other uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_read(p_other uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_collection() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_collection() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_conversation(p_other uuid, p_before bigint) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_conversation(p_other uuid, p_before bigint) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_daily() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_daily() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_deck() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_deck() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_friends() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_friends() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_inventory() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_inventory() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_inventory_groups() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_inventory_groups() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_items() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_items() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_levels() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_levels() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_quests() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_quests() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.profile_public(p_pseudo text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.profile_public(p_pseudo text) TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.pseudo_available(p text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pseudo_available(p text) TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.redeem_code(p_code text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_code(p_code text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.refund_pulls(ids bigint[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_pulls(ids bigint[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sell_pulls(ids bigint[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sell_pulls(ids bigint[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.send_feedback(p_kind text, p_body text, p_page text, p_device text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_feedback(p_kind text, p_body text, p_page text, p_device text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.send_message(p_to uuid, p_body text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_message(p_to uuid, p_body text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_deck(ids bigint[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_deck(ids bigint[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_pseudo(p text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_pseudo(p text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.shop_today() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shop_today() TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.take_pulls(n integer, force text, luck numeric, p_variant text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.take_pulls(n integer, force text, luck numeric, p_variant text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_profile(p_avatar text, p_banner text, p_bio text, p_showcase bigint[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_profile(p_avatar text, p_banner text, p_bio text, p_showcase bigint[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.upgrade_regen() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upgrade_regen() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.upgrade_stock() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upgrade_stock() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.use_item(p_item text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.use_item(p_item text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.use_items(p_item text, p_qty integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.use_items(p_item text, p_qty integer) TO authenticated, service_role;

-- =====================================================================
-- 9. REALTIME (publication supabase_realtime)
-- =====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_changes;

-- =====================================================================
-- 10. CRON
-- =====================================================================

-- pg_cron n'est pas installé : aucune tâche planifiée.
