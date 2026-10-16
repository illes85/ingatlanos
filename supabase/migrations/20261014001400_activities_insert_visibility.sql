-- Kulcs · 0022 · Idővonal-bejegyzés csak látható rekordhoz vehető fel
-- Eddig bármely tag felvehetett bejegyzést a szervezet bármely ügyfelére/ingatlanára/ügyletére, akkor is,
-- ha azt a saját jogaival nem látja (más ügynök ügyfele, magán-ingatlan). Most a beszúrás ugyanazt a
-- láthatóságot kéri, mint az olvasás (a hivatkozott sorokat a hívó RLS-ével keresi).

drop policy "idővonal: létrehozás" on public.activities;
create policy "idővonal: létrehozás" on public.activities
  for insert to authenticated
  with check (
    app.is_member(organization_id)
    and actor_id = (select auth.uid())
    and (contact_id is null or exists (select 1 from public.contacts c where c.id = contact_id))
    and (property_id is null or exists (select 1 from public.properties p where p.id = property_id))
    and (deal_id is null or exists (select 1 from public.deals d where d.id = deal_id))
  );
