-- Kulcs · 0016 · Feladatok védelme
-- A feladat-táblának eddig csak „tagja a szervezetnek” volt az írási feltétele; így másik szervezet
-- ügyfelére/ingatlanára hivatkozni, idegen felhasználót felelősnek jelölni vagy a létrehozót hamisítani is lehetett.
-- 1) a szervezet nem módosítható, a létrehozó mindig a bejelentkezett felhasználó;
-- 2) hivatkozások (ügyfél, ingatlan, ügylet) ugyanabból a szervezetből, az ügynöknek csak a saját adataira;
-- 3) felelős: a szervezet aktív tagja; az ügynök csak magát (vagy senkit) jelölheti;
-- 4) az elvégzés időpontja a státuszból következik.

create or replace function app.tasks_guard()
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
    raise exception 'A feladat szervezete nem módosítható' using errcode = '42501';
  end if;

  if v_uid is not null then
    if tg_op = 'INSERT' then
      new.created_by := v_uid;
    elsif new.created_by is distinct from old.created_by then
      raise exception 'A feladat létrehozója nem módosítható' using errcode = '42501';
    end if;
  end if;

  v_broad := v_uid is null or app.has_role(new.organization_id, '{owner,assistant}');

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
    if tg_op = 'INSERT' or old.status is distinct from 'done' or new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_guard before insert or update on public.tasks
  for each row execute function app.tasks_guard();
