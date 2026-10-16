-- Kulcs · 0023 · 1. fázis záró biztonsági szigorítás (teljes átnézés nyomán)
--  1) a szervezet csomagját, kreditjét, próbaidejét az owner sem írhatja (csak név, márkaszín, logó, beállítások);
--  2) tagot nem lehet beleegyezés nélkül felvenni: az owner csak meghívást ('invited') hozhat létre, az aktiválás
--     a meghívott saját hívása (accept_invitation); az utolsó owner nem távolítható el és nem fokozható le;
--  3) a kollégák havi jutalékcélja nem olvasható (oszlopszintű jog), a sajátot függvény adja;
--  4) dokumentum: hivatkozások ellenőrzése, a fájl útvonala a sor azonosítójához kötött;
--  5) ingatlan felvételekor a nyilvános mezők nem állíthatók, nem owner csak magát jelölheti felelősnek;
--  6) ajánlat az ügylet saját ingatlanára szólhat; naptáresemény védelme; ismétlődő feladat nem sokszorozható;
--  7) az audit-naplóba kliens nem írhat; a lead eredete és hozzájárulása nem hamisítható;
--  8) névtelen szerepkör csak a két nyilvános függvényt hívhatja.

-- ---------------------------------------------------------------------------
-- 1) Szervezet: oszlopszintű írás
-- ---------------------------------------------------------------------------
revoke update on public.organizations from authenticated, anon;
grant update (name, brand_color, logo_path, settings) on public.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Tagságok
-- ---------------------------------------------------------------------------
drop policy "tagság: szervezeten belül látható" on public.memberships;
drop policy "tagság: tulajdonos kezeli" on public.memberships;

create policy "tagság: látható" on public.memberships
  for select to authenticated
  using (app.is_member(organization_id) or user_id = (select auth.uid()));   -- a meghívott a saját meghívását látja
create policy "tagság: owner meghív" on public.memberships
  for insert to authenticated
  with check (app.has_role(organization_id, '{owner}') and status = 'invited');
create policy "tagság: owner módosít" on public.memberships
  for update to authenticated
  using (app.has_role(organization_id, '{owner}')) with check (app.has_role(organization_id, '{owner}'));
create policy "tagság: owner töröl" on public.memberships
  for delete to authenticated
  using (app.has_role(organization_id, '{owner}'));

create or replace function app.memberships_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid := coalesce(new.organization_id, old.organization_id);
  v_other_owner boolean;
begin
  if v_uid is null then
    return coalesce(new, old);                     -- rendszerművelet (seed, service role)
  end if;

  if tg_op = 'INSERT' then
    -- A szervezet létrehozója az első (owner) tag; mindenki más csak meghívással kerülhet be.
    if not exists (select 1 from public.memberships m where m.organization_id = new.organization_id)
       and new.user_id = v_uid and new.role = 'owner' then
      return new;
    end if;
    if new.status <> 'invited' then
      raise exception 'Tagot csak meghívással lehet felvenni' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id or new.user_id is distinct from old.user_id then
      raise exception 'A tagság szervezete és felhasználója nem módosítható' using errcode = '42501';
    end if;
    -- Meghívást csak maga a meghívott fogadhat el (accept_invitation).
    if old.status = 'invited' and new.status = 'active' and new.user_id <> v_uid then
      raise exception 'A meghívást a meghívott fogadhatja el' using errcode = '42501';
    end if;
  end if;

  -- Az utolsó aktív owner nem távolítható el és nem fokozható le.
  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    select exists (
      select 1 from public.memberships m
      where m.organization_id = v_org and m.role = 'owner' and m.status = 'active' and m.id <> old.id
    ) into v_other_owner;
    if not v_other_owner then
      raise exception 'A szervezetnek mindig kell legalább egy aktív irodavezetője' using errcode = '23514';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;
create trigger memberships_guard before insert or update or delete on public.memberships
  for each row execute function app.memberships_guard();

