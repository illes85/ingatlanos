-- Kulcs · 0025 · 2. fázis: csomag- és kreditfüggvények
--  Csak szerveroldalról (service role) hívhatók; a kliens csak olvas (D-036).
--  SZINKRONBAN TARTANDÓ a TS konfiggal (src/config/plans.ts, src/lib/auth/session.ts):
--    app.plan_limit ↔ PLAN_LIMITS.activeListings; app.plan_monthly_credits ↔ PLAN_LIMITS.aiCreditsMonthly (Iroda: /fő);
--    app.effective_plan ↔ getAppContext().effectivePlan; app.is_listing_active ↔ az „aktív ingatlan” státuszlista.
--  Az egyezést a billing_plan_config() + teszt ellenőrzi.

create or replace function app.plan_limit(p_plan public.plan_tier)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'start' then 15 end;          -- null = korlátlan
$$;

create or replace function app.plan_monthly_credits(p_plan public.plan_tier, p_seats integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'start' then 10
    when 'pro' then 50
    when 'pro_ai' then 400
    when 'office' then 300 * greatest(coalesce(p_seats, 1), 1)
  end;
$$;

-- Aktív (hirdetett) ingatlan: active / under_offer / reserved. Nem számít: draft, sold, rented, withdrawn, expired.
create or replace function app.is_listing_active(p_status public.property_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('active', 'under_offer', 'reserved');
$$;

-- Effektív csomag: próba alatt a próbacsomag, különben az előfizetett.
create or replace function app.effective_plan(p_org uuid)
returns public.plan_tier
language sql
stable
security definer
set search_path = ''
as $$
  select case when o.trial_plan is not null and o.trial_ends_at > now() then o.trial_plan else o.plan end
  from public.organizations o
  where o.id = p_org;
$$;

-- A TS-konfiggal való egyezés tesztjéhez.
create or replace function public.billing_plan_config()
returns table (plan public.plan_tier, active_listing_limit integer, monthly_credits_per_seat integer)
language sql
stable
set search_path = ''
as $$
  select p, app.plan_limit(p), app.plan_monthly_credits(p, 1)
  from unnest(enum_range(null::public.plan_tier)) as p;
$$;

-- ---------------------------------------------------------------------------
-- Keretidőszak. A hívó már zárolta a szervezet sorát (for no key update).
-- ---------------------------------------------------------------------------

-- Új keretidőszak: a havi zseb maradéka elvész, a keret újra jóváíródik; a vásárolt zseb érintetlen.
-- Hónaponként egyszer: a monthly_grant sor determinisztikus ref_id-ja az idempotencia kulcsa.
create or replace function app.credit_reset_period(p_org uuid, p_expire_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := (date_trunc('month', now() at time zone 'Europe/Budapest'))::date;
  v_balance integer;
  v_monthly integer;
  v_grant uuid;
begin
  select o.ai_credit_balance, o.ai_credit_monthly into v_balance, v_monthly
  from public.organizations o where o.id = p_org;

  insert into public.credit_ledger (organization_id, delta, reason, ref_id)
  values (p_org, v_monthly, 'monthly_grant',
          app.det_uuid('monthly:' || p_org::text || ':' || to_char(v_month, 'YYYY-MM')))
  on conflict (organization_id, reason, ref_id) where ref_id is not null do nothing
  returning id into v_grant;

  if v_grant is null then
    -- Erre a hónapra már volt jóváírás: újra nem írunk jóvá, csak a keretre vágunk.
    if v_balance > v_monthly then
      insert into public.credit_ledger (organization_id, delta, reason)
      values (p_org, v_monthly - v_balance, p_expire_reason);
    end if;
    update public.organizations
       set ai_credit_balance = least(ai_credit_balance, v_monthly),
           ai_credit_period = v_month,
           ai_credit_period_granted = greatest(ai_credit_period_granted, v_monthly)
     where id = p_org;
    return;
  end if;

  if v_balance > 0 then
    insert into public.credit_ledger (organization_id, delta, reason)
    values (p_org, -v_balance, p_expire_reason);
  end if;
  update public.organizations
     set ai_credit_balance = v_monthly, ai_credit_period = v_month, ai_credit_period_granted = v_monthly
   where id = p_org;
end;
$$;

-- Esedékes-e időszakzárás: lejárt próba vagy hónapforduló. Próba alatt a próba jóváírása a keret.
create or replace function app.settle_credit_period(p_org uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := (date_trunc('month', now() at time zone 'Europe/Budapest'))::date;
  v_trial_plan public.plan_tier;
  v_trial_ends timestamptz;
  v_period date;
begin
  select o.trial_plan, o.trial_ends_at, o.ai_credit_period into v_trial_plan, v_trial_ends, v_period
  from public.organizations o where o.id = p_org;
  if not found then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;

  if v_trial_plan is not null then
    if coalesce(v_trial_ends > now(), false) then
      return false;
    end if;
    update public.organizations set trial_plan = null where id = p_org;   -- trial_ends_at marad: „volt próba”
    perform app.credit_reset_period(p_org, 'trial_expire');
    return true;
  end if;

  if v_period >= v_month then
    return false;
  end if;
  perform app.credit_reset_period(p_org, 'monthly_expire');
  return true;
end;
$$;

-- Mock előfizetés: nincs webhook, ezért lustán görgetjük / zárjuk le az időszak végén.
-- A hívó már zárolta a szervezetet (zársorrend mindenhol: organizations → subscriptions).
create or replace function app.mock_subscription_tick(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_step interval;
begin
  select * into v_sub from public.subscriptions s
   where s.organization_id = p_org and s.provider = 'mock' and s.status in ('active', 'past_due')
     and s.current_period_end <= now()
   for update;
  if not found then
    return;
  end if;

  if v_sub.cancel_at_period_end then
    perform public.apply_plan_change(p_org, v_sub.plan, v_sub.billing_interval, v_sub.seats, 'canceled', 'mock',
                                     v_sub.provider_customer_id, v_sub.provider_subscription_id,
                                     v_sub.current_period_start, v_sub.current_period_end, true, now());
    return;
  end if;

  v_step := case v_sub.billing_interval when 'year' then interval '1 year' else interval '1 month' end;
  while v_sub.current_period_end <= now() loop
    v_sub.current_period_start := v_sub.current_period_end;
    v_sub.current_period_end := v_sub.current_period_end + v_step;
  end loop;
  update public.subscriptions
     set current_period_start = v_sub.current_period_start, current_period_end = v_sub.current_period_end
   where id = v_sub.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Nyilvános (service role) függvények
-- ---------------------------------------------------------------------------

-- Lusta havi jóváírás. Oldalbetöltésenként hívható: ha nincs teendő, zár és írás nélkül tér vissza.
create or replace function public.grant_monthly_credits_if_due(p_org uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := (date_trunc('month', now() at time zone 'Europe/Budapest'))::date;
  v_due boolean;
begin
  select (o.trial_plan is not null and not coalesce(o.trial_ends_at > now(), false))
      or (o.trial_plan is null and o.ai_credit_period < v_month)
      or exists (select 1 from public.subscriptions s
                  where s.organization_id = o.id and s.provider = 'mock'
                    and s.status in ('active', 'past_due') and s.current_period_end <= now())
    into v_due
    from public.organizations o where o.id = p_org;
  if v_due is null then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;
  if not v_due then
    return false;
  end if;

  perform 1 from public.organizations o where o.id = p_org for no key update;
  perform app.mock_subscription_tick(p_org);
  return app.settle_credit_period(p_org);
end;
$$;

-- Jóváírás (vásárlás, visszatérítés, korrekció, AI-visszatérítés). Idempotens: (org, reason, ref_id) egyedi.
-- Visszatérés: true = jóváírva, false = már feldolgozott ismétlés.
create or replace function public.grant_credits(p_org uuid, p_amount integer, p_reason text, p_ref_id uuid,
                                                p_created_by uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchased integer;
  v_delta integer;
  v_delta_purchased integer;
  v_id uuid;
begin
  if p_ref_id is null then
    raise exception 'ref_required' using errcode = '22023';
  end if;
  if p_reason is null or p_reason not in ('purchase', 'purchase_refund', 'adjustment', 'ai_refund') then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  select o.ai_credit_purchased into v_purchased from public.organizations o where o.id = p_org for no key update;
  if not found then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;
  perform app.settle_credit_period(p_org);

  if p_reason in ('purchase', 'adjustment') then
    v_delta := p_amount;
    v_delta_purchased := p_amount;                    -- nem jár le
  elsif p_reason = 'purchase_refund' then
    v_delta := -least(p_amount, v_purchased);         -- elköltött vásárolt kredit nem megy negatívba
    v_delta_purchased := v_delta;
  else
    -- ai_refund: pontosan az eredeti levonás, ugyanabba a zsebbe (ref_id = a levonás ref_id-ja).
    select -l.delta, -l.delta_purchased into v_delta, v_delta_purchased
    from public.credit_ledger l
    where l.organization_id = p_org and l.reason = 'ai_usage' and l.ref_id = p_ref_id;
    if not found then
      raise exception 'spend_not_found' using errcode = 'P0002';
    end if;
    if p_amount <> v_delta then
      raise exception 'invalid_amount' using errcode = '22023', detail = 'A visszatérítés az eredeti levonással egyezik';
    end if;
  end if;

  insert into public.credit_ledger (organization_id, delta, delta_purchased, reason, ref_id, created_by)
  values (p_org, v_delta, v_delta_purchased, p_reason, p_ref_id, p_created_by)
  on conflict (organization_id, reason, ref_id) where ref_id is not null do nothing
  returning id into v_id;
  if v_id is null then
    return false;
  end if;

  update public.organizations
     set ai_credit_purchased = ai_credit_purchased + v_delta_purchased,
         ai_credit_balance = ai_credit_balance + (v_delta - v_delta_purchased)
   where id = p_org;
  return true;
end;
$$;

-- Kreditköltés: atomi (szervezet-sorzár), előbb a havi, aztán a vásárolt zseb; nem megy negatívba.
-- ref_id-val idempotens (ismétléskor nem von le újra, replayed = true).
create or replace function public.spend_credits(
  p_org uuid,
  p_amount integer,
  p_feature text,
  p_user uuid,
  p_ref_id uuid default null,
  p_model text default null,
  p_input_tokens integer default 0,
  p_output_tokens integer default 0,
  p_cost_usd numeric default 0,
  p_is_mock boolean default false
)
returns table (usage_id uuid, monthly_left integer, purchased_left integer, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
  v_purchased integer;
  v_from_monthly integer;
  v_usage uuid;
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  if p_feature is null or char_length(p_feature) not between 1 and 80 then
    raise exception 'invalid_feature' using errcode = '22023';
  end if;
  if p_user is not null and not exists (
       select 1 from public.memberships m
       where m.organization_id = p_org and m.user_id = p_user and m.status = 'active') then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  perform 1 from public.organizations o where o.id = p_org for no key update;
  if not found then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;
  perform app.mock_subscription_tick(p_org);
  perform app.settle_credit_period(p_org);

  if p_ref_id is not null then
    select l.ai_usage_id into v_usage from public.credit_ledger l
     where l.organization_id = p_org and l.reason = 'ai_usage' and l.ref_id = p_ref_id;
    if found then
      return query
        select v_usage, o.ai_credit_balance, o.ai_credit_purchased, true
        from public.organizations o where o.id = p_org;
      return;
    end if;
  end if;

  select o.ai_credit_balance, o.ai_credit_purchased into v_balance, v_purchased
  from public.organizations o where o.id = p_org;
  if v_balance + v_purchased < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001',
      detail = format('available=%s required=%s', v_balance + v_purchased, p_amount);
  end if;
  v_from_monthly := least(v_balance, p_amount);

  update public.organizations
     set ai_credit_balance = ai_credit_balance - v_from_monthly,
         ai_credit_purchased = ai_credit_purchased - (p_amount - v_from_monthly)
   where id = p_org
  returning ai_credit_balance, ai_credit_purchased into v_balance, v_purchased;

  insert into public.ai_usage (organization_id, user_id, feature, model, input_tokens, output_tokens,
                               credits, cost_usd, is_mock)
  values (p_org, p_user, p_feature, p_model, coalesce(p_input_tokens, 0), coalesce(p_output_tokens, 0),
          p_amount, coalesce(p_cost_usd, 0), coalesce(p_is_mock, false))
  returning id into v_usage;

  if p_amount > 0 or p_ref_id is not null then
    insert into public.credit_ledger (organization_id, delta, delta_purchased, reason, ref_id, created_by, ai_usage_id)
    values (p_org, -p_amount, -(p_amount - v_from_monthly), 'ai_usage', p_ref_id, p_user, v_usage);
  end if;

  return query select v_usage, v_balance, v_purchased, false;
end;
$$;

-- Szerveroldali csomagváltás (Stripe-webhook / mock). Egyedül ez írja az organizations.plan, ai_credit_monthly,
-- trial_plan mezőket. Az entitlement a szervezet ÉLŐ előfizetéséből jön (nem csak ebből az eseményből).
-- Idempotens: ismételt hívás ugyanazzal az állapottal nem ír jóvá újra; régebbi p_synced_at-ú állapotot eldob.
create or replace function public.apply_plan_change(
  p_org uuid,
  p_plan public.plan_tier,
  p_interval public.billing_interval,
  p_seats integer,
  p_status public.subscription_status,
  p_provider public.billing_provider,
  p_provider_customer_id text default null,
  p_provider_subscription_id text default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_synced_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations%rowtype;
  v_sub public.subscriptions%rowtype;
  v_found boolean;
  v_sub_id uuid;
  v_plan public.plan_tier;
  v_seats integer;
  v_monthly integer;
  v_balance integer;
  v_granted integer;
  v_trial_active boolean;
  v_step interval := case p_interval when 'year' then interval '1 year' else interval '1 month' end;
begin
  if p_plan is null or p_plan = 'start' then
    raise exception 'invalid_plan' using errcode = '22023';
  end if;
  if p_seats is null or p_seats < 1 or (p_plan <> 'office' and p_seats <> 1) then
    raise exception 'invalid_seats' using errcode = '22023';
  end if;
  if p_provider = 'stripe' and p_provider_subscription_id is null then
    raise exception 'provider_subscription_id_required' using errcode = '22023';
  end if;

  select * into v_org from public.organizations o where o.id = p_org for no key update;
  if not found then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;
  -- Az esetleg esedékes időszakot előbb lezárjuk, hogy a váltás a mostani hónapra számoljon.
  perform app.settle_credit_period(p_org);

  if p_provider_subscription_id is not null then
    select * into v_sub from public.subscriptions s
     where s.provider = p_provider and s.provider_subscription_id = p_provider_subscription_id
     for update;
  else
    select * into v_sub from public.subscriptions s
     where s.organization_id = p_org and s.provider = p_provider and s.status <> 'canceled'
     order by s.created_at desc
     limit 1
     for update;
  end if;
  v_found := found;

  if v_found then
    if v_sub.organization_id <> p_org then
      raise exception 'subscription_org_mismatch' using errcode = '42501';
    end if;
    if v_sub.provider_synced_at is not null and p_synced_at < v_sub.provider_synced_at then
      return v_sub.id;                                    -- elavult (sorrenden kívül érkezett) állapot
    end if;
    if v_sub.status = 'canceled' and p_status <> 'canceled' then
      return v_sub.id;                                    -- lezárt előfizetés nem éled újra
    end if;
  end if;

  if p_status in ('active', 'past_due') and exists (
       select 1 from public.subscriptions s
       where s.organization_id = p_org and s.status in ('active', 'past_due') and s.id is distinct from v_sub.id) then
    raise exception 'subscription_conflict' using errcode = '23505';
  end if;

  if v_found then
    update public.subscriptions
       set plan = p_plan, billing_interval = p_interval, seats = p_seats, status = p_status,
           provider_customer_id = coalesce(p_provider_customer_id, provider_customer_id),
           current_period_start = coalesce(p_period_start, current_period_start),
           current_period_end = coalesce(p_period_end, current_period_end),
           cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
           canceled_at = case when p_status = 'canceled' then coalesce(canceled_at, now()) end,
           provider_synced_at = p_synced_at
     where id = v_sub.id;
    v_sub_id := v_sub.id;
  else
    insert into public.subscriptions (organization_id, plan, billing_interval, seats, status, provider,
                                      provider_customer_id, provider_subscription_id,
                                      current_period_start, current_period_end, cancel_at_period_end,
                                      canceled_at, provider_synced_at)
    values (p_org, p_plan, p_interval, p_seats, p_status, p_provider, p_provider_customer_id,
            case when p_provider = 'mock'
                 then coalesce(p_provider_subscription_id, 'mock_' || replace(gen_random_uuid()::text, '-', ''))
                 else p_provider_subscription_id end,
            coalesce(p_period_start, case when p_provider = 'mock' then now() end),
            coalesce(p_period_end, case when p_provider = 'mock' then now() + v_step end),
            coalesce(p_cancel_at_period_end, false),
            case when p_status = 'canceled' then now() end,
            p_synced_at)
    returning id into v_sub_id;
  end if;

  -- Entitlement a szervezet élő előfizetéséből (régi előfizetés lemondása nem rontja el az újat).
  select s.plan, s.seats into v_plan, v_seats
  from public.subscriptions s
  where s.organization_id = p_org and s.status in ('active', 'past_due');
  if v_plan is null then
    v_plan := 'start';
    v_seats := 1;
  end if;
  v_monthly := app.plan_monthly_credits(v_plan, v_seats);
  v_trial_active := v_org.trial_plan is not null and coalesce(v_org.trial_ends_at > now(), false);

  update public.organizations
     set plan = v_plan,
         ai_credit_monthly = v_monthly,
         trial_plan = case when v_plan <> 'start' then null else trial_plan end   -- fizetős csomag: a próba véget ér
   where id = p_org;

  if v_trial_active then
    if v_plan <> 'start' then
      perform app.credit_reset_period(p_org, 'trial_expire');   -- próba-maradék elvész, új keret jóváírva
    end if;
    -- próba alatt, fizetős entitlement nélkül (pl. incomplete) a próba-kreditet nem bántjuk
  else
    select o.ai_credit_balance, o.ai_credit_period_granted into v_balance, v_granted
    from public.organizations o where o.id = p_org;
    if v_monthly > v_granted then
      -- Felváltás: csak a hónapban még jóvá nem írt különbözet (fel-le-fel váltással nem gyűjthető).
      insert into public.credit_ledger (organization_id, delta, reason)
      values (p_org, v_monthly - v_granted, 'plan_change_grant');
      update public.organizations
         set ai_credit_balance = ai_credit_balance + (v_monthly - v_granted), ai_credit_period_granted = v_monthly
       where id = p_org;
    elsif v_balance > v_monthly then
      -- Leváltás: a havi zseb az új keretre vágódik (a vásárolt zseb marad).
      insert into public.credit_ledger (organization_id, delta, reason)
      values (p_org, v_monthly - v_balance, 'plan_change_expire');
      update public.organizations set ai_credit_balance = v_monthly where id = p_org;
    end if;
  end if;

  insert into public.audit_log (organization_id, action, entity_type, entity_id, metadata)
  values (p_org, 'plan_change', 'subscription', v_sub_id,
          jsonb_build_object('plan', p_plan, 'status', p_status, 'provider', p_provider, 'seats', p_seats,
                             'effective_plan', v_plan, 'cancel_at_period_end', p_cancel_at_period_end));
  return v_sub_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Szervezet létrehozása: ugyanaz, mint 0002-ben, + a próba jóváírása a naplóba és a keretidőszakba.
-- (create or replace: a meglévő jogok — authenticated execute — megmaradnak.)
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
                                    ai_credit_balance, ai_credit_monthly, ai_credit_period_granted)
  values (trim(p_name), p_type, v_slug, 'start', 'pro_ai', now() + interval '14 days', 400, 10, 400)
  returning id into v_org;

  insert into public.credit_ledger (organization_id, delta, reason, ref_id, created_by)
  values (v_org, 400, 'trial_grant', app.det_uuid('trial:' || v_org::text), v_user);

  insert into public.memberships (organization_id, user_id, role)
  values (v_org, v_user, 'owner');

  update public.profiles set active_organization_id = v_org where id = v_user;

  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- Jogok: kliens (anon, authenticated) semmit nem hívhat; csak a service role.
-- ---------------------------------------------------------------------------
revoke all on function
  public.grant_credits(uuid, integer, text, uuid, uuid),
  public.spend_credits(uuid, integer, text, uuid, uuid, text, integer, integer, numeric, boolean),
  public.grant_monthly_credits_if_due(uuid),
  public.apply_plan_change(uuid, public.plan_tier, public.billing_interval, integer, public.subscription_status,
                           public.billing_provider, text, text, timestamptz, timestamptz, boolean, timestamptz),
  public.billing_plan_config()
  from public, anon, authenticated;
grant execute on function
  public.grant_credits(uuid, integer, text, uuid, uuid),
  public.spend_credits(uuid, integer, text, uuid, uuid, text, integer, integer, numeric, boolean),
  public.grant_monthly_credits_if_due(uuid),
  public.apply_plan_change(uuid, public.plan_tier, public.billing_interval, integer, public.subscription_status,
                           public.billing_provider, text, text, timestamptz, timestamptz, boolean, timestamptz),
  public.billing_plan_config()
  to service_role;

revoke all on function
  app.plan_limit(public.plan_tier),
  app.plan_monthly_credits(public.plan_tier, integer),
  app.is_listing_active(public.property_status),
  app.effective_plan(uuid),
  app.credit_reset_period(uuid, text),
  app.settle_credit_period(uuid),
  app.mock_subscription_tick(uuid)
  from public, anon, authenticated;
grant execute on function
  app.plan_limit(public.plan_tier),
  app.plan_monthly_credits(public.plan_tier, integer),
  app.is_listing_active(public.property_status),
  app.effective_plan(uuid)
  to service_role;

do $$
begin
  if has_function_privilege('authenticated', 'public.spend_credits(uuid, integer, text, uuid, uuid, text, integer, integer, numeric, boolean)', 'execute')
     or has_function_privilege('authenticated', 'public.grant_credits(uuid, integer, text, uuid, uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.grant_monthly_credits_if_due(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.apply_plan_change(uuid, public.plan_tier, public.billing_interval, integer, public.subscription_status, public.billing_provider, text, text, timestamptz, timestamptz, boolean, timestamptz)', 'execute')
     or has_function_privilege('anon', 'public.spend_credits(uuid, integer, text, uuid, uuid, text, integer, integer, numeric, boolean)', 'execute') then
    raise exception 'A számlázási függvények kliensről hívhatók';
  end if;
end $$;
