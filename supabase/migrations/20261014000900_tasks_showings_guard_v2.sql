-- Kulcs · 0017 · Feladat- és bemutató-védelem szigorítása (biztonsági átnézés nyomán)
-- 1) bemutató: az ügynök csak a saját ügyfelét/ügyletét kötheti hozzá, magán-ingatlanra nem hivatkozhat,
--    más ügynök bemutatóját nem veheti át és nem írhatja át; a létrehozó nem hamisítható;
-- 2) feladat: magán-ingatlanra nem hivatkozhat az ügynök; az elvégzés időpontja nem írható vissza;
-- 3) az ismétlődő feladat következő példánya adatbázis-triggerből jön létre (az eredeti létrehozóval, atomikusan);
-- 4) a törlés mindkét táblán aktív tagságot kér.

-- ---------------------------------------------------------------------------
-- Feladat
-- ---------------------------------------------------------------------------
create or replace function app.tasks_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  -- A belső (trigger által indított) beszúrás az ismétlődő feladat következő példánya: a hivatkozásai már ellenőrzöttek.
  v_nested boolean := pg_trigger_depth() > 1;
  v_broad boolean;
begin
  if v_uid is not null and not v_nested and not app.is_member(new.organization_id) then
    raise exception 'Nincs jogosultság' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'A feladat szervezete nem módosítható' using errcode = '42501';
  end if;

  if v_uid is not null and not v_nested then
    if tg_op = 'INSERT' then
      new.created_by := v_uid;
    elsif new.created_by is distinct from old.created_by then
      raise exception 'A feladat létrehozója nem módosítható' using errcode = '42501';
    end if;
  end if;

  v_broad := v_uid is null or v_nested or app.has_role(new.organization_id, '{owner,assistant}');

  if new.contact_id is not null and (tg_op = 'INSERT' or new.contact_id is distinct from old.contact_id) then
    if not exists (select 1 from public.contacts c where c.id = new.contact_id and c.organization_id = new.organization_id) then
      raise exception 'Az ügyfél más szervezethez tartozik' using errcode = '42501';
    end if;
    if not v_broad
       and not exists (select 1 from public.contacts c where c.id = new.contact_id and c.owner_agent_id = v_uid) then
      raise exception 'Ehhez az ügyfélhez nincs jogosultság' using errcode = '42501';
    end if;
  end if;

  if new.property_id is not null and (tg_op = 'INSERT' or new.property_id is distinct from old.property_id) then
    if not exists (select 1 from public.properties p where p.id = new.property_id and p.organization_id = new.organization_id) then
      raise exception 'Az ingatlan más szervezethez tartozik' using errcode = '42501';
    end if;
    -- Magán-ingatlanra csak a felelőse és az owner hivatkozhat.
    if v_uid is not null and not v_nested and not app.has_role(new.organization_id, '{owner}')
       and not exists (select 1 from public.properties p
                       where p.id = new.property_id and (p.visibility = 'office' or p.responsible_agent_id = v_uid)) then
      raise exception 'Ehhez az ingatlanhoz nincs jogosultság' using errcode = '42501';
    end if;
  end if;

  if new.deal_id is not null and (tg_op = 'INSERT' or new.deal_id is distinct from old.deal_id) then
    if not exists (select 1 from public.deals d where d.id = new.deal_id and d.organization_id = new.organization_id) then
      raise exception 'Az ügylet más szervezethez tartozik' using errcode = '42501';
    end if;
    if not v_broad
       and not exists (select 1 from public.deals d where d.id = new.deal_id and d.agent_id = v_uid) then
      raise exception 'Ehhez az ügylethez nincs jogosultság' using errcode = '42501';
    end if;
  end if;

  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    if not exists (
      select 1 from public.memberships m
      where m.organization_id = new.organization_id and m.user_id = new.assignee_id and m.status = 'active'
    ) then
      raise exception 'A feladat felelőse a szervezet aktív tagja lehet' using errcode = '23514';
    end if;
    if not v_broad and new.assignee_id <> v_uid then
      raise exception 'A feladatot az ügynök csak magának jelölheti ki' using errcode = '42501';
    end if;
  end if;

  if new.status = 'done' then
    if tg_op = 'UPDATE' and old.status = 'done' then
      new.completed_at := old.completed_at;               -- az elvégzés ideje nem írható vissza
    else
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

-- Ismétlődő feladat: elvégzéskor a következő példány a jövőben jön létre (budapesti falióra szerint),
-- az eredeti létrehozóval és hivatkozásokkal. Ha a beszúrás nem sikerül, az elvégzést nem akadályozza.
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

