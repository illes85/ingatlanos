-- Kulcs · 0026 · Csomaglimit: aktív ingatlanok száma (Start: 15)
-- Az effektív csomag (próba alatt a próbacsomag) limitjénél többedik aktív ingatlan nem vehető fel / nem tehető aktívvá.
-- Minden útra érvényes (kliens, ügylet-szakasz trigger D-007, service role, seed). Csomag-visszaváltáskor a már aktívak
-- maradnak (nem kapcsoljuk ki őket), csak új aktiválás tilos, amíg a szám a limit alá nem megy.
-- security definer: a számlálás a hívó RLS-étől függetlenül a szervezet összes (más ügynök privát) ingatlanát nézi.

create or replace function app.properties_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if not app.is_listing_active(new.status) then
    return new;
  end if;
  if tg_op = 'UPDATE' and app.is_listing_active(old.status) then
    return new;                                       -- aktívon belüli váltás (pl. active → under_offer) szabad
  end if;

  v_limit := app.plan_limit(app.effective_plan(new.organization_id));
  if v_limit is null then
    return new;
  end if;

  -- Párhuzamos felvétel ellen a szervezet sorára várunk (no key update: az FK-ellenőrzéseket nem blokkolja),
  -- és a zár után újraszámolunk (READ COMMITTED: az utasítás új pillanatképet lát).
  perform 1 from public.organizations o where o.id = new.organization_id for no key update;
  v_limit := app.plan_limit(app.effective_plan(new.organization_id));
  if v_limit is null then
    return new;
  end if;

  -- A státuszlista egyezzen app.is_listing_active-val (literál, hogy a properties_org_idx használható legyen).
  select count(*) into v_count
  from public.properties p
  where p.organization_id = new.organization_id
    and p.status in ('active', 'under_offer', 'reserved')
    and p.id <> new.id;

  if v_count >= v_limit then
    raise exception 'plan_limit_reached' using errcode = 'P0001',
      detail = format('active_listings=%s limit=%s', v_count, v_limit),
      hint = 'upgrade';
  end if;
  return new;
end;
$$;
revoke all on function app.properties_plan_limit() from public, anon, authenticated;

-- A BEFORE triggerek névsorrendben futnak: before_write → guard_assignment → insert_guard → plan_limit → updated_at.
create trigger properties_plan_limit before insert or update of status on public.properties
  for each row execute function app.properties_plan_limit();

-- Aktív ingatlanok száma a csomagoldalhoz: a szervezet tagja láthatja a számot (a más ügynök privát ingatlana is
-- beleszámít a limitbe, ezért kell security definer), tartalmat nem ad ki.
create or replace function public.active_listing_count(p_org uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.properties p
  where p.organization_id = p_org
    and p.status in ('active', 'under_offer', 'reserved')
    and app.is_member(p_org);
$$;
revoke all on function public.active_listing_count(uuid) from public, anon;
grant execute on function public.active_listing_count(uuid) to authenticated;
