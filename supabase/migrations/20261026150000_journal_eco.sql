-- Journal des mouvements de pièces et de pulls (sécurité : repérer une duplication ou un abus après coup).
-- Une ligne à chaque changement de pièces / stock d'un joueur, écrite par la base elle-même (personne ne peut la lire ni l'écrire).
create table if not exists public.eco_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  d_coins bigint not null default 0,
  d_stock integer not null default 0,
  coins bigint not null,
  stock integer not null,
  at timestamptz not null default now()
);
create index if not exists eco_log_user_at on public.eco_log (user_id, at desc);
alter table public.eco_log enable row level security;
revoke all on table public.eco_log from public, anon, authenticated;

create or replace function public._eco_log()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.coins is distinct from old.coins or new.stock is distinct from old.stock then
    insert into public.eco_log (user_id, d_coins, d_stock, coins, stock)
      values (new.id, new.coins - old.coins, new.stock - old.stock, new.coins, new.stock);
  end if;
  return null;
end $$;
revoke all on function public._eco_log() from public, anon, authenticated;
drop trigger if exists eco_log on public.profiles;
create trigger eco_log after update of coins, stock on public.profiles for each row execute function public._eco_log();
