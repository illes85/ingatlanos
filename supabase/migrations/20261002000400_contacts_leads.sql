-- Kulcs · 0004 · Ügyfelek, keresési profilok, ajánlások, leadek

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_agent_id uuid references public.profiles (id) on delete set null,
  last_name text not null default '',
  first_name text not null default '',
  full_name text generated always as (trim(last_name || ' ' || first_name)) stored,  -- magyar névsorrend
  company text,
  email text,
  phone text,
  phone_normalized text,                               -- E.164, duplikátum-felismeréshez
  roles public.contact_role[] not null default '{}',
  source public.lead_source,
  source_detail text,
  tags text[] not null default '{}',
  notes text,
  postal_address text,
  gdpr_consent_at timestamptz,
  gdpr_consent_scope text[] not null default '{}',     -- pl. {kapcsolattartas, ajanlatkuldes, hirlevel}
  gdpr_notice_version text,
  pmt_status public.pmt_status not null default 'not_started',   -- TODO(jogász): Pmt. tartalom ellenőrzése
  pmt_risk_level public.risk_level,
  pmt_checked_at timestamptz,
  pmt_next_review_at date,
  last_contacted_at timestamptz,
  anonymized_at timestamptz,
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_org_idx on public.contacts (organization_id, owner_agent_id);
create index contacts_phone_idx on public.contacts (organization_id, phone_normalized);
create index contacts_email_idx on public.contacts (organization_id, lower(email));
create index contacts_name_idx on public.contacts using gin (lower(full_name) extensions.gin_trgm_ops);
create trigger contacts_updated_at before update on public.contacts
  for each row execute function app.set_updated_at();

alter table public.properties
  add constraint properties_seller_contact_fk
  foreign key (seller_contact_id) references public.contacts (id) on delete set null;

create table public.search_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  name text,
  transaction_type public.transaction_type not null default 'sale',
  property_types public.property_type[] not null default '{}',
  cities text[] not null default '{}',
  districts smallint[] not null default '{}',
  area extensions.geography(Polygon, 4326),            -- rajzolt keresési terület
  price_min numeric(14, 0),
  price_max numeric(14, 0),
  area_min numeric(8, 1),
  area_max numeric(8, 1),
  rooms_min smallint,
  must_have text[] not null default '{}',
  nice_to_have text[] not null default '{}',
  financing text[] not null default '{}',              -- lookup_values: financing
  mortgage_approved boolean not null default false,
  urgency public.urgency not null default 'medium',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index search_profiles_contact_idx on public.search_profiles (contact_id);
create index search_profiles_org_idx on public.search_profiles (organization_id) where active;
create trigger search_profiles_updated_at before update on public.search_profiles
  for each row execute function app.set_updated_at();

-- „Mit kapott már meg tőlünk” – ki melyik ingatlant kapta ajánlásként
create table public.property_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  channel text not null default 'email',
  sent_by uuid default auth.uid() references public.profiles (id) on delete set null,
  sent_at timestamptz not null default now(),
  reaction text check (reaction in ('interested', 'not_interested', 'no_response'))
);
create index property_recommendations_contact_idx on public.property_recommendations (contact_id, sent_at desc);
create index property_recommendations_property_idx on public.property_recommendations (property_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  source public.lead_source not null default 'manual',
  source_detail text,                                  -- pl. portál neve
  raw_message text,
  full_name text,
  email text,
  phone text,
  phone_normalized text,
  property_id uuid references public.properties (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  status public.lead_status not null default 'new',
  urgent boolean not null default false,
  ai_score smallint check (ai_score between 0 and 100),
  ai_score_reason text,
  received_at timestamptz not null default now(),
  read_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_org_status_idx on public.leads (organization_id, status, received_at desc);
create index leads_assigned_idx on public.leads (assigned_to);
create index leads_phone_idx on public.leads (organization_id, phone_normalized);
create trigger leads_updated_at before update on public.leads
  for each row execute function app.set_updated_at();

-- Szerkeszthető választólisták (pl. finanszírozási formák – a támogatások változnak).
-- organization_id = null: globális alapérték; szervezet saját elemet vehet fel.
create table public.lookup_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,  -- null = globális
  category text not null,
  key text not null,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);
create unique index lookup_values_unique on public.lookup_values
  (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), category, key);

insert into public.lookup_values (category, key, label, sort_order) values
  ('financing', 'cash', 'Készpénz', 10),
  ('financing', 'mortgage', 'Lakáshitel', 20),
  ('financing', 'csok_plusz', 'CSOK Plusz', 30),
  ('financing', 'otthon_start', 'Otthon Start', 40),
  ('financing', 'other', 'Egyéb', 90);

