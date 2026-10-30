-- Kulcs · 0027 · Felhasználónként egyetlen ingyenes próbaidő (D-041)
-- A próbát felhasználóhoz kötjük (nem szervezethez), így újabb szervezet nyitásával, vagy a szervezet törlésével
-- és újranyitásával nem szerezhető újabb 14 nap Pro AI és 400 kredit. A tábla kliensről nem érhető el.

create table public.trial_claims (
  user_id uuid primary key references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table public.trial_claims enable row level security;
revoke all on public.trial_claims from anon, authenticated;

-- Meglévő felhasználók: aki már kapott próbát (valamely szervezetben owner, és ott volt próba), nem kap újat.
insert into public.trial_claims (user_id, claimed_at)
select distinct m.user_id, coalesce(o.trial_ends_at, now()) - interval '14 days'
from public.memberships m
join public.organizations o on o.id = m.organization_id
where m.role = 'owner' and o.trial_ends_at is not null
on conflict do nothing;

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
  v_claimed integer;
  v_trial boolean;
  v_month text := to_char(date_trunc('month', now() at time zone 'Europe/Budapest'), 'YYYY-MM');
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(trim(p_name)) < 2 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  -- Próba csak egyszer: a beszúrás akkor sikerül, ha a felhasználó még nem kapott.
  insert into public.trial_claims (user_id) values (v_user) on conflict (user_id) do nothing;
  get diagnostics v_claimed = row_count;
  v_trial := v_claimed = 1;

  if v_trial then
    insert into public.organizations (name, type, slug, plan, trial_plan, trial_ends_at,
                                      ai_credit_balance, ai_credit_monthly, ai_credit_period_granted)
    values (trim(p_name), p_type, v_slug, 'start', 'pro_ai', now() + interval '14 days', 400, 10, 400)
    returning id into v_org;

    insert into public.credit_ledger (organization_id, delta, reason, ref_id, created_by)
    values (v_org, 400, 'trial_grant', app.det_uuid('trial:' || v_org::text), v_user);
  else
    -- Próba nélkül: Start csomag a havi 10 kredittel (ugyanaz a havi jóváírás-kulcs, mint a lusta jóváírásnál).
    insert into public.organizations (name, type, slug, plan, ai_credit_balance, ai_credit_monthly, ai_credit_period_granted)
    values (trim(p_name), p_type, v_slug, 'start', 10, 10, 10)
    returning id into v_org;

    insert into public.credit_ledger (organization_id, delta, reason, ref_id, created_by)
    values (v_org, 10, 'monthly_grant', app.det_uuid('monthly:' || v_org::text || ':' || v_month), v_user);
  end if;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org, v_user, 'owner');

  update public.profiles set active_organization_id = v_org where id = v_user;

  return v_org;
end;
$$;
