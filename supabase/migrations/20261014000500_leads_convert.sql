-- Kulcs · 0013 · Lead-védelem szigorítása és atomi átalakítás (biztonsági átnézés nyomán)
-- 1) lead: tag-ellenőrzés elöl, látható ügyfél hivatkozhatő, az átalakított lead nem módosítható vissza,
--    „átalakított” csak ügyféllel;
-- 2) ügyfél létrehozásakor az ügynök csak magát adhatja meg felelősnek;
-- 3) find_duplicate_contacts: üres érték nem egyezik, anonimizált ügyfél nem jelenik meg;
-- 4) convert_lead: az átalakítás egy tranzakcióban, zárolt lead-soron, a hívó jogaival (security invoker).

create or replace function app.leads_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not app.is_member(new.organization_id) then
    raise exception 'Nincs jogosultság' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'A lead szervezete nem módosítható' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and old.status = 'converted'
     and (new.status is distinct from old.status or new.contact_id is distinct from old.contact_id) then
    raise exception 'Az átalakított lead állapota és ügyfele nem módosítható' using errcode = '23514';
  end if;
  if new.status = 'converted' and new.contact_id is null then
    raise exception 'Átalakított leadnek ügyfél kell' using errcode = '23514';
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
  -- Ügyfélhez csak olyat lehet kötni, amit a hívó lát (owner/asszisztens: mindet; ügynök: a sajátját).
  if new.contact_id is not null
     and (tg_op = 'INSERT' or new.contact_id is distinct from old.contact_id)
     and (select auth.uid()) is not null
     and not (
       app.has_role(new.organization_id, '{owner,assistant}')
       or exists (select 1 from public.contacts c where c.id = new.contact_id and c.owner_agent_id = (select auth.uid()))
     ) then
    raise exception 'Ehhez az ügyfélhez nincs jogosultság' using errcode = '42501';
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

-- Ügyfél létrehozásakor az ügynök csak magát adhatja meg felelősnek.
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

  if tg_op = 'INSERT' and (select auth.uid()) is not null
     and new.owner_agent_id is distinct from (select auth.uid())
     and not app.has_role(new.organization_id, '{owner,assistant}') then
    raise exception 'Ügyfelet az ügynök csak a saját nevére vehet fel' using errcode = '42501';
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

create or replace function public.find_duplicate_contacts(p_org uuid, p_phone text, p_email text)
returns table (id uuid, full_name text, owner_agent_id uuid, owner_name text, match text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.full_name, c.owner_agent_id, p.full_name,
         case when nullif(trim(p_phone), '') is not null and c.phone_normalized = nullif(trim(p_phone), '') then 'phone' else 'email' end
  from public.contacts c
  left join public.profiles p on p.id = c.owner_agent_id
  where c.organization_id = p_org
    and app.is_member(p_org)
    and c.deleted_at is null
    and c.anonymized_at is null
    and (
      (nullif(trim(p_phone), '') is not null and c.phone_normalized = nullif(trim(p_phone), ''))
      or (nullif(trim(p_email), '') is not null and lower(c.email) = lower(nullif(trim(p_email), '')))
    )
  limit 10;
$$;

-- Lead átalakítása ügyféllé egy tranzakcióban. Security invoker: a hívó RLS-jogaival fut,
-- tehát csak olyan leadet alakíthat át, amit lát, és csak olyan meglévő ügyfélhez kapcsolhat, amit lát.
create or replace function public.convert_lead(p_lead uuid, p_contact uuid default null, p_activity_title text default 'Leadből ügyfél lett')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lead public.leads%rowtype;
  v_contact uuid := p_contact;
  v_name text;
  v_last text;
  v_first text;
  v_owner uuid;
begin
  select * into v_lead from public.leads where id = p_lead for update;
  if not found then
    raise exception 'A lead nem található' using errcode = '42501';
  end if;
  if v_lead.status = 'converted' then
    raise exception 'A lead már át van alakítva' using errcode = '23514';
  end if;

  if v_contact is not null then
    if not exists (select 1 from public.contacts c where c.id = v_contact and c.organization_id = v_lead.organization_id) then
      raise exception 'Az ügyfél nem található' using errcode = '42501';
    end if;
  else
    v_name := trim(coalesce(v_lead.full_name, ''));
    v_last := split_part(v_name, ' ', 1);
    v_first := trim(substr(v_name, length(v_last) + 1));
    v_owner := coalesce(v_lead.assigned_to, case when app.has_role(v_lead.organization_id, '{assistant}') then null else (select auth.uid()) end);
    insert into public.contacts (organization_id, owner_agent_id, last_name, first_name, email, phone, phone_normalized, roles, source, source_detail)
    values (v_lead.organization_id, v_owner, v_last, v_first, v_lead.email, v_lead.phone, v_lead.phone_normalized, '{buyer}', v_lead.source, v_lead.source_detail)
    returning id into v_contact;
  end if;

  update public.leads
     set contact_id = v_contact,
         status = 'converted',
         converted_at = now(),
         assigned_to = coalesce(v_lead.assigned_to, case when app.has_role(v_lead.organization_id, '{agent}') then (select auth.uid()) end)
   where id = p_lead;

  insert into public.activities (organization_id, type, actor_id, contact_id, property_id, title, body)
  values (v_lead.organization_id, 'lead', (select auth.uid()), v_contact, v_lead.property_id, p_activity_title, v_lead.raw_message);

  return v_contact;
end;
$$;

revoke execute on function public.convert_lead(uuid, uuid, text) from public, anon;
grant execute on function public.convert_lead(uuid, uuid, text) to authenticated;
