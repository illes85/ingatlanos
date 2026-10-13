-- Kulcs · 0006 · Feladatok, naptár, dokumentumok, jutalékok

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  assignee_id uuid references public.profiles (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'open',
  recurrence_rule text,                                -- RFC 5545 RRULE, pl. FREQ=WEEKLY;BYDAY=MO
  completed_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_assignee_idx on public.tasks (assignee_id, status, due_at);
create index tasks_org_idx on public.tasks (organization_id, status, due_at);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function app.set_updated_at();

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.event_kind not null default 'other',
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  owner_id uuid references public.profiles (id) on delete set null,
  showing_id uuid references public.showings (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  external_provider text,                              -- TODO(integráció): Google Naptár szinkron
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calendar_events_owner_idx on public.calendar_events (owner_id, starts_at);
create index calendar_events_org_idx on public.calendar_events (organization_id, starts_at);
create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute function app.set_updated_at();

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,  -- null = globális sablon
  kind public.document_kind not null,
  name text not null,
  body text not null default '',                       -- sablon {{mezőnevekkel}}
  version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger document_templates_updated_at before update on public.document_templates
  for each row execute function app.set_updated_at();

insert into public.document_templates (kind, name) values
  ('mandate_agreement', 'Közvetítői megbízási szerződés'),
  ('showing_sheet', 'Bemutatási lap / megtekintési nyilatkozat'),
  ('reservation_precontract', 'Foglaló-előszerződés vázlat'),
  ('pmt_form', 'Pmt. ügyfélátvilágítási adatlap'),     -- TODO(jogász): tartalom ellenőrzése
  ('handover_protocol', 'Átadás-átvételi jegyzőkönyv');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid references public.document_templates (id) on delete set null,
  kind public.document_kind not null,
  title text not null,
  property_id uuid references public.properties (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  storage_path text,                                   -- privát bucket: documents/{org}/…
  status public.document_status not null default 'draft',
  data jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_org_idx on public.documents (organization_id, created_at desc);
create index documents_property_idx on public.documents (property_id);
create trigger documents_updated_at before update on public.documents
  for each row execute function app.set_updated_at();

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  gross_amount numeric(14, 0) not null check (gross_amount >= 0),
  currency text not null default 'HUF',
  status public.commission_status not null default 'expected',
  office_share_pct numeric(5, 2) not null default 0 check (office_share_pct between 0 and 100),
  expected_date date,
  earned_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commissions_org_idx on public.commissions (organization_id, status, earned_at);
create trigger commissions_updated_at before update on public.commissions
  for each row execute function app.set_updated_at();

create table public.commission_splits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  commission_id uuid not null references public.commissions (id) on delete cascade,
  agent_id uuid not null references public.profiles (id) on delete cascade,
  role public.split_role not null,
  pct numeric(5, 2) not null check (pct between 0 and 100),
  amount numeric(14, 0) not null,
  created_at timestamptz not null default now()
);
create index commission_splits_agent_idx on public.commission_splits (agent_id);
create index commission_splits_commission_idx on public.commission_splits (commission_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.document_templates enable row level security;
alter table public.documents enable row level security;
alter table public.commissions enable row level security;
alter table public.commission_splits enable row level security;

create policy "feladat: olvasás" on public.tasks
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (app.is_member(organization_id)
        and (assignee_id = (select auth.uid()) or created_by = (select auth.uid())))
  );
create policy "feladat: létrehozás" on public.tasks
  for insert to authenticated with check (app.is_member(organization_id));
create policy "feladat: módosítás" on public.tasks
  for update to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or assignee_id = (select auth.uid()) or created_by = (select auth.uid())
  )
  with check (app.is_member(organization_id));
create policy "feladat: törlés" on public.tasks
  for delete to authenticated
  using (app.has_role(organization_id, '{owner}') or created_by = (select auth.uid()));

-- Naptár: owner és asszisztens (ő szervezi a naptárt) mindent; ügynök a sajátját.
create policy "naptár: olvasás" on public.calendar_events
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (app.is_member(organization_id) and owner_id = (select auth.uid()))
  );
create policy "naptár: írás" on public.calendar_events
  for all to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (app.is_member(organization_id) and owner_id = (select auth.uid()))
  )
  with check (app.is_member(organization_id));

create policy "sablon: globális vagy saját" on public.document_templates
  for select to authenticated
  using (organization_id is null or app.is_member(organization_id));
create policy "sablon: owner kezeli" on public.document_templates
  for all to authenticated
  using (organization_id is not null and app.has_role(organization_id, '{owner}'))
  with check (organization_id is not null and app.has_role(organization_id, '{owner}'));

create policy "dokumentum: olvasás" on public.documents
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (app.is_member(organization_id) and (
          created_by = (select auth.uid())
          or exists (select 1 from public.properties p
                     where p.id = property_id and p.responsible_agent_id = (select auth.uid()))
          or exists (select 1 from public.deals d
                     where d.id = deal_id and d.agent_id = (select auth.uid()))
       ))
  );
create policy "dokumentum: írás" on public.documents
  for all to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (app.is_member(organization_id) and created_by = (select auth.uid()))
  )
  with check (app.is_member(organization_id));

-- Jutalék: owner mindent; ügynök azt, amiből neki is jár; asszisztens semmit.
create policy "jutalék: olvasás" on public.commissions
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (app.has_role(organization_id, '{agent}') and exists (
          select 1 from public.commission_splits s
          where s.commission_id = commissions.id and s.agent_id = (select auth.uid())))
  );
create policy "jutalék: owner kezeli" on public.commissions
  for all to authenticated
  using (app.has_role(organization_id, '{owner}'))
  with check (app.has_role(organization_id, '{owner}'));

create policy "jutalékrész: olvasás" on public.commission_splits
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (app.has_role(organization_id, '{agent}') and agent_id = (select auth.uid()))
  );
create policy "jutalékrész: owner kezeli" on public.commission_splits
  for all to authenticated
  using (app.has_role(organization_id, '{owner}'))
  with check (app.has_role(organization_id, '{owner}'));
