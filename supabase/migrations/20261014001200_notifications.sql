-- Kulcs · 0020 · Alkalmazáson belüli értesítések
-- 1) a felhasználó a saját értesítésén csak az olvasottság időpontját írhatja (a tartalom nem hamisítható);
-- 2) értesítést csak adatbázis-függvény hoz létre (nincs beszúrási policy), kizárólag aktív tagnak, a szervezetén belül;
-- 3) a kiváltók: lead kiosztása, feladat kiosztása másnak, bemutató kiosztása másnak, nyilvános oldalról érkezett lead;
-- 4) a tábla a realtime kiadványba kerül (az olvasási policy a realtime-ra is érvényes).

-- ---------------------------------------------------------------------------
-- 1) Jogosultság és megszorítások
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

alter table public.notifications
  add constraint notifications_type_check check (type in ('lead', 'deadline', 'showing', 'lead_assigned', 'task_assigned', 'showing_assigned', 'public_inquiry')),
  add constraint notifications_title_len check (char_length(title) between 1 and 200),
  add constraint notifications_body_len check (body is null or char_length(body) <= 500),
  -- csak alkalmazáson belüli útvonal (nyílt átirányítás ellen)
  add constraint notifications_link_internal check (link is null or (link like '/%' and link not like '//%' and link not like '/\%'));

create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

-- ---------------------------------------------------------------------------
-- 2) Létrehozás (csak belső használatra)
-- ---------------------------------------------------------------------------
create or replace function app.notify(p_org uuid, p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user is not distinct from (select auth.uid()) then
    return;                                       -- magunknak nem szólunk
  end if;
  if not exists (
    select 1 from public.memberships m
    where m.organization_id = p_org and m.user_id = p_user and m.status = 'active'
  ) then
    return;
  end if;
  insert into public.notifications (organization_id, user_id, type, title, body, link)
  values (p_org, p_user, p_type, left(p_title, 200), left(p_body, 500), p_link);
end;
$$;
revoke all on function app.notify(uuid, uuid, text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Kiváltók (mind after, hiba esetén sem akadályozzák az eredeti műveletet)
-- ---------------------------------------------------------------------------
create or replace function app.notify_lead_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_to is not null and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform app.notify(
      new.organization_id, new.assigned_to,
      case when new.source = 'public_page' then 'public_inquiry' else 'lead_assigned' end,
      case when new.source = 'public_page' then 'Új érdeklődő a nyilvános oldalról' else 'Új lead lett hozzád rendelve' end,
      new.full_name,
      '/leadek'
    );
  end if;
  return null;
exception when others then
  raise warning 'Lead-értesítés nem jött létre: %', sqlerrm;
  return null;
end;
$$;
create trigger leads_notify after insert or update of assigned_to on public.leads
  for each row execute function app.notify_lead_assigned();

create or replace function app.notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- az ismétlődő feladat következő példánya (belső beszúrás) nem értesít
  if pg_trigger_depth() > 1 or new.status <> 'open' or new.assignee_id is null then
    return null;
  end if;
  if tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id then
    perform app.notify(new.organization_id, new.assignee_id, 'task_assigned', 'Új feladatot kaptál', new.title, '/feladatok');
  end if;
  return null;
exception when others then
  raise warning 'Feladat-értesítés nem jött létre: %', sqlerrm;
  return null;
end;
$$;
create trigger tasks_notify after insert or update of assignee_id on public.tasks
  for each row execute function app.notify_task_assigned();

create or replace function app.notify_showing_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.agent_id is not null and new.status = 'scheduled'
     and (tg_op = 'INSERT' or new.agent_id is distinct from old.agent_id) then
    perform app.notify(
      new.organization_id, new.agent_id, 'showing_assigned', 'Új bemutatót kaptál',
      to_char(new.starts_at at time zone 'Europe/Budapest', 'YYYY. MM. DD. HH24:MI'),
      '/naptar/' || new.id::text
    );
  end if;
  return null;
exception when others then
  raise warning 'Bemutató-értesítés nem jött létre: %', sqlerrm;
  return null;
end;
$$;
create trigger showings_notify after insert or update of agent_id on public.showings
  for each row execute function app.notify_showing_assigned();

-- ---------------------------------------------------------------------------
-- 4) Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
