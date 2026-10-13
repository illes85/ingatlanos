# Kulcs

Ingatlanos munkaállomás magyar ügynököknek és irodáknak: minden képernyő arra válaszol, mit csináljon most az ügynök, hogy hamarabb jutalékhoz jusson.
A teljes termék- és fejlesztési specifikáció: [`KULCS_SPEC.md`](KULCS_SPEC.md). A látványterv: [`design/`](design). Az eltérések és döntések: [`DECISIONS.md`](DECISIONS.md).

**Állapot:** 0. fázis — alapok és design system.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind CSS v4 · Radix UI (shadcn-elvű saját komponensek) · lucide-react · motion · Supabase (Postgres, Auth, Storage, RLS) · TanStack Query · Zod · React Hook Form · next-intl · Vitest · Playwright

## Előfeltételek

- Node.js 20.9+ (fejlesztve 24-gyel)
- Egy ingyenes **Supabase felhős projekt** (https://supabase.com) — Docker nem kell
- Google Chrome (a Playwright smoke tesztekhez; külön böngészőletöltés nem kell)

A Supabase CLI a projekt devDependency-je, nem kell külön telepíteni.

## Telepítés és futtatás

```bash
npm install
```

Hozz létre egy Supabase projektet, majd másold a `.env.example` fájlt `.env.local` néven, és töltsd ki (Project Settings → API):

| Változó | Honnan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://<ref>.supabase.co`, a végén nincs `/rest/v1/`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret / service_role key — csak szerveren, soha ne kerüljön gitbe! |
| `DEMO_USER_PASSWORD` | tetszőleges jelszó a demó fiókokhoz |

Összekötés és adatbázis felépítése:

```bash
npx supabase login
npx supabase link --project-ref <a-projekt-azonosítód>
npx supabase db push
npm run db:seed
```

Fejlesztői szerver:

```bash
npm run dev
```

Nyisd meg a http://localhost:3000 címet, és válaszd a **„Demó belépés egy kattintással”** egyik szerepét (irodavezető / ügynök / asszisztens). A belső komponenskatalógus: http://localhost:3000/design

A magic link és a regisztrációs e-mailek a felhős Supabase-en át mennek; az Authentication → URL Configuration alatt add meg a `http://localhost:3000/auth/callback` címet.

## Parancsok

| Parancs | Mit csinál |
|---|---|
| `npm run dev` | fejlesztői szerver |
| `npm run build` / `npm start` | éles build / futtatás |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | egységtesztek (Vitest) — formázók, dátumhatárok |
| `npm run test:rls` | RLS-tesztek szerepkörönként és tenantonként (seedelt adatbázis kell) |
| `npm run test:e2e` | Playwright smoke tesztek desktopon és mobilon (seedelt adatbázis kell) |
| `npx supabase db push` | új migrációk feltöltése a felhős projektre |
| `npm run db:seed` | demó adatok újratöltése (újrafuttatható; a dátumok a mai naphoz igazodnak) |
| `npm run db:types` | TypeScript-típusok generálása a felhős projektből (`src/types/database.ts`) |

## Demó adatok

**Kapu Ingatlaniroda.** Kiss Anna irodavezető, aki maga is ügynök; további ügynökök: Major Eszter, Fodor Bálint és Szilágyi Péter; asszisztens: Tóth Kinga. A seed tartalma:

- 40 ingatlan Budapest több kerületében és az agglomerációban (Gödöllő, Dunakeszi, Szentendre, Budaörs, Veresegyház …)
- ~80 ügyfél keresési profilokkal, ~25 lead
- bemutatók −30…+14 napra
- ügyletek mindkét pipeline minden szakaszában
- ajánlatok, foglalók, jutalékok, idővonal és piaci m²-árak

A tenant-izoláció teszteléséhez van egy második, egyéni szervezet is: **Lakatos Dóra Ingatlan**.

Fotók: ha a `scripts/seed/photos/` mappában vannak képek, a seed feltölti őket. Ha nincsenek, a látványterv tónusos helykitöltői jelennek meg.

## Mappastruktúra

```
supabase/migrations/     séma, RLS, triggerek, storage (SQL)
scripts/seed/            TypeScript seed (adatok + lépések)
src/app/(auth)/          belépés, regisztráció, szervezet létrehozása
src/app/(app)/           védett alkalmazás (app-keret); ma/ = „Ma” irányítópult
src/app/design/          belső design system oldal
src/components/ui/       alapkomponensek (gomb, chip, input, kártya, overlay …)
src/components/ai/       AI vizuális nyelv (✦ gomb, AI-kártya, javaslat, zárolt prémium)
src/components/shell/    oldalsáv, felső sáv, mobil navigáció, ⌘K paletta
src/features/dashboard/  „Ma” adatlekérdezések és kártyák
src/config/              márka, navigáció, pipeline, csomagok, demó
src/lib/                 Supabase kliensek, munkamenet, magyar formázók
messages/hu.json         minden felhasználói szöveg
```

## Biztonsági alapelvek

- Minden üzleti tábla `organization_id`-t tartalmaz, és mindegyiken van RLS policy (lásd `supabase/migrations/`).
- A service role kulcsot csak a seed és a kifejezetten rendszerszintű szerverműveletek használják.
- A felhasználói adatlekérdezések mindig a felhasználó munkamenetével futnak.
- A jutalékadatok külön táblákban vannak, az asszisztens szerepkör nem látja őket.
