-- Kulcs · 0024 · 2. fázis: előfizetések, számlázási események, kreditzsebek
--  1) subscriptions: szervezetenként legfeljebb egy élő (active / past_due) előfizetés; csak az owner olvassa, kliens nem ír;
--  2) billing_events: webhook-idempotencia (provider + event_id egyedi); kliens nem éri el;
--  3) kredit két zsebben: havi keret (ai_credit_balance, nem vihető át) + vásárolt (ai_credit_purchased, nem jár le);
--     keretidőszak (ai_credit_period) és az időszakban már jóváírt legnagyobb keret (ai_credit_period_granted);
--  4) credit_ledger: idempotencia-index, a vásárolt zseb része, nyitó egyenleg a meglévő szervezeteknek.
-- Írás mindenhol csak szerveroldali (service role) függvényen át (D-036).

-- Determinisztikus uuid szöveges kulcsból (Stripe-azonosító, hónap). md5 → uuid: szabványos Postgres, nem kell uuid-ossp.
create or replace function app.det_uuid(p_key text)
returns uuid
language sql
immutable
strict
set search_path = ''
as $$
  select md5('kulcs:' || p_key)::uuid;
$$;
revoke all on function app.det_uuid(text) from public, anon, authenticated;
grant execute on function app.det_uuid(text) to service_role;

create type public.billing_interval as enum ('month', 'year');
create type public.billing_provider as enum ('mock', 'stripe');
-- Stripe-leképezés (TS): trialing → active; unpaid, incomplete_expired → canceled.
create type public.subscription_status as enum ('incomplete', 'active', 'past_due', 'canceled');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan public.plan_tier not null,
  billing_interval public.billing_interval not null default 'month',
  seats integer not null default 1 check (seats between 1 and 500),
  status public.subscription_status not null default 'incomplete',
  provider public.billing_provider not null,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,   -- lemondás az időszak végén; addig a csomag él
  canceled_at timestamptz,
  provider_synced_at timestamptz,                        -- a legutóbb alkalmazott szolgáltatói esemény ideje (a Stripe `event.created`; sorrenden kívüli webhook ellen)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_paid_plan check (plan <> 'start'),
  constraint subscriptions_seats_office check (plan = 'office' or seats = 1),
  constraint subscriptions_stripe_ref check (provider <> 'stripe' or provider_subscription_id is not null),
  constraint subscriptions_period_order check (
    current_period_start is null or current_period_end is null or current_period_end > current_period_start),
  constraint subscriptions_provider_ref unique (provider, provider_subscription_id)
);
create unique index subscriptions_one_live_per_org on public.subscriptions (organization_id)
  where status in ('active', 'past_due');
create index subscriptions_org_idx on public.subscriptions (organization_id, created_at desc);
create index subscriptions_customer_idx on public.subscriptions (provider, provider_customer_id)
  where provider_customer_id is not null;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function app.set_updated_at();

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider public.billing_provider not null,
  event_id text not null check (char_length(event_id) between 1 and 255),
  type text not null,
  organization_id uuid references public.organizations (id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  unique (provider, event_id)
);
create index billing_events_org_idx on public.billing_events (organization_id, received_at desc)
  where organization_id is not null;
create index billing_events_unprocessed_idx on public.billing_events (received_at) where processed_at is null;

alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;

create policy "előfizetés: owner olvassa" on public.subscriptions
  for select to authenticated using (app.has_role(organization_id, '{owner}'));
-- Írás csak a service role-nak (apply_plan_change); a Supabase alapjogait visszavesszük.
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
-- Számlázási esemény: nincs policy, nincs jog — csak a service role látja.
revoke all on public.billing_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Kreditzsebek a szervezeten
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column ai_credit_purchased integer not null default 0,
  add column ai_credit_period date not null default (date_trunc('month', now() at time zone 'Europe/Budapest'))::date,
  add column ai_credit_period_granted integer not null default 0;

alter table public.organizations
  add constraint organizations_credits_nonnegative check (
    ai_credit_balance >= 0 and ai_credit_purchased >= 0 and ai_credit_monthly >= 0 and ai_credit_period_granted >= 0
  ) not valid;
alter table public.organizations validate constraint organizations_credits_nonnegative;

-- Meglévő szervezetek: az időszakban jóváírt keret legalább a mostani egyenleg (a próba 400-a is),
-- hogy egy csomagváltás ne írjon jóvá még egyszer.
update public.organizations
   set ai_credit_period_granted = greatest(ai_credit_monthly, ai_credit_balance);

-- ---------------------------------------------------------------------------
-- Kreditnapló
-- ---------------------------------------------------------------------------
alter table public.credit_ledger
  add column delta_purchased integer not null default 0,           -- a delta vásárolt zsebre eső része
  add column ai_usage_id uuid references public.ai_usage (id) on delete set null;
alter table public.credit_ledger
  add constraint credit_ledger_reason_known check (reason in (
    'opening_balance', 'trial_grant', 'trial_expire', 'monthly_grant', 'monthly_expire',
    'plan_change_grant', 'plan_change_expire', 'purchase', 'purchase_refund', 'adjustment',
    'ai_usage', 'ai_refund'
  )) not valid,
  add constraint credit_ledger_purchased_part check (
    abs(delta_purchased) <= abs(delta) and (delta_purchased = 0 or sign(delta_purchased) = sign(delta))
  );

create unique index credit_ledger_idempotency_key on public.credit_ledger (organization_id, reason, ref_id)
  where ref_id is not null;
create index credit_ledger_ai_usage_idx on public.credit_ledger (ai_usage_id) where ai_usage_id is not null;

-- Nyitó egyenleg: a napló összege ettől kezdve egyezik a két zseb összegével.
insert into public.credit_ledger (organization_id, delta, reason, ref_id)
select o.id,
       (o.ai_credit_balance + o.ai_credit_purchased - coalesce(l.total, 0))::integer,
       'opening_balance',
       app.det_uuid('opening:' || o.id::text)
from public.organizations o
left join (select organization_id, sum(delta) as total from public.credit_ledger group by organization_id) l
  on l.organization_id = o.id
where o.ai_credit_balance + o.ai_credit_purchased <> coalesce(l.total, 0)
on conflict (organization_id, reason, ref_id) where ref_id is not null do nothing;

-- Kreditnaplóba és AI-naplóba kliens nem írhat (eddig csak a policy hiánya védte).
revoke all on public.credit_ledger, public.ai_usage from anon;
revoke insert, update, delete, truncate on public.credit_ledger, public.ai_usage from authenticated;

-- Védőháló: a D-036 oszlopszintű jog az új oszlopokra is áll (kliens nem írhat csomagot/kreditet/próbát).
do $$
declare
  c text;
begin
  foreach c in array array['plan', 'trial_plan', 'trial_ends_at', 'ai_credit_balance', 'ai_credit_monthly',
                           'ai_credit_purchased', 'ai_credit_period', 'ai_credit_period_granted', 'is_demo'] loop
    if has_column_privilege('authenticated', 'public.organizations', c, 'UPDATE')
       or has_column_privilege('anon', 'public.organizations', c, 'UPDATE') then
      raise exception 'A kliens írhatja az organizations.% oszlopot', c;
    end if;
  end loop;
end $$;
