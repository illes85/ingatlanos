-- Kulcs · 0002 · Szervezetek, profilok, tagságok + RLS segédfüggvények

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  type public.org_type not null,
  slug text not null unique,
  plan public.plan_tier not null default 'start',
  trial_plan public.plan_tier,
  trial_ends_at timestamptz,
  ai_credit_balance integer not null default 0,
  ai_credit_monthly integer not null default 10,
  brand_color text,
  logo_path text,
  property_seq integer not null default 1000,
  settings jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_path text,
  license_number text,              -- ingatlanközvetítői névjegyzéki szám
  monthly_commission_goal numeric(14, 0),
  active_organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'agent',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id) where status = 'active';

create trigger organizations_updated_at before update on public.organizations
  for each row execute function app.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function app.set_updated_at();
create trigger memberships_updated_at before update on public.memberships
  for each row execute function app.set_updated_at();

-- Új auth felhasználó → profil
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS segédfüggvények. security definer + üres search_path, hogy a memberships
-- tábla saját RLS-e ne okozzon rekurziót, és ne lehessen a search_path-szal trükközni.
-- ---------------------------------------------------------------------------

create or replace function app.is_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function app.has_role(org uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any (roles)
  );
$$;

create or replace function app.shares_org_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid()) and mine.status = 'active'
      and theirs.user_id = other_user and theirs.status = 'active'
  );
$$;

grant execute on function app.is_member(uuid) to authenticated;
grant execute on function app.has_role(uuid, public.member_role[]) to authenticated;
grant execute on function app.shares_org_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

create policy "org: tagok látják" on public.organizations
  for select to authenticated using (app.is_member(id));
create policy "org: tulajdonos módosítja" on public.organizations
  for update to authenticated
  using (app.has_role(id, '{owner}')) with check (app.has_role(id, '{owner}'));
-- Létrehozás csak a create_organization() függvényen keresztül.

create policy "profil: saját és kollégák" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or app.shares_org_with(id));
create policy "profil: csak a saját módosítható" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "tagság: szervezeten belül látható" on public.memberships
  for select to authenticated using (app.is_member(organization_id));
create policy "tagság: tulajdonos kezeli" on public.memberships
  for all to authenticated
  using (app.has_role(organization_id, '{owner}'))
  with check (app.has_role(organization_id, '{owner}'));

-- A szerepkört és a szervezetet a felhasználó maga nem írhatja át a profilján keresztül:
-- a profiles táblán nincs role oszlop, a memberships-et csak owner módosíthatja.

-- ---------------------------------------------------------------------------
-- Onboarding: szervezet létrehozása (egyéni / iroda). 14 napos Pro AI próbaidő.
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(p_name text, p_type public.org_type)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_org uuid;
  v_slug text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(trim(p_name)) < 2 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.organizations (name, type, slug, plan, trial_plan, trial_ends_at,
                                    ai_credit_balance, ai_credit_monthly)
  values (trim(p_name), p_type, v_slug, 'start', 'pro_ai', now() + interval '14 days', 400, 10)
  returning id into v_org;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org, v_user, 'owner');

  update public.profiles set active_organization_id = v_org where id = v_user;

  return v_org;
end;
$$;

revoke execute on function public.create_organization(text, public.org_type) from public, anon;
grant execute on function public.create_organization(text, public.org_type) to authenticated;
