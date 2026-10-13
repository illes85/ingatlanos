-- Kulcs · 0003 · Ingatlanok, média, jutalékfeltételek

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,                                   -- pl. K-1042
  title text not null,
  transaction_type public.transaction_type not null default 'sale',
  property_type public.property_type not null,
  subtype text,                                         -- családi ház, ikerház, sorház, tégla lakás… (config/lookups)
  status public.property_status not null default 'draft',
  visibility public.record_visibility not null default 'office',
  responsible_agent_id uuid references public.profiles (id) on delete set null,
  seller_contact_id uuid,                               -- FK a contacts migrációban

  price numeric(14, 0) not null check (price >= 0),
  currency text not null default 'HUF',
  area_sqm numeric(8, 1) check (area_sqm > 0),
  price_per_sqm numeric(14, 0) generated always as (
    case when area_sqm > 0 then round(price / area_sqm) end
  ) stored,
  lot_sqm numeric(10, 1),
  rooms smallint check (rooms >= 0),
  half_rooms smallint not null default 0 check (half_rooms >= 0),
  bathrooms smallint,
  floor smallint,                                       -- 0 = földszint, -1 = szuterén
  building_floors smallint,
  has_elevator boolean,
  heating text,                                         -- config/lookups: heating
  building_material text,                               -- panel / tégla / csúsztatott zsalus …
  condition text,                                       -- config/lookups: condition
  year_built smallint,
  energy_rating public.energy_rating,
  balcony_sqm numeric(6, 1),
  has_terrace boolean not null default false,
  garden_connected boolean not null default false,
  parking text,                                         -- config/lookups: parking
  utilities_monthly numeric(10, 0),                     -- rezsi
  common_cost_monthly numeric(10, 0),                   -- közös költség
  description text,
  highlights text[] not null default '{}',

  postal_code text,
  city text not null,
  district smallint check (district between 1 and 23),  -- csak Budapestnél
  street text,
  house_number text,
  floor_door text,
  lat double precision,
  lng double precision,
  location extensions.geography(Point, 4326),
  address_visibility public.address_visibility not null default 'street',

  mandate_type public.mandate_type,
  mandate_start date,
  mandate_expires_at date,
  listed_at timestamptz,
  status_changed_at timestamptz not null default now(),

  public_slug text unique,
  public_enabled boolean not null default false,
  view_count integer not null default 0,

  search_text text generated always as (
    lower(code || ' ' || title || ' ' || city || ' ' || coalesce(street, ''))
  ) stored,

  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index properties_org_idx on public.properties (organization_id, status);
create index properties_agent_idx on public.properties (responsible_agent_id);
create index properties_location_idx on public.properties using gist (location);
create index properties_search_idx on public.properties using gin (search_text extensions.gin_trgm_ops);
create index properties_mandate_idx on public.properties (organization_id, mandate_expires_at);

create trigger properties_updated_at before update on public.properties
  for each row execute function app.set_updated_at();

-- Kód kiosztása szervezetenkénti sorszámból + geokód pont + státuszváltás időpontja
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
    update public.organizations set property_seq = property_seq + 1
    where id = new.organization_id
    returning property_seq into v_seq;
    new.code := 'K-' || v_seq;
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

create trigger properties_before_write before insert or update on public.properties
  for each row execute function app.properties_before_write();

-- Jutalékfeltételek külön táblában: az asszisztens szerepkör ezt nem látja.
create table public.property_commission_terms (
  property_id uuid primary key references public.properties (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  commission_pct numeric(5, 2) check (commission_pct between 0 and 100),
  commission_fixed numeric(14, 0),
  notes text,
  updated_at timestamptz not null default now()
);
create trigger property_commission_terms_updated_at before update on public.property_commission_terms
  for each row execute function app.set_updated_at();

create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  kind public.media_kind not null default 'photo',
  storage_path text,                                    -- privát bucket: property-media/{org}/{property}/…
  external_url text,                                    -- videó / 360 link
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  is_public boolean not null default true,              -- megjelenhet a nyilvános oldalon
  is_virtually_staged boolean not null default false,
  caption text,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index property_media_property_idx on public.property_media (property_id, sort_order);
create unique index property_media_one_cover on public.property_media (property_id) where is_cover;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.properties enable row level security;
alter table public.property_commission_terms enable row level security;
alter table public.property_media enable row level security;

-- Látható: az iroda közös állománya; a 'private' ingatlant csak a felelős és az owner látja.
create policy "ingatlan: olvasás" on public.properties
  for select to authenticated
  using (
    app.is_member(organization_id)
    and (
      visibility = 'office'
      or responsible_agent_id = (select auth.uid())
      or app.has_role(organization_id, '{owner}')
    )
  );

create policy "ingatlan: létrehozás" on public.properties
  for insert to authenticated
  with check (app.is_member(organization_id));

-- Módosítás: owner, a felelős ügynök, vagy az asszisztens (backoffice feltöltés) a közös állományban.
create policy "ingatlan: módosítás" on public.properties
  for update to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or responsible_agent_id = (select auth.uid())
    or (visibility = 'office' and app.has_role(organization_id, '{assistant}'))
  )
  with check (app.is_member(organization_id));

create policy "ingatlan: törlés csak owner" on public.properties
  for delete to authenticated
  using (app.has_role(organization_id, '{owner}'));

-- Jutalékfeltétel: owner mindent, ügynök a saját ingatlanáét; asszisztens semmit.
create policy "jutalékfeltétel: olvasás" on public.property_commission_terms
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (
      app.has_role(organization_id, '{agent}')
      and exists (
        select 1 from public.properties p
        where p.id = property_id and p.responsible_agent_id = (select auth.uid())
      )
    )
  );
create policy "jutalékfeltétel: írás" on public.property_commission_terms
  for all to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (
      app.has_role(organization_id, '{agent}')
      and exists (
        select 1 from public.properties p
        where p.id = property_id and p.responsible_agent_id = (select auth.uid())
      )
    )
  )
  with check (app.has_role(organization_id, '{owner,agent}'));

-- Média: az ingatlan láthatóságát örökli (a properties RLS-én keresztül).
create policy "média: olvasás" on public.property_media
  for select to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id));
create policy "média: írás" on public.property_media
  for all to authenticated
  using (app.is_member(organization_id) and exists (select 1 from public.properties p where p.id = property_id))
  with check (app.is_member(organization_id) and exists (select 1 from public.properties p where p.id = property_id));
