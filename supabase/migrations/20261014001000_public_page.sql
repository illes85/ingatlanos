-- Kulcs · 0018 · Nyilvános ingatlan-oldal
-- Névtelen (anon) látogató csak két szűk, security definer függvényen át éri el az adatot:
--   public.get_public_property(slug)      → csak a megosztásra szánt mezők (a cím a láthatósági szint szerint),
--   public.submit_public_inquiry(...)     → leadet hoz létre (szűrt, korlátozott beküldés).
-- A fotókhoz egyetlen szűk storage-olvasási policy kell: csak a „nyilvános” jelölésű fotó, bekapcsolt oldalú,
-- hirdetett ingatlanról. Táblákhoz az anon továbbra sem fér hozzá.

grant usage on schema app to anon;

-- A nyilvánosan megmutatható státuszok (piszkozat, eladott, visszavont stb. nem).
create or replace function app.public_status(p_status public.property_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('active', 'under_offer', 'reserved');
$$;
grant execute on function app.public_status(public.property_status) to anon, authenticated;

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
  );
$$;
grant execute on function app.public_media_visible(text) to anon, authenticated;

create policy "storage: nyilvános fotó" on storage.objects
  for select to anon
  using (bucket_id = 'property-media' and app.public_media_visible(name));

-- ---------------------------------------------------------------------------
-- Olvasás
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
    left join public.profiles pr on pr.id = p.responsible_agent_id
    left join public.organizations o on o.id = p.organization_id
   where p.public_slug = p_slug and p.public_enabled and app.public_status(p.status);
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('path', m.storage_path, 'caption', m.caption)
                            order by m.is_cover desc, m.sort_order, m.created_at), '[]'::jsonb)
    into v_photos
    from public.property_media m
   where m.property_id = r.id and m.kind = 'photo' and m.is_public and m.storage_path is not null;

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
    -- A cím a választott láthatósági szint szerint: a pontos adat nem hagyja el az adatbázist.
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
revoke all on function public.get_public_property(text) from public;
grant execute on function public.get_public_property(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Érdeklődés beküldése
-- ---------------------------------------------------------------------------
-- Visszatérés: 'ok' | 'not_found' | 'invalid' | 'rate_limited'.
create or replace function public.submit_public_inquiry(
  p_slug text,
  p_name text,
  p_phone text,
  p_phone_normalized text,
  p_email text,
  p_message text
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
  v_norm text := nullif(btrim(coalesce(p_phone_normalized, '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_assignee uuid;
begin
  select p.id, p.organization_id, p.responsible_agent_id
    into v_property
    from public.properties p
   where p.public_slug = p_slug and p.public_enabled and app.public_status(p.status);
  if not found then
    return 'not_found';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120
     or (v_phone is null and v_email is null)
     or (v_phone is not null and char_length(v_phone) > 40)
     or (v_norm is not null and char_length(v_norm) > 20)
     or (v_email is not null and (char_length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
     or (v_message is not null and char_length(v_message) > 2000) then
    return 'invalid';
  end if;

  -- Visszaélés ellen: ingatlanonként óránként legfeljebb 30, ugyanarról az elérhetőségről legfeljebb 3 beküldés.
  if (select count(*) from public.leads l
       where l.property_id = v_property.id and l.source = 'public_page' and l.created_at > now() - interval '1 hour') >= 30
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

  insert into public.leads (organization_id, source, full_name, phone, phone_normalized, email, raw_message, property_id, assigned_to)
  values (v_property.organization_id, 'public_page', v_name, v_phone, v_norm, v_email, v_message, v_property.id, v_assignee);
  return 'ok';
end;
$$;
revoke all on function public.submit_public_inquiry(text, text, text, text, text, text) from public;
grant execute on function public.submit_public_inquiry(text, text, text, text, text, text) to anon, authenticated;
