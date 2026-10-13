-- Kulcs · 0001 · Kiterjesztések, segédséma, enumok
-- Az enumok kulcsai angolok (kód), a megjelenített címkék a messages/hu.json-ban vannak.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Belső segédfüggvények sémája (nincs kitéve a PostgREST API-n)
create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- Tenancy
create type public.org_type as enum ('individual', 'office');
create type public.plan_tier as enum ('start', 'pro', 'pro_ai', 'office');
create type public.member_role as enum ('owner', 'agent', 'assistant');
create type public.member_status as enum ('active', 'invited', 'disabled');

-- Ingatlan
create type public.transaction_type as enum ('sale', 'rent');
create type public.property_type as enum ('flat', 'house', 'plot', 'office', 'retail', 'holiday_home');
create type public.property_status as enum (
  'draft', 'active', 'under_offer', 'reserved', 'sold', 'rented', 'withdrawn', 'expired'
);
create type public.mandate_type as enum ('exclusive', 'non_exclusive');
create type public.address_visibility as enum ('exact', 'street', 'area');
create type public.record_visibility as enum ('office', 'private');
create type public.energy_rating as enum (
  'AA++', 'AA+', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'II', 'JJ'
);
create type public.media_kind as enum ('photo', 'floorplan', 'video', 'tour360');

-- Ügyfél, lead
create type public.contact_role as enum (
  'seller', 'buyer', 'tenant', 'landlord', 'investor', 'lawyer', 'mortgage_broker', 'other'
);
create type public.pmt_status as enum ('not_started', 'in_progress', 'completed', 'expired');
create type public.risk_level as enum ('low', 'medium', 'high');
create type public.urgency as enum ('low', 'medium', 'high');
create type public.lead_source as enum (
  'portal', 'website', 'facebook', 'phone', 'referral', 'manual', 'public_page'
);
create type public.lead_status as enum ('new', 'read', 'contacted', 'converted', 'archived', 'spam');

-- Ügylet
create type public.deal_side as enum ('seller', 'buyer');
-- Mindkét oldal szakaszai egy enumban; az oldalhoz illést CHECK kényszer védi.
-- Eladói: acquisition → assessment → mandate_signed → listed → offer → deposit → contract → closed
-- Vevői:  new → needs_assessment → showings → offer → financing → contract → closed
create type public.deal_stage as enum (
  'acquisition', 'assessment', 'mandate_signed', 'listed',
  'new', 'needs_assessment', 'showings',
  'offer', 'financing', 'deposit', 'contract', 'closed'
);
create type public.deal_status as enum ('open', 'won', 'lost');
create type public.showing_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type public.offer_kind as enum ('offer', 'counter');
create type public.offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn', 'expired');

-- Munka, dokumentum, pénz
create type public.task_status as enum ('open', 'done');
create type public.task_priority as enum ('low', 'normal', 'high');
create type public.event_kind as enum ('showing', 'meeting', 'signing', 'call', 'other');
create type public.document_kind as enum (
  'mandate_agreement', 'showing_sheet', 'reservation_precontract', 'pmt_form', 'handover_protocol', 'other'
);
create type public.document_status as enum ('draft', 'final', 'signed');
create type public.commission_status as enum ('expected', 'earned', 'invoiced', 'paid');
create type public.split_role as enum ('listing', 'selling', 'referral');

-- Idővonal
create type public.activity_type as enum (
  'call', 'email', 'sms', 'note', 'showing', 'price_change', 'status_change',
  'document', 'offer', 'lead', 'recommendation', 'task', 'listing'
);

-- Általános updated_at trigger
create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
