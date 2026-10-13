-- Kulcs · 0009 · Jogosultságok szigorítása az ingatlan-modul biztonsági átnézése nyomán (D-022)
-- Javítja: média írása/törlése más ügynök ingatlanán, storage felülírás/olvasás/törlés, jutalékfeltétel írása,
-- felelős és láthatóság szabad átírása, a borítókép nem atomi váltása.

-- ---------------------------------------------------------------------------
-- Segédfüggvények
-- ---------------------------------------------------------------------------

-- A storage útvonal második szelete az ingatlan azonosítója: {szervezet}/{ingatlan}/{fájl}.
create or replace function app.storage_property(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (storage.foldername(object_name))[2]::uuid;
exception when others then
  return null;
end;
$$;

-- Módosíthatja-e az ingatlant (és a hozzá tartozó médiát): ugyanaz a szabály, mint az "ingatlan: módosítás" policy.
-- A p_org megadásakor a szervezet is egyeznie kell az ingatlanéval (szervezetközi hivatkozás ellen).
create or replace function app.can_edit_property(p_property uuid, p_org uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.properties p
    where p.id = p_property
      and (p_org is null or p.organization_id = p_org)
      and app.is_member(p.organization_id)
      and (
        app.has_role(p.organization_id, '{owner}')
        or p.responsible_agent_id = (select auth.uid())
        or (p.visibility = 'office' and app.has_role(p.organization_id, '{assistant}'))
      )
  );
$$;

-- Kezelheti-e az ingatlan jutalékfeltételét: owner, vagy az ügynök a saját ingatlanán. Az asszisztens soha.
create or replace function app.can_manage_commission(p_property uuid, p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.properties p
    where p.id = p_property
      and p.organization_id = p_org
      and (
        app.has_role(p.organization_id, '{owner}')
        or (app.has_role(p.organization_id, '{agent}') and p.responsible_agent_id = (select auth.uid()))
      )
  );
$$;

-- Látja-e az ingatlant: a hívó jogával fut (security invoker), így a properties RLS-e dönt (privát ingatlan).
create or replace function app.can_see_property(p_property uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.properties p where p.id = p_property);
$$;

grant execute on function app.storage_property(text) to authenticated;
grant execute on function app.can_edit_property(uuid, uuid) to authenticated;
grant execute on function app.can_manage_commission(uuid, uuid) to authenticated;
grant execute on function app.can_see_property(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Média: írás csak az ingatlan módosítóinak, a saját szervezet útvonalaira
-- ---------------------------------------------------------------------------

drop policy "média: írás" on public.property_media;

create policy "média: felvétel" on public.property_media
  for insert to authenticated
  with check (app.can_edit_property(property_id, organization_id));
create policy "média: módosítás" on public.property_media
  for update to authenticated
  using (app.can_edit_property(property_id, organization_id))
  with check (app.can_edit_property(property_id, organization_id));
create policy "média: törlés" on public.property_media
  for delete to authenticated
  using (app.can_edit_property(property_id, organization_id));

alter table public.property_media
  add constraint property_media_path_in_org check (storage_path is null or storage_path like organization_id::text || '/%');

-- Borítókép váltása egyetlen utasításban (atomi), a hívó jogaival (RLS).
create or replace function public.set_property_cover(p_property uuid, p_media uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.property_media
  set is_cover = (id = p_media)
  where property_id = p_property
    and (is_cover or id = p_media)
    and exists (select 1 from public.property_media m where m.id = p_media and m.property_id = p_property);
$$;
grant execute on function public.set_property_cover(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Jutalékfeltétel: az írás is a felelősséghez és a szervezethez kötött (nem csak az olvasás)
-- ---------------------------------------------------------------------------

drop policy "jutalékfeltétel: írás" on public.property_commission_terms;

create policy "jutalékfeltétel: felvétel" on public.property_commission_terms
  for insert to authenticated
  with check (app.can_manage_commission(property_id, organization_id));
create policy "jutalékfeltétel: módosítás" on public.property_commission_terms
  for update to authenticated
  using (app.can_manage_commission(property_id, organization_id))
  with check (app.can_manage_commission(property_id, organization_id));
create policy "jutalékfeltétel: törlés" on public.property_commission_terms
  for delete to authenticated
  using (app.can_manage_commission(property_id, organization_id));

-- ---------------------------------------------------------------------------
-- Felelős és láthatóság: csak szervezeti ügynök lehet felelős, és csak az owner vagy a jelenlegi felelős váltja
-- ---------------------------------------------------------------------------

create or replace function app.properties_guard_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'Az ingatlan szervezete nem módosítható' using errcode = '42501';
  end if;

  if new.responsible_agent_id is not null
     and (tg_op = 'INSERT' or new.responsible_agent_id is distinct from old.responsible_agent_id) then
    if not exists (
      select 1 from public.memberships m
      where m.organization_id = new.organization_id
        and m.user_id = new.responsible_agent_id
        and m.status = 'active'
        and m.role in ('owner', 'agent')
    ) then
      raise exception 'A felelős csak a szervezet aktív ügynöke vagy irodavezetője lehet' using errcode = '23514';
    end if;
  end if;

  -- auth.uid() null: rendszerművelet (seed, service role) — azt nem korlátozzuk.
  if tg_op = 'UPDATE' and (select auth.uid()) is not null
     and (new.responsible_agent_id is distinct from old.responsible_agent_id or new.visibility is distinct from old.visibility)
     and not (app.has_role(old.organization_id, '{owner}') or old.responsible_agent_id = (select auth.uid())) then
    raise exception 'A felelős és a láthatóság módosítása az irodavezető vagy a jelenlegi felelős joga' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger properties_guard_assignment before insert or update on public.properties
  for each row execute function app.properties_guard_assignment();

-- ---------------------------------------------------------------------------
-- Storage: az útvonal szerinti ingatlan jogai döntenek; nincs felülírás
-- ---------------------------------------------------------------------------

drop policy "storage: tagok olvassák" on storage.objects;
drop policy "storage: dokumentum olvasás" on storage.objects;
drop policy "storage: tagok feltöltenek" on storage.objects;
drop policy "storage: tagok módosítanak" on storage.objects;
drop policy "storage: owner töröl, feltöltő a sajátját" on storage.objects;

-- Olvasás: fotó csak a látható ingatlanhoz (a 'seed' mappa a demó közös képkészlete); dokumentum a documents sor
-- láthatósága szerint (a documents tábla RLS-ét örökli); avatar a szervezet tagjainak.
create policy "storage: olvasás" on storage.objects
  for select to authenticated
  using (
    app.is_member(app.storage_org(name))
    and (
      bucket_id = 'avatars'
      or (bucket_id = 'property-media'
          and ((storage.foldername(name))[2] = 'seed' or app.can_see_property(app.storage_property(name))))
      or (bucket_id = 'documents'
          and exists (select 1 from public.documents d where d.storage_path = name))
    )
  );

create policy "storage: feltöltés" on storage.objects
  for insert to authenticated
  with check (
    app.is_member(app.storage_org(name))
    and (
      (bucket_id = 'property-media' and app.can_edit_property(app.storage_property(name), app.storage_org(name)))
      or bucket_id in ('documents', 'avatars')
    )
  );

-- Felülírás (upsert) csak a saját avatarra; a fotók és dokumentumok nem írhatók felül.
create policy "storage: avatar módosítás" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text and app.is_member(app.storage_org(name)))
  with check (bucket_id = 'avatars' and owner_id = (select auth.uid())::text and app.is_member(app.storage_org(name)));

create policy "storage: törlés" on storage.objects
  for delete to authenticated
  using (
    (bucket_id = 'property-media' and app.can_edit_property(app.storage_property(name), app.storage_org(name)))
    or (
      bucket_id in ('documents', 'avatars')
      and (app.has_role(app.storage_org(name), '{owner}') or owner_id = (select auth.uid())::text)
    )
  );