create trigger tasks_recur after update of status on public.tasks
  for each row when (old.status = 'open' and new.status = 'done')
  execute function app.tasks_recur();

drop policy "feladat: törlés" on public.tasks;
create policy "feladat: törlés" on public.tasks
  for delete to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (app.is_member(organization_id) and created_by = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Bemutató
-- ---------------------------------------------------------------------------
create or replace function app.showings_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_broad boolean;
begin
  if v_uid is not null and not app.is_member(new.organization_id) then
    raise exception 'Nincs jogosultság' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'A bemutató szervezete nem módosítható' using errcode = '42501';
  end if;

  if v_uid is not null then
    if tg_op = 'INSERT' then
      new.created_by := v_uid;
    elsif new.created_by is distinct from old.created_by then
      raise exception 'A bemutató létrehozója nem módosítható' using errcode = '42501';
    end if;
  end if;

  v_broad := v_uid is null or app.has_role(new.organization_id, '{owner,assistant}');

  -- Más ügynök bemutatóját a (csak az ingatlan felelőseként látó) ügynök nem veheti át, és nem kötheti át:
  -- neki az állapot, a visszajelzés és a megjegyzés marad.
  if tg_op = 'UPDATE' and not v_broad and old.agent_id is distinct from v_uid
     and (new.agent_id is distinct from old.agent_id
          or new.property_id is distinct from old.property_id
          or new.buyer_contact_id is distinct from old.buyer_contact_id
          or new.deal_id is distinct from old.deal_id) then
    raise exception 'Más ügynök bemutatójának hivatkozásai nem módosíthatók' using errcode = '42501';
  end if;

  if (tg_op = 'INSERT' or new.property_id is distinct from old.property_id) then
    if not exists (select 1 from public.properties p where p.id = new.property_id and p.organization_id = new.organization_id) then
      raise exception 'Az ingatlan más szervezethez tartozik' using errcode = '42501';
    end if;
    if v_uid is not null and not app.has_role(new.organization_id, '{owner}')
       and not exists (select 1 from public.properties p
                       where p.id = new.property_id and (p.visibility = 'office' or p.responsible_agent_id = v_uid)) then
      raise exception 'Ehhez az ingatlanhoz nincs jogosultság' using errcode = '42501';
    end if;
  end if;

  if new.deal_id is not null and (tg_op = 'INSERT' or new.deal_id is distinct from old.deal_id) then
    if not exists (select 1 from public.deals d where d.id = new.deal_id and d.organization_id = new.organization_id) then
      raise exception 'Az ügylet más szervezethez tartozik' using errcode = '42501';
    end if;
    if not v_broad and not exists (select 1 from public.deals d where d.id = new.deal_id and d.agent_id = v_uid) then
      raise exception 'Ehhez az ügylethez nincs jogosultság' using errcode = '42501';
    end if;
  end if;

  if new.buyer_contact_id is not null and (tg_op = 'INSERT' or new.buyer_contact_id is distinct from old.buyer_contact_id) then
    if not exists (select 1 from public.contacts c where c.id = new.buyer_contact_id and c.organization_id = new.organization_id) then
      raise exception 'Az ügyfél más szervezethez tartozik' using errcode = '42501';
    end if;
    if not v_broad and not exists (select 1 from public.contacts c where c.id = new.buyer_contact_id and c.owner_agent_id = v_uid) then
      raise exception 'Ehhez az ügyfélhez nincs jogosultság' using errcode = '42501';
    end if;
  end if;

  if new.agent_id is not null and (tg_op = 'INSERT' or new.agent_id is distinct from old.agent_id) then
    if not exists (
      select 1 from public.memberships m
      where m.organization_id = new.organization_id and m.user_id = new.agent_id
        and m.status = 'active' and m.role in ('owner', 'agent')
    ) then
      raise exception 'A bemutató felelőse csak a szervezet aktív ügynöke vagy irodavezetője lehet' using errcode = '23514';
    end if;
    -- Az ügynök csak magát jelölheti; az owner és az asszisztens bárkit.
    if not v_broad and new.agent_id <> v_uid then
      raise exception 'A bemutatót az ügynök csak a saját nevére rögzítheti' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop policy "bemutató: törlés" on public.showings;
create policy "bemutató: törlés" on public.showings
  for delete to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (app.is_member(organization_id) and agent_id = (select auth.uid()))
  );
