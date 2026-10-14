-- Kulcs · 0015 · Ügylet-, ajánlat- és bemutató-védelem szigorítása (biztonsági átnézés nyomán)
-- 1) az ügylet oldala (eladói/vevői) nem váltható; az ingatlan státuszát átíró szakasz-/státuszváltáshoz
--    mindig kell szerkesztési jog az ingatlanra (elavult jogosultság ellen is);
-- 2) az ügylet felelősét csak az owner váltja; az ügyletet szerkesztő ügynöknek a szerepe is ügynök legyen;
-- 3) ajánlat és bemutató: hivatkozások ugyanazon szervezetből, jogosultsághoz kötve.

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
  if tg_op = 'UPDATE' and new.side is distinct from old.side then
    raise exception 'Az ügylet oldala nem módosítható' using errcode = '42501';
  end if;

  if new.property_id is not null and (tg_op = 'INSERT' or new.property_id is distinct from old.property_id) then
    if not exists (select 1 from public.properties p where p.id = new.property_id and p.organization_id = new.organization_id) then
      raise exception 'Az ingatlan más szervezethez tartozik' using errcode = '42501';
    end if;
  end if;
  -- Az after-trigger az eladói ügylet szakaszából írja az ingatlan státuszát: ehhez mindig kell jog az ingatlanra.
  if v_uid is not null and new.side = 'seller' and new.property_id is not null
     and (tg_op = 'INSERT'
          or new.property_id is distinct from old.property_id
          or new.stage is distinct from old.stage
          or new.status is distinct from old.status)
     and not app.can_edit_property(new.property_id, new.organization_id) then
    raise exception 'Ehhez az ingatlanhoz nincs jogosultság' using errcode = '42501';
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

  if v_uid is not null and not app.has_role(new.organization_id, '{owner}') then
    if tg_op = 'INSERT' and new.agent_id is distinct from v_uid then
      raise exception 'Ügyletet az ügynök csak a saját nevére vehet fel' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.agent_id is distinct from old.agent_id then
      raise exception 'Az ügylet felelősét az irodavezető válthatja' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- Az ügyletet szerkesztő ügynöknek a jelenlegi szerepe is ügynök legyen.
drop policy "ügylet: módosítás" on public.deals;
create policy "ügylet: módosítás" on public.deals
  for update to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (agent_id = (select auth.uid()) and app.has_role(organization_id, '{agent}'))
  )
  with check (app.is_member(organization_id));

-- ---------------------------------------------------------------------------
-- Ajánlat
-- ---------------------------------------------------------------------------
create or replace function app.offers_guard()
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
    raise exception 'Az ajánlat szervezete nem módosítható' using errcode = '42501';
  end if;

  if not exists (select 1 from public.properties p where p.id = new.property_id and p.organization_id = new.organization_id) then
    raise exception 'Az ingatlan más szervezethez tartozik' using errcode = '42501';
  end if;
  if new.deal_id is not null and not exists (select 1 from public.deals d where d.id = new.deal_id and d.organization_id = new.organization_id) then
    raise exception 'Az ügylet más szervezethez tartozik' using errcode = '42501';
  end if;
  if new.buyer_contact_id is not null and not exists (select 1 from public.contacts c where c.id = new.buyer_contact_id and c.organization_id = new.organization_id) then
    raise exception 'Az ügyfél más szervezethez tartozik' using errcode = '42501';
  end if;
  if new.parent_offer_id is not null and not exists (select 1 from public.offers o where o.id = new.parent_offer_id and o.organization_id = new.organization_id) then
    raise exception 'Az ajánlat más szervezethez tartozik' using errcode = '42501';
  end if;

  -- Ajánlatot az ingatlan szerkesztője vagy az ügylet felelőse rögzíthet.
  if v_uid is not null
     and not app.can_edit_property(new.property_id, new.organization_id)
     and not (new.deal_id is not null and exists (select 1 from public.deals d where d.id = new.deal_id and d.agent_id = v_uid)) then
    raise exception 'Ehhez az ingatlanhoz vagy ügylethez nincs jogosultság' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger offers_guard before insert or update on public.offers
  for each row execute function app.offers_guard();

drop policy "ajánlat: olvasás" on public.offers;
create policy "ajánlat: olvasás" on public.offers
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (app.is_member(organization_id) and (
         (deal_id is not null and exists (select 1 from public.deals d where d.id = deal_id))
         or exists (select 1 from public.properties p
                    where p.id = property_id and p.responsible_agent_id = (select auth.uid()))
       ))
  );

drop policy "ajánlat: írás" on public.offers;
create policy "ajánlat: létrehozás" on public.offers
  for insert to authenticated
  with check (app.has_role(organization_id, '{owner,agent}'));
create policy "ajánlat: módosítás" on public.offers
  for update to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (app.has_role(organization_id, '{agent}') and (
         (deal_id is not null and exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = (select auth.uid())))
         or exists (select 1 from public.properties p where p.id = property_id and p.responsible_agent_id = (select auth.uid()))
       ))
  )
  with check (app.has_role(organization_id, '{owner,agent}'));
create policy "ajánlat: törlés" on public.offers
  for delete to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (app.has_role(organization_id, '{agent}') and (
         (deal_id is not null and exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = (select auth.uid())))
         or exists (select 1 from public.properties p where p.id = property_id and p.responsible_agent_id = (select auth.uid()))
       ))
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
begin
  if v_uid is not null and not app.is_member(new.organization_id) then
    raise exception 'Nincs jogosultság' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'A bemutató szervezete nem módosítható' using errcode = '42501';
  end if;

  if not exists (select 1 from public.properties p where p.id = new.property_id and p.organization_id = new.organization_id) then
    raise exception 'Az ingatlan más szervezethez tartozik' using errcode = '42501';
  end if;
  if new.deal_id is not null and not exists (select 1 from public.deals d where d.id = new.deal_id and d.organization_id = new.organization_id) then
    raise exception 'Az ügylet más szervezethez tartozik' using errcode = '42501';
  end if;
  if new.buyer_contact_id is not null and not exists (select 1 from public.contacts c where c.id = new.buyer_contact_id and c.organization_id = new.organization_id) then
    raise exception 'Az ügyfél más szervezethez tartozik' using errcode = '42501';
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
    if v_uid is not null and not app.has_role(new.organization_id, '{owner,assistant}') and new.agent_id <> v_uid then
      raise exception 'A bemutatót az ügynök csak a saját nevére rögzítheti' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger showings_guard before insert or update on public.showings
  for each row execute function app.showings_guard();
