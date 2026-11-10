-- Modération (DSA art. 14 et 16) : filtre des mots choquants sur le pseudo et la bio (vérifié ici, côté serveur),
-- et signalement d'un joueur (pseudo, bio, profil, triche) avec une vue admin.

-- ---------- Filtre : vrai si le texte contient un mot choquant (sexuel, violent, insulte, haine), en FR ou en EN.
-- Le texte est normalisé : minuscules, sans accents, chiffres « l33t » remplacés (0→o 1→i 3→e 4→a 5→s 7→t 8→b @→a $→s),
-- séparateurs retirés (« s.a.l.o.p.e »), lettres répétées réduites (« saaalope »). Les mots courts ou ambigus ne sont
-- cherchés que comme mots entiers ; quelques mots innocents qui en contiennent un autre (député, dispute…) sont ignorés.
create or replace function public._offensive(t text)
returns boolean language plpgsql immutable set search_path to '' as $function$
declare
  n text; raw text; col text; w text; wc text; tok text;
  allow text[] := array['depute', 'dispute', 'computer', 'reput', 'amput', 'imput', 'scunthorpe', 'cocktail', 'peacock', 'hancock', 'shitake', 'therapist', 'niger'];
  subs text[] := array[
    -- FR
    'connard', 'connasse', 'conasse', 'salope', 'salaud', 'encule', 'batard', 'putain', 'pute', 'filsdepute', 'couille',
    'branleur', 'branlette', 'sucemoi', 'suceuse', 'trouduc', 'niquetamere', 'niquetonpere', 'nikta', 'pedophil', 'zoophil',
    'inceste', 'violeur', 'violer', 'negre', 'bougnoul', 'youpin', 'sodomi', 'partouze', 'masturb', 'ejacul',
    -- EN
    'fuck', 'motherfuck', 'shit', 'bitch', 'whore', 'slut', 'pussy', 'asshole', 'cunt', 'faggot', 'nigger', 'nigga',
    'porn', 'hentai', 'xxx', 'dickhead', 'rapist', 'raping', 'blowjob', 'handjob', 'dildo', 'killyourself', 'retarded',
    -- haine, violence
    'nazi', 'hitler', 'siegheil', 'heilhitler', 'whitepower', 'kukluxklan', 'daesh', 'daech', 'jihad', 'terroris',
    'genocid', 'suicide'
  ];
  words text[] := array[
    'con', 'cons', 'pd', 'pede', 'pedes', 'fdp', 'ntm', 'bite', 'bites', 'cul', 'foutre', 'viol', 'fck', 'fuk', 'cum',
    'cock', 'dick', 'tits', 'rape', 'sex', 'sexe', 'nude', 'nudes', 'nsfw', 'kys', 'retard', 'fag', 'fags', 'hoe',
    'pedo', 'negro', 'kkk', 'isis', 'nazis', 'heil', 'porno', 'boobs', 'anal'
  ];
