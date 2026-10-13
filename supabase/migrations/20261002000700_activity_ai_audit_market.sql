-- Kulcs · 0007 · Idővonal, értesítések, AI napló, kreditek, audit, piaci adatok

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type public.activity_type not null,
  actor_id uuid default auth.uid() references public.profiles (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index activities_contact_idx on public.activities (contact_id, occurred_at desc);
create index activities_property_idx on public.activities (property_id, occurred_at desc);
create index activities_deal_idx on public.activities (deal_id, occurred_at desc);
create index activities_org_idx on public.activities (organization_id, occurred_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  feature text not null,                               -- pl. ai.listing_writer
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  credits integer not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  is_mock boolean not null default false,
  created_at timestamptz not null default now()
);
create index ai_usage_org_idx on public.ai_usage (organization_id, created_at desc);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  delta integer not null,
  reason text not null,                                -- monthly_grant / purchase / ai_usage / adjustment
  ref_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index credit_ledger_org_idx on public.credit_ledger (organization_id, created_at desc);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,                                -- export / delete / anonymize / role_change …
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_idx on public.audit_log (organization_id, created_at desc);

-- Piaci m²-ár statisztika (globális, nem szervezethez kötött). Első körben seed/mock adat.
create table public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  district smallint,
  property_type public.property_type not null,
  period date not null,                                -- hónap első napja
  avg_price_per_sqm numeric(14, 0) not null,
  median_price_per_sqm numeric(14, 0),
  sample_size integer not null default 0,
  source text not null default 'mock',                 -- TODO(integráció): engedélyezett adatforrás
  unique (city, district, property_type, period)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.activities enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_usage enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.audit_log enable row level security;
alter table public.market_snapshots enable row level security;

-- Az idővonal-bejegyzés annyira látható, amennyire a hozzá kötött entitások (azok RLS-én át).
create policy "idővonal: olvasás" on public.activities
  for select to authenticated
  using (
    app.is_member(organization_id)
    and (contact_id is null or exists (select 1 from public.contacts c where c.id = contact_id))
    and (property_id is null or exists (select 1 from public.properties p where p.id = property_id))
    and (deal_id is null or exists (select 1 from public.deals d where d.id = deal_id))
  );
create policy "idővonal: létrehozás" on public.activities
  for insert to authenticated
  with check (app.is_member(organization_id) and actor_id = (select auth.uid()));

create policy "értesítés: saját" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "értesítés: olvasottra állítás" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- AI napló és kreditek: írás csak szerveroldalon (service role); olvasás owner / saját.
create policy "ai napló: olvasás" on public.ai_usage
  for select to authenticated
  using (app.has_role(organization_id, '{owner}') or user_id = (select auth.uid()));
create policy "kredit: owner olvassa" on public.credit_ledger
  for select to authenticated using (app.has_role(organization_id, '{owner}'));
create policy "audit: owner olvassa" on public.audit_log
  for select to authenticated using (app.has_role(organization_id, '{owner}'));

create policy "piaci adat: mindenki olvassa" on public.market_snapshots
  for select to authenticated using (true);

-- Audit bejegyzés írása bármely szerveroldali műveletből (a felhasználó nevében).
create or replace function public.write_audit(p_org uuid, p_action text, p_entity_type text,
                                              p_entity_id uuid, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_member(p_org) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_org, (select auth.uid()), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;
revoke execute on function public.write_audit(uuid, text, text, uuid, jsonb) from public, anon;
grant execute on function public.write_audit(uuid, text, text, uuid, jsonb) to authenticated;
