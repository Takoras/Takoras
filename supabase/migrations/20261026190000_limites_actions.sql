-- Limites d'actions par minute (anti-spam / anti-bot), côté serveur.
-- Au-delà : erreur « slow_down » (le site affiche « Doucement… »). Les doubles crédits sont déjà impossibles :
-- chaque fonction qui donne quelque chose verrouille la ligne du joueur (FOR UPDATE) ou une clé unique.
create table if not exists public.rate_hits (
  user_id uuid not null,
  k text not null,
  at timestamptz not null default now()
);
create index if not exists rate_hits_user_k_at on public.rate_hits (user_id, k, at);
alter table public.rate_hits enable row level security;
revoke all on table public.rate_hits from public, anon, authenticated;

create or replace function public._rate(p_k text, p_n integer, p_secs integer default 60)
returns void language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); c int;
begin
  if uid is null then return; end if;
  delete from public.rate_hits where user_id = uid and at < now() - interval '10 minutes';
  select count(*) into c from public.rate_hits where user_id = uid and k = p_k and at > now() - make_interval(secs => p_secs);
  if c >= p_n then raise exception 'slow_down'; end if;
  insert into public.rate_hits (user_id, k) values (uid, p_k);
end $$;
revoke all on function public._rate(text, integer, integer) from public, anon, authenticated;

-- Ajout de la limite au début des fonctions sensibles (juste après le contrôle de bannissement)
do $$
declare r record; def text;
begin
  for r in select * from (values
    ('take_pulls', 40), ('buy_item', 30), ('claim_daily', 10), ('claim_quest', 20), ('claim_weekly', 20), ('bp_claim', 40),
    ('sell_pulls', 30), ('use_items', 30), ('use_item', 30), ('level_up', 40), ('redeem_code', 10), ('refund_pulls', 20),
    ('upgrade_regen', 20), ('upgrade_stock', 20)) v(fn, n)
  loop
    select pg_get_functiondef(p.oid) into def from pg_proc p where p.proname = r.fn and p.pronamespace = 'public'::regnamespace limit 1;
    if def is null or position('public._rate(' in def) > 0 then continue; end if;
    if position('perform public._check_ban();' in def) = 0 then continue; end if;
    execute regexp_replace(def, 'perform public\._check_ban\(\);', format('perform public._check_ban(); perform public._rate(%L, %s);', r.fn, r.n));
  end loop;
end $$;
