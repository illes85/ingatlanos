-- Kulcs · 0014 · Ügyletek védelme (D-022 folytatása)
-- Az ügylet szakaszváltása az ingatlan státuszát is átírja (security definer trigger), ezért az ügylet
-- nem hivatkozhat olyan ingatlanra, amit a hívó nem szerkeszthet, és másik szervezet rekordjára sem.
--  1) a szervezet nem módosítható, a hívó a szervezet tagja;
--  2) az ingatlan és az ügyfél ugyanazon szervezeté; eladói ügyletnél az ingatlant a hívó szerkesztheti,
--     az ügyfelet a hívó látja (owner/asszisztens: mind; ügynök: a saját ügyfele);
--  3) a felelős csak aktív ügynök/irodavezető lehet; ügynök ügyletet csak a saját nevére vehet fel.

create or replace function app.deals_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is not null and not app.is_member(new.organization_id) then
    raise exception 'Nincs jogosultság' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'Az ügylet szervezete nem módosítható' using errcode = '42501';
  end if;

  if new.property_id is not null and (tg_op = 'INSERT' or new.property_id is distinct from old.property_id) then
    if not exists (select 1 from public.properties p where p.id = new.property_id and p.organization_id = new.organization_id) then
      raise exception 'Az ingatlan más szervezethez tartozik' using errcode = '42501';
    end if;
    if v_uid is not null and new.side = 'seller' and not app.can_edit_property(new.property_id, new.organization_id) then
      raise exception 'Ehhez az ingatlanhoz nincs jogosultság' using errcode = '42501';
    end if;
  end if;

  if new.contact_id is not null and (tg_op = 'INSERT' or new.contact_id is distinct from old.contact_id) then
    if not exists (select 1 from public.contacts c where c.id = new.contact_id and c.organization_id = new.organization_id) then
      raise exception 'Az ügyfél más szervezethez tartozik' using errcode = '42501';
    end if;
    if v_uid is not null
       and not app.has_role(new.organization_id, '{owner,assistant}')
       and not exists (select 1 from public.contacts c where c.id = new.contact_id and c.owner_agent_id = v_uid) then
      raise exception 'Ehhez az ügyfélhez nincs jogosultság' using errcode = '42501';
    end if;
  end if;

  if new.agent_id is not null and (tg_op = 'INSERT' or new.agent_id is distinct from old.agent_id) then
    if not exists (
      select 1 from public.memberships m
      where m.organization_id = new.organization_id and m.user_id = new.agent_id
        and m.status = 'active' and m.role in ('owner', 'agent')
    ) then
      raise exception 'Az ügylet felelőse csak a szervezet aktív ügynöke vagy irodavezetője lehet' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'INSERT' and v_uid is not null
     and new.agent_id is distinct from v_uid
     and not app.has_role(new.organization_id, '{owner}') then
    raise exception 'Ügyletet az ügynök csak a saját nevére vehet fel' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger deals_guard before insert or update on public.deals
  for each row execute function app.deals_guard();
