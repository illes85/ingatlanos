-- Kulcs · 0027 · Felhasználónként egyetlen ingyenes próbaidő (D-041)
-- A próbát felhasználóhoz kötjük (nem szervezethez), így újabb szervezet nyitásával, vagy a szervezet törlésével
-- és újranyitásával nem szerezhető újabb 14 nap Pro AI és 400 kredit. A tábla kliensről nem érhető el.

create table public.trial_claims (
  user_id uuid primary key,                 -- szándékosan nincs külső kulcs: a fiók törlése ne törölje a jelölést
  email_normalized text,                    -- kisbetű, „+címke” nélkül, gmailnél pontok nélkül
  claimed_at timestamptz not null default now()
);
create unique index trial_claims_email_key on public.trial_claims (email_normalized) where email_normalized is not null;

-- E-mail normalizálás a próba-korláthoz: aliasokkal (+címke, gmail-pontok) ne legyen újabb próba nyitható.
create or replace function app.normalize_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then null
    else
      case when split_part(lower(trim(p_email)), '@', 2) in ('gmail.com', 'googlemail.com')
           then replace(split_part(split_part(lower(trim(p_email)), '@', 1), '+', 1), '.', '') || '@gmail.com'
           else split_part(split_part(lower(trim(p_email)), '@', 1), '+', 1) || '@' || split_part(lower(trim(p_email)), '@', 2)
      end
  end;
$$;
revoke all on function app.normalize_email(text) from public, anon, authenticated;
alter table public.trial_claims enable row level security;
revoke all on public.trial_claims from anon, authenticated;

-- Meglévő felhasználók: akinek már van próbás szervezete, azt a szervezet legkorábbi, aktív owner-tagja kapta.
insert into public.trial_claims (user_id, email_normalized, claimed_at)
select t.user_id, app.normalize_email(u.email), t.trial_ends_at - interval '14 days'
from (
  select distinct on (m.organization_id) m.organization_id, m.user_id, o.trial_ends_at
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.role = 'owner' and m.status = 'active' and o.trial_ends_at is not null
  order by m.organization_id, m.created_at
) t
left join auth.users u on u.id = t.user_id
on conflict do nothing;

-- A felületnek: jár-e még próba a bejelentkezett felhasználónak (hogy ne ígérjünk hamisat).
create or replace function public.my_trial_available()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and not exists (
       select 1 from public.trial_claims c
       where c.user_id = (select auth.uid())
          or c.email_normalized = (select app.normalize_email(u.email) from auth.users u where u.id = (select auth.uid()))
     );
$$;
revoke all on function public.my_trial_available() from public, anon;
grant execute on function public.my_trial_available() to authenticated;

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
  v_email text;
  v_trial boolean;
  v_month text := to_char(date_trunc('month', now() at time zone 'Europe/Budapest'), 'YYYY-MM');
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(trim(p_name)) < 2 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  -- Egy felhasználó legfeljebb 3 szervezetnek lehet tulajdonosa (különben sok Start-szervezettel kredit gyűjthető).
  if (select count(*) from public.memberships m where m.user_id = v_user and m.role = 'owner' and m.status = 'active') >= 3 then
    raise exception 'org_limit' using errcode = 'P0001';
  end if;

  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  -- Próba csak egyszer: a beszúrás akkor sikerül, ha a felhasználó még nem kapott.
  select app.normalize_email(u.email) into v_email from auth.users u where u.id = v_user;
  insert into public.trial_claims (user_id, email_normalized) values (v_user, v_email) on conflict do nothing;
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

-- Ellenőrzés: a próbajelölést kliens semmilyen úton nem éri el; a szervezetlétrehozás névtelenül nem hívható.
do $$
begin
  if has_table_privilege('authenticated', 'public.trial_claims', 'select,insert,update,delete,truncate')
     or has_table_privilege('anon', 'public.trial_claims', 'select,insert,update,delete,truncate')
     or has_function_privilege('anon', 'public.create_organization(text, public.org_type)', 'execute')
     or has_function_privilege('anon', 'public.my_trial_available()', 'execute') then
    raise exception 'A próbajelölés vagy a szervezetlétrehozás kliensről elérhető';
  end if;
end $$;
