# Döntésnapló

Ahol a megvalósítás eltér a `KULCS_SPEC.md`-től, vagy ahol a spec döntést igényelt, itt rögzítjük az okot.

| # | Döntés | Indoklás |
|---|---|---|
| D-001 | **Next.js 16** (a spec 15-öt írt) | 2026 októberében a 16-os a stabil ág; a 15 már csak backport-javításokat kap. Jóváhagyva (K2). Következmények: `middleware.ts` helyett `src/proxy.ts`, a kérés-API-k (`cookies()`, `params`) csak aszinkron érhetők el, alapértelmezés a Turbopack. |
| D-002 | **Supabase generált típusok + SQL-migrációk**, nem Drizzle | A Drizzle közvetlen Postgres-kapcsolattal az RLS-t megkerüli, hacsak nem állítunk minden tranzakcióban szerepet és JWT-adatokat — multi-tenant SaaS-nál ez adatszivárgási kockázat. Így a böngésző és a szerver is a felhasználó munkamenetével, RLS alatt kérdez. A policy-k, triggerek és függvények amúgy is SQL-ben vannak. Összetett lekérdezéshez SQL view-t vagy RPC-t használunk. |
| D-003 | **npm** csomagkezelő | A pnpm nincs telepítve, és a corepack Windowson rendszergazdai jogot kérhet. |
| D-004 | **Magyar URL-ek, nyelvi előtag nélkül** (`/ma`, `/ingatlanok` …) | A termék magyar elsőként indul. A next-intl üzenetfájlokkal dolgozik, az angol nyelv később `messages/en.json`-nal és lokalizált útvonalakkal jön. |
| D-005 | **Munkaigényes képernyőkön nincs felső sáv** (ingatlan-adatlap, térkép, kanban) | Így szerepel a látványtervben (K4). Az „Új” és az értesítés ilyenkor az ikonsáv aljára kerül, a ⌘K mindenhol működik. |
| D-006 | **„Ma” KPI-sor: 4 kártya egy sorban** (≥1280px), alatta 2×2 | A PNG-n az „Új leadek” kártya tördelési mellékhatásként került külön sorba (K5). |
| D-007 | **Az ingatlan státusza az eladói ügylet szakaszából jön** (adatbázis-trigger) | Ne éljen ugyanaz az állapot (pl. „Hirdetve”) két helyen. Leképezés: akvizíció/felmérés/megbízás → előkészítés, hirdetve → aktív, ajánlat → ajánlat érkezett, foglaló/adásvétel → foglalózva, lezárva → eladva/kiadva. |
| D-008 | **Ügyfél-láthatóság**: az ügynök csak a saját ügyfeleit látja teljes adattal; másokéról csak név + felelős érhető el (`contact_directory()`) | Jóváhagyva (K3). Az owner és az asszisztens minden ügyfelet lát, a jutalékadatot az asszisztens nem. A jutalékfeltétel ezért külön táblában van (`property_commission_terms`), mert az RLS sor- és nem oszlopszintű. |
| D-009 | **A next-intl `createNextIntlPlugin()` helyett Turbopack-alias** (`next-intl/config`) | A plugin betölti a `@swc/core` natív modult. Ez ezen a gépen a `C:\Users\…\AppData\Local` mappa öröklött jogosultságai miatt nem indul (`ERR_SWC_NATIVE_CACHE`). Az alias ugyanazt a bekötést adja; a plugin üzenet-kivonatoló funkcióit nem használjuk. |
| D-010 | **A tervben szereplő köztes betűméretek** (13, 15, 22, 28, 34, 38 px) és lekerekítések (12, 14, 18, 20 px) is tokenek | Ahol a spec és a látványterv eltér, a terv az irányadó (spec 9. fejezet). |
| D-011 | **Kártyakeret `#ECE9E1`**, a `--line` (`#E7E4DC`) az elválasztóké | Így szerepel a látványtervben. |
| D-012 | **„Ma” irányítópult: „Legutóbbi ingatlanok”**, nincs „legutóbbi aktivitás” blokk | A terv az irányadó (Main.dc.html). |
| D-013 | **Szervezetenkénti tagság** (`memberships`) a profilon tárolt szerep helyett | A szerepkör szervezethez kötött. Ezzel később egy felhasználó több irodához is tartozhat (`profiles.active_organization_id`). |
| D-014 | **Szervezet létrehozása csak RPC-n át** (`create_organization`) | A regisztráló felhasználó automatikusan owner lesz, és elindul a 14 napos Pro AI próbaidő. Közvetlen INSERT-et az RLS nem enged. |
| D-015 | **A seed dátumai a futtatás pillanatához igazodnak**, a bemutatók −30…+14 napra szólnak | Így a „Ma” képernyő a seed utáni napokon is élő marad. A `npm run db:seed` bármikor újrafuttatható. |
| D-016 | **Jellemzők (fűtés, falazat, állapot, parkolás) szöveges kulcsként** tárolva, nem enumként | Ezek a lista-értékek a piaccal változnak. A finanszírozási formák a `lookup_values` táblában szerkeszthetők (spec 10.). A többi címkéje az 1. fázisban kerül a fordítási fájlba. |
| D-017 | **Framer Motion → `motion` csomag** | Ez a Framer Motion hivatalos új neve; az API azonos (`motion/react`). |
| D-018 | **A sötét téma tokenjei származtatottak** | A tervben csak világos téma van. A spec sötét alapszíneiből és a világos tokenek arányaiból számoltuk őket. |
| D-019 | **A demó fiókok `.test` TLD-t kapnak** (`…@kulcs-demo.test`), a seed ügyfelei `example.com`-ot | Foglalt tartományok, valódi címre így soha nem megy levél. |
| D-020 | **Fejlesztéshez felhős (hosted) Supabase projekt**, nem helyi Docker; a kód mégis hordozható marad | Az egyszerűbb út (nincs Docker Desktop, WSL), offline munka nem szempont. Hordozhatósági elvek: szabványos Postgres SQL + RLS migrációk (`supabase/migrations`), a tárolás S3-kompatibilis interfész mögött, az AI/e-mail/fizetés/térkép szolgáltatók cserélhető rétegek, a Next.js alkalmazás Dockerrel futtatható saját szerveren. Figyelem: a `db:reset` és a `db:setup` a **helyi** adatbázisra valók, a felhős projektre soha ne fusson. Fejlesztői és éles projekt külön legyen. A `db:types` a felhős projektből generál. |
