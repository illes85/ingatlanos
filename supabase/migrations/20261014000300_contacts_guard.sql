-- Kulcs · 0011 · Ügyfelek és gyerektáblák védelme (D-022 folytatása)
-- 1) az ügyfél felelőse csak a szervezet aktív ügynöke/irodavezetője lehet, és a váltás jogosultsághoz kötött;
-- 2) a keresési profil, az ajánlás és az esemény csak ugyanazon szervezet rekordjaira hivatkozhat.

create or replace function app.contacts_guard_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'Az ügyfél szervezete nem módosítható' using errcode = '42501';
  end if;

  if new.owner_agent_id is not null
     and (tg_op = 'INSERT' or new.owner_agent_id is distinct from old.owner_agent_id) then
    if not exists (
      select 1 from public.memberships m
      where m.organization_id = new.organization_id
        and m.user_id = new.owner_agent_id
        and m.status = 'active'
        and m.role in ('owner', 'agent')
    ) then
      raise exception 'Az ügyfél felelőse csak a szervezet aktív ügynöke vagy irodavezetője lehet' using errcode = '23514';
    end if;
  end if;

  -- auth.uid() null: rendszerművelet (seed, service role) — azt nem korlátozzuk.
  if tg_op = 'UPDATE' and (select auth.uid()) is not null
     and new.owner_agent_id is distinct from old.owner_agent_id
     and not (app.has_role(old.organization_id, '{owner,assistant}') or old.owner_agent_id = (select auth.uid())) then
    raise exception 'Az ügyfél felelősét az irodavezető, az asszisztens vagy a jelenlegi felelős válthatja' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger contacts_guard_owner before insert or update on public.contacts
  for each row execute function app.contacts_guard_owner();

-- A gyerekrekord szervezete egyezzen az ügyfél (és az ingatlan, ügylet) szervezetével.
create or replace function app.contact_children_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact uuid;
  v_property uuid;
  v_deal uuid;
begin
  if tg_table_name = 'activities' then
    v_contact := new.contact_id;
    v_property := new.property_id;
    v_deal := new.deal_id;
  elsif tg_table_name = 'property_recommendations' then
    v_contact := new.contact_id;
    v_property := new.property_id;
  else
    v_contact := new.contact_id;
  end if;

  if v_contact is not null and not exists (
    select 1 from public.contacts c where c.id = v_contact and c.organization_id = new.organization_id
  ) then
    raise exception 'Az ügyfél más szervezethez tartozik' using errcode = '42501';
  end if;
  if v_property is not null and not exists (
    select 1 from public.properties p where p.id = v_property and p.organization_id = new.organization_id
  ) then
    raise exception 'Az ingatlan más szervezethez tartozik' using errcode = '42501';
  end if;
  if v_deal is not null and not exists (
    select 1 from public.deals d where d.id = v_deal and d.organization_id = new.organization_id
  ) then
    raise exception 'Az ügylet más szervezethez tartozik' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger search_profiles_org_guard before insert or update on public.search_profiles
  for each row execute function app.contact_children_guard();
create trigger property_recommendations_org_guard before insert or update on public.property_recommendations
  for each row execute function app.contact_children_guard();
create trigger activities_org_guard before insert or update on public.activities
  for each row execute function app.contact_children_guard();
