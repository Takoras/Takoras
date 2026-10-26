-- Crédits (musiques, sons, polices, art) avec leur licence : rien n'est intégré sans licence vérifiée.
-- Lisible par tout le monde (page Crédits), écrit seulement par l'admin (depuis Supabase).
create table if not exists public.credits (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('music', 'sfx', 'font', 'art')),
  title text not null,
  file text,
  author text not null,
  source text not null,
  license text not null,
  url text,
  used_for text,
  added_at timestamptz not null default now()
);
alter table public.credits enable row level security;
revoke all on table public.credits from public, anon, authenticated;
grant select on table public.credits to anon, authenticated;
drop policy if exists credits_read on public.credits;
create policy credits_read on public.credits for select to anon, authenticated using (true);
insert into public.credits (kind, title, author, source, license, url, used_for)
select 'font', 'Outfit', 'Rodrigo Fuenzalida', 'Google Fonts', 'SIL Open Font License 1.1', 'https://fonts.google.com/specimen/Outfit', 'Toute l’interface'
where not exists (select 1 from public.credits where title = 'Outfit');
