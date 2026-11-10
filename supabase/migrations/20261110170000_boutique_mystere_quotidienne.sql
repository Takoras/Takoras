-- Boutique mystère, renouvelée chaque jour à minuit (heure de Paris). Appliquée en prod le 10 nov. 2026
-- (migrations boutique_mystere_quotidienne + boutique_mystere_gain) : état final des fonctions.
-- Chaque objet en stock est caché dans une case ; la révéler rapporte 100 pièces (une fois par jour et par objet).
-- Le serveur ne dit rien de ce qu'il y a derrière une case tant qu'elle n'est pas révélée ; on n'achète que ce qu'on a
-- révélé ; l'objet à la une est caché aussi (sa réduction se voit). Stocks plus gros sur les potions courantes.

create or replace function public._period()
returns bigint language sql stable set search_path to ''
as $$ select (public._today() - date '1970-01-01')::bigint $$;

create or replace function public._shop_reset_in()
returns int language sql stable set search_path to ''
as $$ select greatest(0, extract(epoch from (((public._today() + 1)::timestamp at time zone 'Europe/Paris') - now())))::int $$;

create or replace function public._stock(p_item text, per bigint)
returns integer language plpgsql stable set search_path to ''
as $$
declare r numeric; ov int; seed text := coalesce((select v from public.shop_settings where k = 'seed'), '0');
begin
  select stock into ov from public.shop_overrides where item = p_item and period = per;
  if ov is not null then return ov; end if;
  r := ('x' || substr(md5(p_item || ':' || per || ':' || seed), 1, 8))::bit(32)::bigint / 4294967296.0;
  return case p_item
    when 'potion1' then 13 + floor(r * 6)
    when 'potion2' then 8 + floor(r * 5)
    when 'potion3' then 4 + floor(r * 4)
    when 'potion10' then case when r < .45 then 1 + floor(r * 4.4) else 0 end
    when 'potion25' then case when r < .22 then 1 else 0 end
    when 'potion50' then case when r < .10 then 1 else 0 end
    when 'potion100' then case when r < .04 then 1 else 0 end
    when 'potion250' then case when r < .015 then 1 else 0 end
    when 'potion500' then case when r < .006 then 1 else 0 end
    when 'instant' then 3 + floor(r * 3)
    when 'hourglass' then 3 + floor(r * 3)
    else 1 end;
end $$;

create table if not exists public.shop_reveals (
  user_id uuid not null references auth.users (id) on delete cascade,
  period bigint not null,
  item text not null,
  at timestamptz not null default now(),
  primary key (user_id, period, item)
);
alter table public.shop_reveals enable row level security;

create or replace function public._shop_slots(p_uid uuid, per bigint)
returns text[] language sql stable security definer set search_path to ''
as $$
  select coalesce(array_agg(s.id order by md5(coalesce(p_uid::text, 'anon') || ':' || per || ':' || s.id)), '{}')
  from public.shop_items s where s.active and public._stock(s.id, per) > 0;
$$;

create or replace function public._revealed(p_uid uuid, per bigint, p_item text)
returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (select 1 from public.shop_reveals r where r.user_id = p_uid and r.period = per and r.item = p_item);
$$;

create or replace function public.shop_today()
returns json language sql stable security definer set search_path to ''
as $$
  with per as (select public._period() p), me as (select auth.uid() u),
       feat as (select f.item, f.pct from public._featured((select p from per)) f),
       slots as (select x.id, x.n from unnest(public._shop_slots((select u from me), (select p from per))) with ordinality as x(id, n))
  select json_build_object(
    'reset_in', public._shop_reset_in(),
    'reveal_gain', 100,
    'featured_slot', (select sl.n from slots sl join feat on feat.item = sl.id),
    'featured', (select feat.item from feat where public._revealed((select u from me), (select p from per), feat.item)),
    'off', (select feat.pct from feat),
    'items', coalesce((
      select json_agg(
        case when public._revealed((select u from me), (select p from per), s.id) then
          json_build_object('slot', sl.n, 'id', s.id, 'kind', s.kind, 'price', public._price(s.id, (select p from per)), 'base_price', s.price, 'data', s.data,
            'stock', public._stock(s.id, (select p from per)),
            'bought', coalesce((select b.qty from public.shop_buys2 b where b.user_id = (select u from me) and b.period = (select p from per) and b.item = s.id), 0),
            'owned', (s.kind = 'banner' and exists (select 1 from public.profiles pr where pr.id = (select u from me) and substr(s.id, 3) = any(pr.banners)))
                  or (s.kind = 'avatar' and exists (select 1 from public.profiles pr where pr.id = (select u from me) and substr(s.id, 3) = any(pr.avatars))))
        else
          json_build_object('slot', sl.n, 'hidden', true,
            'group', case when s.kind = 'potion' then 'potion' when s.kind in ('banner', 'avatar') then 'banner' else 'util' end)
        end order by sl.n)
      from slots sl join public.shop_items s on s.id = sl.id), '[]'::json));
$$;

create or replace function public.reveal_slot(p_slot int)
returns json language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid(); per bigint := public._period(); it text; got int := 0;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban(); perform public._rate('reveal_slot', 40);
  it := (public._shop_slots(uid, per))[p_slot];
  if it is null then raise exception 'not_in_shop'; end if;
  insert into public.shop_reveals (user_id, period, item) values (uid, per, it) on conflict do nothing;
  if found then
    update public.profiles set coins = coins + 100 where id = uid; -- la révélation rapporte 100 pièces
    got := 100;
  end if;
  return json_build_object('gain', got, 'item', it, 'state', public.eco_state(), 'shop', public.shop_today());
end $$;
grant execute on function public.reveal_slot(int) to authenticated;

create or replace function public.buy_item(p_item text)
returns json language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid(); it public.shop_items; r public.profiles; q int; per bigint := public._period(); pr int;
begin
  if uid is null then raise exception 'not_logged_in'; end if; perform public._check_ban(); perform public._rate('buy_item', 30);
  select * into it from public.shop_items where id = p_item and active;
  if not found then raise exception 'not_in_shop'; end if;
  if not public._revealed(uid, per, p_item) then raise exception 'not_revealed'; end if;
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
end $$;

create or replace function public.admin_shop_reroll()
returns void language plpgsql security definer set search_path to ''
as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.shop_settings set v = (v::int + 1)::text where k = 'seed';
  delete from public.shop_overrides where period = public._period();
  delete from public.shop_price_overrides where period = public._period();
  delete from public.shop_buys2 where period = public._period();
  delete from public.shop_reveals where period = public._period();
end $$;
