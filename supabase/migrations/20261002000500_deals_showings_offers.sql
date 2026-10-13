-- Kulcs · 0005 · Ügyletek (két pipeline), szakasztörténet, bemutatók, ajánlatok

create or replace function app.stage_matches_side(p_side public.deal_side, p_stage public.deal_stage)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_side
    when 'seller' then p_stage in ('acquisition', 'assessment', 'mandate_signed', 'listed',
                                   'offer', 'deposit', 'contract', 'closed')
    when 'buyer' then p_stage in ('new', 'needs_assessment', 'showings',
                                  'offer', 'financing', 'contract', 'closed')
  end;
$$;

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  side public.deal_side not null,
  stage public.deal_stage not null,
  status public.deal_status not null default 'open',
  title text,
  property_id uuid references public.properties (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  agent_id uuid references public.profiles (id) on delete set null,
  expected_value numeric(14, 0),
  probability smallint check (probability between 0 and 100),
  expected_close_date date,
  stage_entered_at timestamptz not null default now(),
  closed_at timestamptz,
  lost_reason text,
  notes text,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_stage_side_check check (app.stage_matches_side(side, stage))
);
create index deals_board_idx on public.deals (organization_id, side, status, stage);
create index deals_agent_idx on public.deals (agent_id);
create index deals_property_idx on public.deals (property_id);
create trigger deals_updated_at before update on public.deals
  for each row execute function app.set_updated_at();

create table public.deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  from_stage public.deal_stage,
  to_stage public.deal_stage not null,
  changed_by uuid default auth.uid() references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index deal_stage_history_deal_idx on public.deal_stage_history (deal_id, changed_at);

-- Szakaszváltás: időbélyeg + történet + zárás
create or replace function app.deals_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    new.stage_entered_at := now();
  end if;
  if new.stage = 'closed' and new.status = 'open' then
    new.status := 'won';
  end if;
  if new.status <> 'open' and new.closed_at is null then
    new.closed_at := now();
  end if;
  return new;
end;
$$;
create trigger deals_before_write before insert or update on public.deals
  for each row execute function app.deals_before_write();

create or replace function app.deals_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.property_status;
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    insert into public.deal_stage_history (organization_id, deal_id, from_stage, to_stage, changed_at)
    values (new.organization_id, new.id,
            case when tg_op = 'UPDATE' then old.stage end, new.stage, new.stage_entered_at);
  end if;

  -- Az ingatlan státusza az eladói ügylet szakaszát követi (DECISIONS.md: D-007)
  if new.side = 'seller' and new.property_id is not null
     and (tg_op = 'INSERT' or new.stage is distinct from old.stage or new.status is distinct from old.status) then
    v_status := case
      when new.status = 'lost' then null
      when new.stage in ('acquisition', 'assessment', 'mandate_signed') then 'draft'
      when new.stage = 'listed' then 'active'
      when new.stage = 'offer' then 'under_offer'
      when new.stage in ('deposit', 'contract') then 'reserved'
      when new.stage = 'closed' then 'sold'
    end;
    if v_status is not null then
      update public.properties p
      set status = case
            when v_status = 'sold' and p.transaction_type = 'rent' then 'rented'::public.property_status
            else v_status
          end
      where p.id = new.property_id and p.status is distinct from v_status;
    end if;
  end if;
  return null;
end;
$$;
create trigger deals_after_write after insert or update on public.deals
  for each row execute function app.deals_after_write();

create table public.showings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  buyer_contact_id uuid references public.contacts (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  agent_id uuid references public.profiles (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.showing_status not null default 'scheduled',
  feedback_rating smallint check (feedback_rating between 1 and 5),
  feedback_text text,
  feedback_requested_at timestamptz,
  notes text,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index showings_org_time_idx on public.showings (organization_id, starts_at);
create index showings_property_idx on public.showings (property_id, starts_at desc);
create index showings_agent_idx on public.showings (agent_id, starts_at);
create trigger showings_updated_at before update on public.showings
  for each row execute function app.set_updated_at();

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  buyer_contact_id uuid references public.contacts (id) on delete set null,
  parent_offer_id uuid references public.offers (id) on delete set null,
  kind public.offer_kind not null default 'offer',
  status public.offer_status not null default 'pending',
  amount numeric(14, 0) not null check (amount > 0),
  deposit_amount numeric(14, 0),                       -- foglaló
  deposit_deadline date,
  valid_until date,
  notes text,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index offers_property_idx on public.offers (property_id, created_at desc);
create index offers_deadline_idx on public.offers (organization_id, deposit_deadline);
create trigger offers_updated_at before update on public.offers
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- Ügylet: owner/asszisztens mindent; ügynök a sajátját, illetve a saját ingatlanához tartozót.
-- ---------------------------------------------------------------------------
alter table public.deals enable row level security;
alter table public.deal_stage_history enable row level security;
alter table public.showings enable row level security;
alter table public.offers enable row level security;

create or replace function app.can_see_deal(p_org uuid, p_agent uuid, p_property uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.has_role(p_org, '{owner,assistant}')
      or (app.is_member(p_org) and (
            p_agent = (select auth.uid())
            or exists (select 1 from public.properties p
                       where p.id = p_property and p.responsible_agent_id = (select auth.uid()))
         ));
$$;
grant execute on function app.can_see_deal(uuid, uuid, uuid) to authenticated;

create policy "ügylet: olvasás" on public.deals
  for select to authenticated
  using (app.can_see_deal(organization_id, agent_id, property_id));
create policy "ügylet: létrehozás" on public.deals
  for insert to authenticated
  with check (app.has_role(organization_id, '{owner,agent}'));
create policy "ügylet: módosítás" on public.deals
  for update to authenticated
  using (app.has_role(organization_id, '{owner}') or agent_id = (select auth.uid()))
  with check (app.is_member(organization_id));
create policy "ügylet: törlés csak owner" on public.deals
  for delete to authenticated
  using (app.has_role(organization_id, '{owner}'));

create policy "szakasztörténet: ügyleten keresztül" on public.deal_stage_history
  for select to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id));

create policy "bemutató: olvasás" on public.showings
  for select to authenticated
  using (app.can_see_deal(organization_id, agent_id, property_id));
create policy "bemutató: létrehozás" on public.showings
  for insert to authenticated
  with check (app.is_member(organization_id));
create policy "bemutató: módosítás" on public.showings
  for update to authenticated
  using (app.can_see_deal(organization_id, agent_id, property_id))
  with check (app.is_member(organization_id));
create policy "bemutató: törlés" on public.showings
  for delete to authenticated
  using (app.has_role(organization_id, '{owner}') or agent_id = (select auth.uid()));

create policy "ajánlat: olvasás" on public.offers
  for select to authenticated
  using (
    app.has_role(organization_id, '{owner,assistant}')
    or (deal_id is not null and exists (select 1 from public.deals d where d.id = deal_id))
    or exists (select 1 from public.properties p
               where p.id = property_id and p.responsible_agent_id = (select auth.uid()))
  );
create policy "ajánlat: írás" on public.offers
  for all to authenticated
  using (
    app.has_role(organization_id, '{owner}')
    or (deal_id is not null and exists (select 1 from public.deals d
                                         where d.id = deal_id and d.agent_id = (select auth.uid())))
    or exists (select 1 from public.properties p
               where p.id = property_id and p.responsible_agent_id = (select auth.uid()))
  )
  with check (app.has_role(organization_id, '{owner,agent}'));
