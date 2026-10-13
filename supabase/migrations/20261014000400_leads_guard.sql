-- Kulcs · 0012 · Leadek védelme (D-022 folytatása)
-- 1) a lead szervezete nem módosítható, az ingatlan és az ügyfél ugyanahhoz a szervezethez tartozzon;
-- 2) a felelős csak a szervezet aktív ügynöke/irodavezetője lehet;
-- 3) az ügynök csak magához veheti a kiosztatlan leadet vagy átadhatja a sajátját; az owner és az asszisztens bárkinek kioszthat.

create or replace function app.leads_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'A lead szervezete nem módosítható' using errcode = '42501';
  end if;

  if new.property_id is not null and not exists (
    select 1 from public.properties p where p.id = new.property_id and p.organization_id = new.organization_id
  ) then
    raise exception 'Az ingatlan más szervezethez tartozik' using errcode = '42501';
  end if;
  if new.contact_id is not null and not exists (
    select 1 from public.contacts c where c.id = new.contact_id and c.organization_id = new.organization_id
  ) then
    raise exception 'Az ügyfél más szervezethez tartozik' using errcode = '42501';
  end if;

  if new.assigned_to is not null
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    if not exists (
      select 1 from public.memberships m
      where m.organization_id = new.organization_id
        and m.user_id = new.assigned_to
        and m.status = 'active'
        and m.role in ('owner', 'agent')
    ) then
      raise exception 'A lead felelőse csak a szervezet aktív ügynöke vagy irodavezetője lehet' using errcode = '23514';
    end if;
  end if;

  -- auth.uid() null: rendszerművelet (seed, nyilvános űrlap szerveroldala) — azt nem korlátozzuk.
  if (select auth.uid()) is not null
     and new.assigned_to is distinct from (case when tg_op = 'UPDATE' then old.assigned_to else null end)
     and not app.has_role(new.organization_id, '{owner,assistant}') then
    if tg_op = 'INSERT' or old.assigned_to is null then
      if new.assigned_to is not null and new.assigned_to <> (select auth.uid()) then
        raise exception 'Kiosztatlan leadet csak magadhoz vehetsz' using errcode = '42501';
      end if;
    elsif old.assigned_to <> (select auth.uid()) then
      raise exception 'A lead felelősét az irodavezető, az asszisztens vagy a jelenlegi felelős válthatja' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger leads_guard before insert or update on public.leads
  for each row execute function app.leads_guard();