-- A meghívott maga fogadja el a meghívást (az owner nem aktiválhat helyette).
create or replace function public.accept_invitation(p_org uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  update public.memberships set status = 'active'
   where organization_id = p_org and user_id = v_uid and status = 'invited';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Profil: a kollégák jutalékcélja nem olvasható
-- ---------------------------------------------------------------------------
revoke select on public.profiles from authenticated, anon;
grant select (id, full_name, email, phone, avatar_path, license_number, active_organization_id, created_at, updated_at)
  on public.profiles to authenticated;

create or replace function public.my_commission_goal()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select p.monthly_commission_goal from public.profiles p where p.id = (select auth.uid());
$$;
revoke all on function public.my_commission_goal() from public, anon;
grant execute on function public.my_commission_goal() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Dokumentum
-- ---------------------------------------------------------------------------
alter table public.documents
  add constraint documents_path_bound check (
    storage_path is null or storage_path like organization_id::text || '/' || id::text || '/%'
  );
create unique index documents_storage_path_key on public.documents (storage_path) where storage_path is not null;

-- Invoker jogú: a hivatkozott sorokat a hívó RLS-ével keresi (csak látható rekordra hivatkozhat).
create or replace function app.documents_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'A dokumentum szervezete nem módosítható' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := v_uid;
  elsif new.created_by is distinct from old.created_by then
    raise exception 'A dokumentum létrehozója nem módosítható' using errcode = '42501';
  end if;
  if new.property_id is not null and not exists (
       select 1 from public.properties p where p.id = new.property_id and p.organization_id = new.organization_id) then
    raise exception 'Az ingatlan nem érhető el' using errcode = '42501';
  end if;
  if new.contact_id is not null and not exists (
       select 1 from public.contacts c where c.id = new.contact_id and c.organization_id = new.organization_id) then
    raise exception 'Az ügyfél nem érhető el' using errcode = '42501';
  end if;
  if new.deal_id is not null and not exists (
       select 1 from public.deals d where d.id = new.deal_id and d.organization_id = new.organization_id) then
    raise exception 'Az ügylet nem érhető el' using errcode = '42501';
  end if;
  if new.template_id is not null and not exists (
       select 1 from public.document_templates t
       where t.id = new.template_id and (t.organization_id is null or t.organization_id = new.organization_id)) then
    raise exception 'A sablon nem érhető el' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger documents_guard before insert or update on public.documents
  for each row execute function app.documents_guard();

-- ---------------------------------------------------------------------------
-- 5) Ingatlan felvétele
-- ---------------------------------------------------------------------------
create or replace function app.properties_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return new;
  end if;
  if not app.is_member(new.organization_id) then
    raise exception 'Nincs jogosultság' using errcode = '42501';
  end if;
  -- A nyilvános oldalt a megosztás művelet kapcsolja be, felvételkor nem lehet kész.
  new.public_enabled := false;
  new.public_slug := null;
  if not app.has_role(new.organization_id, '{owner}')
     and new.responsible_agent_id is not null and new.responsible_agent_id <> v_uid then
    raise exception 'Más nevére csak az irodavezető vehet fel ingatlant' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger properties_insert_guard before insert on public.properties
  for each row execute function app.properties_insert_guard();

-- ---------------------------------------------------------------------------
-- 6) Ajánlat, naptár, ismétlődő feladat
-- ---------------------------------------------------------------------------
create or replace function app.offers_deal_property_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deal_property uuid;
begin
  if (select auth.uid()) is null or new.deal_id is null then
    return new;
  end if;
  select d.property_id into v_deal_property from public.deals d where d.id = new.deal_id;
  if v_deal_property is not null and v_deal_property <> new.property_id then
    raise exception 'Az ajánlat az ügylet ingatlanára szólhat' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger offers_deal_property_guard before insert or update on public.offers
  for each row execute function app.offers_deal_property_guard();