begin
  if t is null or btrim(t) = '' then return false; end if;
  if lower(t) ~ '1488' then return true; end if;
  n := translate(lower(t), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa');
  n := translate(n, '0134578@$!|', 'oieastbasii');
  raw := regexp_replace(n, '[^a-z]', '', 'g');
  foreach w in array allow loop raw := replace(raw, w, ''); end loop;
  col := regexp_replace(raw, '(.)\1+', '\1', 'g');
  foreach w in array subs loop
    if position(w in raw) > 0 then return true; end if;
    wc := regexp_replace(w, '(.)\1+', '\1', 'g');
    if char_length(wc) >= 4 and position(wc in col) > 0 then return true; end if;
  end loop;
  foreach tok in array regexp_split_to_array(btrim(regexp_replace(n, '[^a-z]+', ' ', 'g')), ' ') loop
    if tok = any(words) or regexp_replace(tok, '(.)\1+', '\1', 'g') = any(words) then return true; end if;
  end loop;
  return false;
end $function$;
revoke all on function public._offensive(text) from public, anon, authenticated;

-- ---------- Pseudo et bio : refusés s'ils sont choquants (erreur « offensive »)
create or replace function public.set_pseudo(p text)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  if p !~ '^[A-Za-z0-9_\-\.]{3,16}$' then raise exception 'bad_pseudo'; end if;
  if public._offensive(p) then raise exception 'offensive'; end if;
  if exists (select 1 from public.profiles where lower(pseudo) = lower(p)) then raise exception 'pseudo_taken'; end if;
  update public.profiles set pseudo = p where id = auth.uid() and pseudo is null;
  if not found then raise exception 'pseudo_already_set'; end if;
end $function$;

create or replace function public.change_pseudo(p text)
returns void language plpgsql security definer set search_path to '' as $function$
declare r public.profiles;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban();
  p := trim(p);
  if p !~ '^[A-Za-z0-9_\-\.]{3,16}$' then raise exception 'bad_pseudo'; end if;
  if public._offensive(p) then raise exception 'offensive'; end if;
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
end $function$;

-- pseudo proposé à partir du nom Discord : rien si le nom est choquant (le joueur choisit lui-même)
create or replace function public._free_pseudo(raw text)
returns text language plpgsql stable security definer set search_path to '' as $function$
declare b text := left(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9_\-\.]', '', 'g'), 16); c text; i int := 0;
begin
  if char_length(b) < 3 or public._offensive(b) then return null; end if;
  c := b;
  while exists (select 1 from public.profiles where lower(pseudo) = lower(c)) loop
    i := i + 1;
    if i > 50 then return null; end if;
    c := left(b, 16 - char_length(i::text)) || i;
  end loop;
  return c;
end $function$;

create or replace function public.update_profile(p_avatar text, p_banner text, p_bio text, p_showcase bigint[])
returns void language plpgsql security definer set search_path to '' as $function$
declare uid uuid := auth.uid(); r public.profiles; jn text; jv text;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  select * into r from public.profiles where id = uid;
  if p_avatar like 'j:%' then
    jn := split_part(p_avatar, ':', 2); jv := nullif(split_part(p_avatar, ':', 3), '');
    if not exists (select 1 from public.pulls p where p.user_id = uid and p.jeton = jn and coalesce(p.variant, '') = coalesce(jv, '')) then
      raise exception 'bad_avatar';
    end if;
  elsif p_avatar is distinct from r.avatar and not (coalesce(p_avatar, 'default') = any(array['default', 'bleu', 'rouge', 'vert', 'yeux', 'dunes']) or p_avatar = any(r.avatars)) then
    raise exception 'bad_avatar';
  end if;
  if p_banner is not null and not p_banner = any(r.banners) then raise exception 'bad_banner'; end if;
  if char_length(coalesce(p_bio, '')) > 120 then raise exception 'bad_bio'; end if;
  if coalesce(p_bio, '') is distinct from coalesce(r.bio, '') and public._offensive(p_bio) then raise exception 'offensive'; end if;
  if coalesce(array_length(p_showcase, 1), 0) > 5 then raise exception 'bad_showcase'; end if;
  if exists (select 1 from unnest(p_showcase) x where x is not null and not exists (select 1 from public.pulls p where p.id = x and p.user_id = uid and p.sold_at is null)) then raise exception 'bad_showcase'; end if;
  if (select count(x) - count(distinct x) from unnest(p_showcase) x) > 0 then raise exception 'bad_showcase'; end if;
  update public.profiles set avatar = coalesce(p_avatar, 'default'), banner = p_banner, bio = coalesce(p_bio, ''), showcase = p_showcase where id = uid;
end $function$;

-- ---------- Signalements
create table if not exists public.reports (
  id bigserial primary key,
  reporter uuid references public.profiles (id) on delete set null,
  target uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('pseudo', 'bio', 'profile', 'cheat', 'other')),
  detail text not null default '',
  target_pseudo text,
  target_bio text,
  status text not null default 'new' check (status in ('new', 'done', 'dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

-- Signaler un joueur (par son pseudo). 5 signalements par 10 minutes ; un seul signalement ouvert par joueur visé.
create or replace function public.report_player(p_pseudo text, p_reason text, p_detail text)
returns void language plpgsql security definer set search_path to '' as $function$
declare uid uuid := auth.uid(); tg public.profiles;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._check_ban();
  if p_reason not in ('pseudo', 'bio', 'profile', 'cheat', 'other') then raise exception 'bad_reason'; end if;
  select * into tg from public.profiles where lower(pseudo) = lower(p_pseudo);
  if not found then raise exception 'not_found'; end if;
  if tg.id = uid then raise exception 'self_report'; end if;
  perform public._rate('report', 5, 600);
  if exists (select 1 from public.reports where reporter = uid and target = tg.id and status = 'new') then return; end if;
  insert into public.reports (reporter, target, reason, detail, target_pseudo, target_bio)
  values (uid, tg.id, p_reason, left(trim(coalesce(p_detail, '')), 300), tg.pseudo, tg.bio);
end $function$;
revoke all on function public.report_player(text, text, text) from public, anon;
grant execute on function public.report_player(text, text, text) to authenticated;

-- Admin : la liste (avec le pseudo et la bio ACTUELS du joueur visé), le statut, et vider une bio
create or replace function public.admin_reports()
returns json language sql stable security definer set search_path to '' as $function$
  select case when public._is_admin() then coalesce(json_agg(row_to_json(f) order by f.created_at desc), '[]') end
  from (
    select r.id, r.reason, r.detail, r.status, r.created_at, r.target, r.target_pseudo, r.target_bio,
      t.pseudo as pseudo_now, t.bio as bio_now, t.banned, rp.pseudo as reporter_pseudo,
      (select count(*) from public.reports x where x.target = r.target) as total
    from public.reports r
    join public.profiles t on t.id = r.target
    left join public.profiles rp on rp.id = r.reporter
    order by r.created_at desc limit 300
  ) f;
$function$;
create or replace function public.admin_report_set(p_id bigint, p_status text)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  if p_status = 'delete' then delete from public.reports where id = p_id;
  elsif p_status in ('new', 'done', 'dismissed') then update public.reports set status = p_status where id = p_id;
  else raise exception 'bad_status'; end if;
end $function$;
create or replace function public.admin_clear_bio(target uuid)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set bio = '' where id = target;
end $function$;
revoke all on function public.admin_reports() from public, anon;
revoke all on function public.admin_report_set(bigint, text) from public, anon;
revoke all on function public.admin_clear_bio(uuid) from public, anon;
grant execute on function public.admin_reports() to authenticated;
grant execute on function public.admin_report_set(bigint, text) to authenticated;
grant execute on function public.admin_clear_bio(uuid) to authenticated;

-- ---------- Export RGPD : on y ajoute les signalements que le joueur a faits
create or replace function public.export_my_data()
returns json language plpgsql security definer set search_path to '' as $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public._rate('export_my_data', 5);
  return json_build_object(
    'exported_at', now(),
    'account', (select json_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
                  'providers', u.raw_app_meta_data->'providers') from auth.users u where u.id = uid),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'pulls', (select coalesce(json_agg(to_jsonb(x) order by x.id), '[]') from public.pulls x where x.user_id = uid),
    'items', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.user_items x where x.user_id = uid),
    'token_levels', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.token_levels x where x.user_id = uid),
    'friends', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.friendships x where x.a = uid or x.b = uid),
    'messages', (select coalesce(json_agg(to_jsonb(x) order by x.id), '[]') from public.messages x where x.sender = uid or x.receiver = uid),
    'battle_pass', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.battle_pass x where x.user_id = uid),
    'ranked', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.ranked x where x.user_id = uid),
    'ranked_matches', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.ranked_matches x where x.p1 = uid or x.p2 = uid),
    'battles', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.battles x where x.p1 = uid or x.p2 = uid),
    'daily_stats', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.daily_stats x where x.user_id = uid),
    'shop_buys', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.shop_buys2 x where x.user_id = uid),
    'promo_codes_used', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.promo_redeems x where x.user_id = uid),
    'feedback', (select coalesce(json_agg(to_jsonb(x)), '[]') from public.feedback x where x.user_id = uid),
    'reports_made', (select coalesce(json_agg(json_build_object('reason', x.reason, 'detail', x.detail, 'status', x.status, 'created_at', x.created_at)), '[]') from public.reports x where x.reporter = uid)
  );
end $function$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
