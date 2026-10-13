-- Kulcs · 0010 · Ingatlankód kiosztása ütközésállóan
-- A szervezeti számláló egy már kiosztott (pl. kézzel vagy a demó által felvitt) kódra is érhet; ilyenkor továbblépünk.

create or replace function app.properties_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seq integer;
begin
  if tg_op = 'INSERT' and (new.code is null or new.code = '') then
    loop
      update public.organizations set property_seq = property_seq + 1
      where id = new.organization_id
      returning property_seq into v_seq;
      new.code := 'K-' || v_seq;
      exit when not exists (
        select 1 from public.properties p where p.organization_id = new.organization_id and p.code = new.code
      );
    end loop;
  end if;

  if new.lat is not null and new.lng is not null then
    new.location := extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  else
    new.location := null;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.status_changed_at := now();
    if new.status = 'active' and old.listed_at is null then
      new.listed_at := now();
    end if;
  end if;

  return new;
end;
$$;
