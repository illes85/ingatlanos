-- Kulcs · 0021 · Értesítések szigorítása (biztonsági átnézés nyomán)
-- 1) a belső link ellenőrzése valóban kizárja a //, /\ és a vezérlőkarakteres (tab, sortörés) alakokat;
-- 2) címzettenként percenkénti korlát az értesítés-áradat ellen;
-- 3) az olvasás és az olvasottra állítás aktív tagságot kér (kilépett tag a régi értesítéseket sem látja);
-- 4) a felesleges jogok (TRUNCATE, REFERENCES, TRIGGER) visszavonva.

alter table public.notifications drop constraint notifications_link_internal;
alter table public.notifications
  add constraint notifications_link_internal check (link is null or link ~ '^/(?![/\\])[A-Za-z0-9/_?=&.%#-]*$');

create or replace function app.notify(p_org uuid, p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user is not distinct from (select auth.uid()) then
    return;
  end if;
  if not exists (
    select 1 from public.memberships m
    where m.organization_id = p_org and m.user_id = p_user and m.status = 'active'
  ) then
    return;
  end if;
  -- Áradat ellen: egy címzettnek percenként legfeljebb 20 új értesítés.
  if (select count(*) from public.notifications n
       where n.user_id = p_user and n.created_at > now() - interval '1 minute') >= 20 then
    return;
  end if;
  insert into public.notifications (organization_id, user_id, type, title, body, link)
  values (p_org, p_user, p_type, left(p_title, 200), left(p_body, 500), p_link);
end;
$$;
revoke all on function app.notify(uuid, uuid, text, text, text, text) from public, anon, authenticated;

drop policy "értesítés: saját" on public.notifications;
create policy "értesítés: saját" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()) and app.is_member(organization_id));

drop policy "értesítés: olvasottra állítás" on public.notifications;
create policy "értesítés: olvasottra állítás" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()) and app.is_member(organization_id))
  with check (user_id = (select auth.uid()) and app.is_member(organization_id));

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
