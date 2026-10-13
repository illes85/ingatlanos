-- Kulcs · 0008 · Storage: privát bucketek, elérés szervezeti mappa szerint
-- Útvonal-konvenció: {bucket}/{organization_id}/...  →  aláírt URL-ekkel szolgáljuk ki.
-- A nyilvános ingatlan-oldal a kiválasztott (is_public) fotókat szerveroldalon, aláírt URL-lel kapja.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('property-media', 'property-media', false, 15728640,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']),
  ('documents', 'documents', false, 26214400, array['application/pdf']),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function app.storage_org(object_name text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  return (storage.foldername(object_name))[1]::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function app.storage_org(text) to authenticated;

create policy "storage: tagok olvassák" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('property-media', 'avatars')
    and app.is_member(app.storage_org(name))
  );

create policy "storage: dokumentum olvasás" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and app.is_member(app.storage_org(name)));

create policy "storage: tagok feltöltenek" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('property-media', 'documents', 'avatars')
    and app.is_member(app.storage_org(name))
  );

create policy "storage: tagok módosítanak" on storage.objects
  for update to authenticated
  using (bucket_id in ('property-media', 'documents', 'avatars') and app.is_member(app.storage_org(name)))
  with check (bucket_id in ('property-media', 'documents', 'avatars') and app.is_member(app.storage_org(name)));

create policy "storage: owner töröl, feltöltő a sajátját" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('property-media', 'documents', 'avatars')
    and (app.has_role(app.storage_org(name), '{owner}') or owner_id = (select auth.uid())::text)
  );
