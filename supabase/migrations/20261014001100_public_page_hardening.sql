-- Kulcs · 0019 · Nyilvános oldal szigorítása (biztonsági átnézés nyomán)
-- 1) a média útvonala az ingatlan saját mappájára korlátozott (idegen ingatlan fájlja nem hivatkozható),
--    és a nyilvános fotó-lekérdezés is ellenőrzi az útvonal ingatlan-szeletét;
-- 2) az ügynök elérhetősége csak aktív tagnál megy ki;
-- 3) az érdeklődés beküldése: csak névtelenül hívható, hozzájárulás tárolva, a telefonszám-ellenőrzés az adatbázisban,
--    szervezeti plafon, párhuzamos hívások ellen zár, indexelt számlálás.

-- ---------------------------------------------------------------------------
-- 1) Média útvonal
-- ---------------------------------------------------------------------------
alter table public.property_media drop constraint property_media_path_in_org;
alter table public.property_media
  add constraint property_media_path_in_org check (
    storage_path is null
    or storage_path like organization_id::text || '/' || property_id::text || '/%'
    or storage_path like organization_id::text || '/seed/%'          -- a demó közös képkészlete
  );

create or replace function app.public_media_visible(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.property_media m
    join public.properties p on p.id = m.property_id
    where m.storage_path = p_path
      and m.kind = 'photo'
      and m.is_public
      and p.public_enabled
      and app.public_status(p.status)
      and (storage.foldername(m.storage_path))[2] in (m.property_id::text, 'seed')
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) Olvasás: elérhetőség csak aktív felelősnél
-- ---------------------------------------------------------------------------
create or replace function public.get_public_property(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
  v_photos jsonb;
begin
  if p_slug is null or char_length(p_slug) < 8 or char_length(p_slug) > 120 then
    return null;
  end if;

  select p.*, pr.full_name as agent_name, pr.phone as agent_phone, pr.email as agent_email,
         pr.license_number as agent_license, o.name as org_name
    into r
    from public.properties p
    left join public.memberships m
           on m.user_id = p.responsible_agent_id and m.organization_id = p.organization_id
          and m.status = 'active' and m.role in ('owner', 'agent')
    left join public.profiles pr on pr.id = m.user_id
    left join public.organizations o on o.id = p.organization_id
   where p.public_slug = p_slug and p.public_enabled and app.public_status(p.status);
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('path', m.storage_path, 'caption', m.caption)
                            order by m.is_cover desc, m.sort_order, m.created_at), '[]'::jsonb)
    into v_photos
    from public.property_media m
   where m.property_id = r.id and m.kind = 'photo' and m.is_public and m.storage_path is not null
     and (storage.foldername(m.storage_path))[2] in (r.id::text, 'seed');

  return jsonb_build_object(
    'title', r.title,
    'transaction_type', r.transaction_type,
    'property_type', r.property_type,
    'subtype', r.subtype,
    'status', r.status,
    'price', r.price,
    'currency', r.currency,
    'area_sqm', r.area_sqm,
    'rooms', r.rooms,
    'half_rooms', r.half_rooms,
    'bathrooms', r.bathrooms,
    'floor', r.floor,
    'building_floors', r.building_floors,
    'has_elevator', r.has_elevator,
    'heating', r.heating,
    'condition', r.condition,
    'year_built', r.year_built,
    'energy_rating', r.energy_rating,
    'balcony_sqm', r.balcony_sqm,
    'has_terrace', r.has_terrace,
    'garden_connected', r.garden_connected,
    'parking', r.parking,
    'lot_sqm', r.lot_sqm,
    'utilities_monthly', r.utilities_monthly,
    'common_cost_monthly', r.common_cost_monthly,
    'description', r.description,
    'highlights', to_jsonb(r.highlights),
    'address_visibility', r.address_visibility,
    'city', r.city,
    'district', r.district,
    'postal_code', case when r.address_visibility = 'exact' then r.postal_code end,
    'street', case when r.address_visibility in ('exact', 'street') then r.street end,
    'house_number', case when r.address_visibility = 'exact' then r.house_number end,
    'photos', v_photos,
    'agent', jsonb_build_object('name', r.agent_name, 'phone', r.agent_phone, 'email', r.agent_email, 'license', r.agent_license),
    'office', r.org_name
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Érdeklődés beküldése
-- ---------------------------------------------------------------------------
alter table public.leads add column consent_at timestamptz;      -- az adatkezelési hozzájárulás időpontja (nyilvános űrlap)
create index leads_public_throttle_idx on public.leads (property_id, source, created_at);
create index leads_org_source_idx on public.leads (organization_id, source, created_at);

drop function public.submit_public_inquiry(text, text, text, text, text, text);

-- Visszatérés: 'ok' | 'not_found' | 'invalid' | 'rate_limited'.
create or replace function public.submit_public_inquiry(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_message text,
  p_consent boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property record;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_digits text;
  v_norm text;
  v_assignee uuid;
begin
  select p.id, p.organization_id, p.responsible_agent_id
    into v_property
    from public.properties p
   where p.public_slug = p_slug and p.public_enabled and app.public_status(p.status);
  if not found then
    return 'not_found';
  end if;

  if not coalesce(p_consent, false)
     or char_length(v_name) < 2 or char_length(v_name) > 120
     or (v_phone is null and v_email is null)
     or (v_phone is not null and char_length(v_phone) > 40)
     or (v_email is not null and (char_length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
     or (v_message is not null and char_length(v_message) > 2000) then
    return 'invalid';
  end if;

  -- A telefonszám egységes alakja az adatbázisban készül (a hívó nem adhat meg tetszőleges értéket).
  v_digits := regexp_replace(coalesce(v_phone, ''), '\D', '', 'g');
  if v_digits <> '' then
    if left(v_digits, 2) = '00' then v_digits := substr(v_digits, 3);
    elsif left(v_digits, 2) = '06' then v_digits := '36' || substr(v_digits, 3);
    end if;
    v_norm := case when char_length(v_digits) between 8 and 15 then '+' || v_digits end;
  end if;

  -- Egy ingatlanra egyszerre egy beküldés számolhat (párhuzamos hívások ellen).
  perform pg_advisory_xact_lock(hashtext(v_property.id::text));

  -- Visszaélés ellen: ingatlanonként 30/óra, szervezetenként 100/óra, ugyanarról az elérhetőségről 3/óra.
  if (select count(*) from public.leads l
       where l.property_id = v_property.id and l.source = 'public_page' and l.created_at > now() - interval '1 hour') >= 30
     or (select count(*) from public.leads l
          where l.organization_id = v_property.organization_id and l.source = 'public_page'
            and l.created_at > now() - interval '1 hour') >= 100
     or (select count(*) from public.leads l
          where l.organization_id = v_property.organization_id and l.source = 'public_page'
            and l.created_at > now() - interval '1 hour'
            and ((v_email is not null and l.email = v_email) or (v_norm is not null and l.phone_normalized = v_norm))) >= 3 then
    return 'rate_limited';
  end if;

  -- A leadet az ingatlan felelőse kapja, ha még aktív ügynök vagy irodavezető.
  select m.user_id into v_assignee
    from public.memberships m
   where m.organization_id = v_property.organization_id and m.user_id = v_property.responsible_agent_id
     and m.status = 'active' and m.role in ('owner', 'agent');

  insert into public.leads (organization_id, source, full_name, phone, phone_normalized, email, raw_message, property_id, assigned_to, consent_at)
  values (v_property.organization_id, 'public_page', v_name, v_phone, v_norm, v_email, v_message, v_property.id, v_assignee, now());
  return 'ok';
end;
$$;
revoke all on function public.submit_public_inquiry(text, text, text, text, text, boolean) from public, authenticated;
grant execute on function public.submit_public_inquiry(text, text, text, text, text, boolean) to anon;