create or replace function app.calendar_events_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'Az esemény szervezete nem módosítható' using errcode = '42501';
  end if;
  if not app.is_member(new.organization_id) then
    raise exception 'Nincs jogosultság' using errcode = '42501';
  end if;
  if not app.has_role(new.organization_id, '{owner,assistant}') then
    if new.owner_id is null then
      new.owner_id := v_uid;
    elsif new.owner_id <> v_uid then
      raise exception 'Eseményt csak a saját nevedre vehetsz fel' using errcode = '42501';
    end if;
  elsif new.owner_id is not null and not exists (
       select 1 from public.memberships m
       where m.organization_id = new.organization_id and m.user_id = new.owner_id and m.status = 'active') then
    raise exception 'Az esemény tulajdonosa a szervezet aktív tagja lehet' using errcode = '23514';
  end if;
  -- A hivatkozások a hívó RLS-ével, ugyanazon szervezetből.
  if new.contact_id is not null and not exists (
       select 1 from public.contacts c where c.id = new.contact_id and c.organization_id = new.organization_id) then
    raise exception 'Az ügyfél nem érhető el' using errcode = '42501';
  end if;
  if new.property_id is not null and not exists (
       select 1 from public.properties p where p.id = new.property_id and p.organization_id = new.organization_id) then
    raise exception 'Az ingatlan nem érhető el' using errcode = '42501';
  end if;
  if new.deal_id is not null and not exists (
       select 1 from public.deals d where d.id = new.deal_id and d.organization_id = new.organization_id) then
    raise exception 'Az ügylet nem érhető el' using errcode = '42501';
  end if;
  if new.showing_id is not null and not exists (
       select 1 from public.showings s where s.id = new.showing_id and s.organization_id = new.organization_id) then
    raise exception 'A bemutató nem érhető el' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger calendar_events_guard before insert or update on public.calendar_events
  for each row execute function app.calendar_events_guard();

-- Ismétlődő feladat: ugyanarra az időpontra nem készül második nyitott példány (kész → nyitott → kész billegtetés ellen).
create or replace function app.tasks_recur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_freq text;
  v_unit interval;
  v_local timestamp;
  v_next timestamptz;
  i integer;
begin
  if new.recurrence_rule is null or new.due_at is null then
    return null;
  end if;
  v_freq := substring(new.recurrence_rule from '(?:^|;)FREQ=(DAILY|WEEKLY|MONTHLY)(?:;|$)');
  if v_freq is null then
    return null;
  end if;
  v_unit := case v_freq when 'DAILY' then interval '1 day' when 'WEEKLY' then interval '7 days' else interval '1 month' end;
  v_local := new.due_at at time zone 'Europe/Budapest';
  for i in 1..800 loop
    v_next := (v_local + v_unit * i) at time zone 'Europe/Budapest';
    exit when v_next > now();
  end loop;
  if v_next <= now() then
    return null;
  end if;
  if exists (
    select 1 from public.tasks t
    where t.organization_id = new.organization_id and t.status = 'open' and t.title = new.title
      and t.due_at = v_next and t.recurrence_rule = new.recurrence_rule
      and t.assignee_id is not distinct from new.assignee_id
  ) then
    return null;
  end if;
  begin
    insert into public.tasks (organization_id, title, description, due_at, assignee_id, contact_id, property_id, deal_id,
                              priority, recurrence_rule, created_by)
    values (new.organization_id, new.title, new.description, v_next, new.assignee_id, new.contact_id, new.property_id,
            new.deal_id, new.priority, new.recurrence_rule, new.created_by);
  exception when others then
    raise warning 'Az ismétlődő feladat következő példánya nem jött létre: %', sqlerrm;
  end;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Audit-napló és lead-eredet
-- ---------------------------------------------------------------------------
-- A naplóba csak szerveroldali (service role) kód írhat; kliens nem hamisíthat bejegyzést.
revoke execute on function public.write_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.write_audit(uuid, text, text, uuid, jsonb) to service_role;

create or replace function app.leads_origin_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and tg_op = 'INSERT' then
    if new.source = 'public_page' then
      raise exception 'A nyilvános oldal forrását csak a beküldő függvény állíthatja' using errcode = '42501';
    end if;
    new.consent_at := null;
  end if;
  if (select auth.uid()) is not null and tg_op = 'UPDATE'
     and (new.consent_at is distinct from old.consent_at or new.source is distinct from old.source) then
    raise exception 'A lead eredete és hozzájárulása nem módosítható' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger leads_origin_guard before insert or update on public.leads
  for each row execute function app.leads_origin_guard();

-- ---------------------------------------------------------------------------
-- 8) Függvényjogok: névtelen csak a két nyilvános függvényt hívhatja
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname not in ('get_public_property', 'submit_public_inquiry', 'write_audit')
  loop
    execute format('revoke execute on function %s from anon, public', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;
end $$;
alter default privileges in schema public revoke execute on functions from anon;