-- ---------------------------------------------------------------------------
-- RLS
-- Ügyfél: owner és asszisztens mindent lát; ügynök csak a sajátját.
-- Más ügynök ügyfeléről csak név + felelős érhető el a contact_directory() függvényen át.
-- ---------------------------------------------------------------------------
alter table public.contacts enable row level security;
alter table public.search_profiles enable row level security;
alter table public.property_recommendations enable row level security;
alter table public.leads enable row level security;
alter table public.lookup_values enable row level security;

create policy "ügyfél: olvasás" on public.contacts
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (app.is_member(organization_id) and owner_agent_id = (select auth.uid()))
  );
create policy "ügyfél: létrehozás" on public.contacts
  for insert to authenticated
  with check (app.is_member(organization_id));
create policy "ügyfél: módosítás" on public.contacts
  for update to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (app.is_member(organization_id) and owner_agent_id = (select auth.uid()))
  )
  with check (app.is_member(organization_id));
create policy "ügyfél: törlés csak owner" on public.contacts
  for delete to authenticated
  using (app.has_role(organization_id, '{owner}'));

-- A gyerektáblák a szülő ügyfél láthatóságát öröklik.
create policy "keresési profil: ügyfélen keresztül" on public.search_profiles
  for all to authenticated
  using (exists (select 1 from public.contacts c where c.id = contact_id))
  with check (app.is_member(organization_id) and exists (select 1 from public.contacts c where c.id = contact_id));

create policy "ajánlás: ügyfélen keresztül" on public.property_recommendations
  for all to authenticated
  using (exists (select 1 from public.contacts c where c.id = contact_id))
  with check (app.is_member(organization_id) and exists (select 1 from public.contacts c where c.id = contact_id));

-- Lead: owner/asszisztens mindent; ügynök a hozzá rendelt és a még kiosztatlan leadeket.
create policy "lead: olvasás" on public.leads
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (app.is_member(organization_id) and (assigned_to is null or assigned_to = (select auth.uid())))
  );
create policy "lead: létrehozás" on public.leads
  for insert to authenticated
  with check (app.is_member(organization_id));
create policy "lead: módosítás" on public.leads
  for update to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (app.is_member(organization_id) and (assigned_to is null or assigned_to = (select auth.uid())))
  )
  with check (app.is_member(organization_id));
create policy "lead: törlés csak owner" on public.leads
  for delete to authenticated
  using (app.has_role(organization_id, '{owner}'));

create policy "lookup: globális vagy saját" on public.lookup_values
  for select to authenticated
  using (organization_id is null or app.is_member(organization_id));
create policy "lookup: owner kezeli" on public.lookup_values
  for all to authenticated
  using (organization_id is not null and app.has_role(organization_id, '{owner}'))
  with check (organization_id is not null and app.has_role(organization_id, '{owner}'));

-- ---------------------------------------------------------------------------
-- Névjegyzék és duplikátum-keresés személyes adatok nélkül
-- ---------------------------------------------------------------------------
create or replace function public.contact_directory(p_org uuid, p_query text default null, p_limit integer default 20)
returns table (
  id uuid,
  full_name text,
  roles public.contact_role[],
  owner_agent_id uuid,
  owner_name text,
  is_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.full_name, c.roles, c.owner_agent_id, p.full_name,
         c.owner_agent_id = (select auth.uid())
  from public.contacts c
  left join public.profiles p on p.id = c.owner_agent_id
  where c.organization_id = p_org
    and app.is_member(p_org)
    and c.deleted_at is null
    and c.anonymized_at is null
    and (p_query is null or lower(c.full_name) like '%' || lower(p_query) || '%')
  order by c.full_name
  limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.find_duplicate_contacts(p_org uuid, p_phone text, p_email text)
returns table (id uuid, full_name text, owner_agent_id uuid, owner_name text, match text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.full_name, c.owner_agent_id, p.full_name,
         case when p_phone is not null and c.phone_normalized = p_phone then 'phone' else 'email' end
  from public.contacts c
  left join public.profiles p on p.id = c.owner_agent_id
  where c.organization_id = p_org
    and app.is_member(p_org)
    and c.deleted_at is null
    and (
      (p_phone is not null and c.phone_normalized = p_phone)
      or (p_email is not null and lower(c.email) = lower(p_email))
    )
  limit 10;
$$;

revoke execute on function public.contact_directory(uuid, text, integer) from public, anon;
revoke execute on function public.find_duplicate_contacts(uuid, text, text) from public, anon;
grant execute on function public.contact_directory(uuid, text, integer) to authenticated;
grant execute on function public.find_duplicate_contacts(uuid, text, text) to authenticated;
