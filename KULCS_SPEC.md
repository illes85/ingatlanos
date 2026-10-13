# KULCS — ingatlanos munkaplatform ügynököknek és irodáknak
### Termék- és fejlesztési specifikáció Claude Code számára

> **Hogyan használd ezt a fájlt (Claude Code):** Ez a teljes specifikáció. Olvasd végig, mielőtt bármit írsz. Fázisonként haladj (lásd 12. fejezet), minden fázis végén állj meg, foglald össze, mi készült el, és várd meg a jóváhagyást. Ha valami ellentmondásos vagy hiányzik, kérdezz, ne találgass. A felület nyelve magyar.

---

## 1. Szereped és a cél

Senior full-stack fejlesztő és termékdizájner vagy. Egy **eladható SaaS terméket** építesz magyar ingatlanközvetítőknek (egyéni ügynököknek és ingatlanirodáknak). A cél nem egy újabb ingatlan-nyilvántartó, hanem egy **„pénzkereső munkaállomás"**: minden képernyő arra válaszol, hogy *mit csináljon most az ügynök, hogy hamarabb jusson jutalékhoz*.

A magyar piacon már van sok olcsó CRM (6–10 ezer Ft/hó körül, ingyenes 25 ingatlanig stb.). Ezért:
- az **alapcsomagnak** olcsónak, gyorsnak és szépnek kell lennie (belépő a termékbe),
- a **prémium csomagok** értékét az adja, hogy közvetlenül több megbízást, gyorsabb eladást és kevesebb elvesztett leadet hoznak — ezek jellemzően AI-jal támogatott funkciók.

Munkanév: **Kulcs** (könnyen cserélhető legyen: egy `config/brand.ts` fájlban legyen a név, logó, színek).

---

## 2. Célfelhasználók és szerepkörök

**Fiók (tenant) típusok:**
- **Egyéni ügynök** — egy felhasználó, saját ingatlanokkal és ügyfelekkel.
- **Iroda** — több felhasználó, közös ingatlanállomány, irodavezetői rálátás.

**Szerepkörök (irodán belül):**
| Szerep | Mit lát / mit csinál |
|---|---|
| `owner` (irodavezető / tulajdonos) | Mindent; csapat, csomag, számlázás, jutalékszabályok, teljesítmény |
| `agent` (referens) | Saját ügyfelek/ingatlanok + az iroda által megosztott állomány; mások ügyfeleinek személyes adatait nem |
| `assistant` (backoffice) | Ingatlanfeltöltés, dokumentumok, naptár; jutalékadatokat nem lát |

A jogosultságot az adatbázis szintjén is érvényesíteni kell (Row Level Security), nem csak a felületen.

---

## 3. Tech stack (ettől csak indoklással térj el)

- **Next.js 15 (App Router) + TypeScript (strict)**
- **Tailwind CSS v4 + shadcn/ui** (Radix alapú), ikonok: **lucide-react**
- **Framer Motion** — mikroanimációk, oldalátmenetek
- **Supabase** — Postgres, Auth (email + magic link + Google), Storage (fotók, dokumentumok), Row Level Security, Realtime (értesítések)
- **Drizzle ORM** vagy Supabase generált típusok (válassz egyet, indokold)
- **TanStack Query** (kliens oldali cache), **Zod** (validáció), **React Hook Form**
- **dnd-kit** — kanban drag & drop
- **MapLibre GL + OpenStreetMap** csempék (ingyenes) — térképnézet
- **Recharts** — grafikonok
- **Stripe** — előfizetés, csomagváltás, AI kreditcsomagok (Billing Portal)
- **Resend** — tranzakciós e-mailek; **react-pdf** — PDF riportok
- **Anthropic Claude API** — minden AI funkció, szerveroldalon
- **PWA** (manifest + service worker) — az ügynök telefonon, terepen dolgozik
- Tesztek: **Vitest** (logika), **Playwright** (fő folyamatok smoke tesztje)

**Kötelező elv:** az app **API kulcsok nélkül is fusson** helyben. Minden külső szolgáltatás (AI, Stripe, e-mail, térkép-geokódolás) egy interfész mögött legyen, `MOCK` implementációval, amely valószerű, magyar nyelvű demóválaszt ad. `.env.example`-ben legyen minden változó dokumentálva.

---

## 4. Architektúra elvek

1. **Multi-tenant:** minden üzleti tábla tartalmaz `organization_id`-t; RLS policy minden táblán.
2. **Entitlements (funkciójogosultság):** a csomagok funkcióit egy központi `plans`/`entitlements` konfiguráció írja le (pl. `ai.listing_writer`, `ai.valuation_report`, `limits.active_listings = 15`). A felületen egy `<FeatureGate feature="...">` komponens és egy szerveroldali `requireFeature()` ellenőrzés használja. Zárolt prémium funkció **látszódjon**, de elegáns „Prémium" overlay-jel és egy kattintásos upgrade-folyamattal (ez a konverzió kulcsa).
3. **AI kreditek:** a drága AI műveletek (virtuális berendezés, értékbecslő riport, hívásátírás) kreditet fogyasztanak. Csomagonként havi kreditkeret + vásárolható kreditcsomag. Minden AI hívás naplózva: `ai_usage` (felhasználó, funkció, token/kredit, költség).
4. **Activity log / idővonal:** minden ügyfélhez és ingatlanhoz egységes eseménynapló (hívás, e-mail, bemutató, árváltozás, dokumentum, státuszváltás).
5. **Audit log** érzékeny műveletekre (export, törlés, jogosultságváltás).
6. Szerveroldali műveletek: Server Actions + route handlerek; AI hívások csak szerveren, streameléssel ahol a felhasználó vár a szövegre.

---

## 5. Adatmodell (fő entitások)

- `organizations` (típus: egyéni / iroda, csomag, kreditegyenleg, márkaszínek, logó)
- `profiles` (felhasználó, szerep, telefonszám, névjegyzéki szám, havi jutalékcél)
- `properties` — ingatlan: típus (lakás, ház, telek, iroda, üzlethelyiség, nyaraló), ügylet (eladó / kiadó), cím + geokód + **láthatósági szint** (pontos cím rejtve a nyilvános oldalon), ár, m², szobák, félszobák, emelet, lift, fűtés, állapot, építés éve, **energetikai besorolás**, erkély/terasz, parkolás, rezsi, közös költség, leírás, kiemelt jellemzők, státusz, felelős ügynök, megbízás típusa (**kizárólagos / nem kizárólagos**), megbízás lejárata, jutalék %
- `property_media` (fotók sorrenddel, alaprajz, videó, 360 link, „virtuálisan berendezett" jelölés)
- `contacts` — személyek: szerepek (eladó, vevő, bérlő, bérbeadó, befektető, ügyvéd, hitelközvetítő, egyéb), elérhetőségek, forrás, **GDPR hozzájárulás** (dátum, mire), címkék, **Pmt. ügyfélátvilágítás státusza**
- `search_profiles` — vevői keresési igény: helyszín(ek) / rajzolt térképterület, ártartomány, m², szobaszám, típus, kötelező/kívánt jellemzők, finanszírozás (készpénz / hitel / CSOK Plusz / egyéb), sürgősség
- `leads` — beérkező érdeklődés: forrás (portál, saját weboldal, Facebook, telefon, ajánlás, kézi), nyers üzenet, kapcsolódó ingatlan, státusz, AI-pontszám
- `deals` — ügylet a pipeline-ban (eladói vagy vevői oldali), szakasz, várható érték, várható jutalék, valószínűség, várható zárás
- `showings` — bemutatók: időpont, ingatlan, résztvevők, visszajelzés (1–5 + szöveg), utókövetés
- `offers` — ajánlatok, ellenajánlatok, foglaló összege, határidők
- `tasks`, `calendar_events` (Google Naptár szinkron később)
- `documents` + `document_templates` (megbízási szerződés, bemutatási lap / megtekintési nyilatkozat, foglaló-előszerződés vázlat, Pmt. adatlap, átadás-átvételi jegyzőkönyv)
- `commissions` — jutalék: bruttó, iroda/ügynök megosztás, ki hozta / ki adta el felosztás, kifizetés státusza
- `activities` (idővonal), `notifications`, `ai_usage`, `audit_log`
- `market_snapshots` — piaci árstatisztikák településre/kerületre (m²-ár trend), első körben seed/mock adat

---

## 6. Alapfunkciók (minden csomagban)

1. **Irányítópult („Ma")** — bento-rács elrendezés: mai teendők és bemutatók, új leadek, havi jutalék-előrehaladás gyűrűdiagrammal, pipeline összérték, lejáró megbízások figyelmeztetése, legutóbbi aktivitás.
2. **Ingatlanok** — rács (nagy fotós kártyák), lista (sűrű táblázat) és **térkép + lista osztott nézet**; gyorsszűrők (chipek), mentett szűrők; ingatlan-adatlap fülekkel: Áttekintés · Fotók · Érdeklődők · Bemutatók · Dokumentumok · Idővonal. Fotók drag & drop feltöltése és átrendezése.
3. **Ügyfelek (CRM)** — kártya- és táblanézet, ügyfél-adatlap egységes idővonallal, keresési profilokkal, kapcsolódó ingatlanokkal; „mit kapott már meg tőlünk" nyilvántartás (ki melyik ingatlant kapta ajánlásként — ez a magyar ügynököknek kritikus).
4. **Lead bejövő doboz** — egységes, olvasatlan/olvasott, gyors hozzárendelés, egy kattintásos „ügyféllé alakítás", duplikátum-felismerés telefonszám/e-mail alapján.
5. **Ügyletek pipeline** — kanban, két külön tábla: *Eladói oldal* (Akvizíció → Felmérés → Megbízás aláírva → Hirdetve → Ajánlat → Foglaló → Adásvétel → Lezárva) és *Vevői oldal* (Új → Igényfelmérés → Bemutatók → Ajánlat → Hitelügyintézés → Adásvétel → Lezárva). Húzással mozgatható, oszloponként összérték.
6. **Naptár és bemutatók** — hét/nap nézet, bemutató gyors-rögzítése, bemutatási lap generálása, utólagos visszajelzés-kérés.
7. **Feladatok** — határidővel, ügyfélhez/ingatlanhoz kötve, ismétlődő feladatok.
8. **Megosztható ingatlan-oldal** — szép, nyilvános, mobilbarát bemutató link az ügynök névjegyével (opcionálisan pontos cím nélkül), érdeklődési űrlappal, amely leadként érkezik vissza.
9. **Dokumentumsablonok** — kitöltés az adatlapból, PDF letöltés.
10. **Jutalék-alapnyilvántartás** — ügyletenként, havi összesítő.
11. **Globális keresés + parancspaletta (⌘K / Ctrl+K)** — ügyfél, ingatlan, művelet („új bemutató", „új ingatlan").
12. **Értesítések** — appon belül (realtime) + e-mail.
13. **Adatexport (CSV) és GDPR-eszközök** — ügyfél adatainak exportja, törlés/anonimizálás.

---

## 7. Prémium funkciók (a bevétel motorja)

Minden prémium funkciót vizuálisan egységesen jelölj (lásd Design: „AI felület").

### A) Megbízásszerzés (itt van a legtöbb pénz)
1. **AI értékbecslő riport eladóknak (CMA)** — a felvitt ingatlanadatok + összehasonlító ingatlanok + piaci m²-ár trend alapján javasolt ársáv (min / reális / ambiciózus) indoklással, várható eladási idővel. Kimenet: **márkázott, látványos PDF** az ügynök fotójával és logóval — ezzel győzi meg a tulajdonost a kizárólagos megbízásról. *(Jogi jelölés a riporton: „tájékoztató jellegű piaci elemzés, nem hivatalos értékbecslés".)*
2. **Megbízásszerző prezentáció** — egy kattintással generált, megosztható weboldal/PDF: ügynök bemutatása, értékesítési terv, marketingterv, hasonló sikeres eladások, árjavaslat.
3. **Akvizíciós figyelő** — a saját adatbázisban lejáró / visszavont megbízások, régóta nem frissített ingatlanok, régi eladó-ügyfelek „újrakeresési" listája; piaci adatforrás csak jogszerű, engedélyezett integráción keresztül (a portálok felhasználási feltételeit sértő scraping NEM része a terméknek — a forrás modul legyen cserélhető interfész).

### B) Hirdetés és marketing
4. **AI hirdetésszöveg-író** — portálra, Facebookra, Instagramra, e-mailre; hangnem (elegáns, közvetlen, befektetői), hosszváltozatok, angol/német fordítás; a megadott adatokra támaszkodik, nem talál ki jellemzőt (a hiányzó adatra rákérdez).
5. **AI fotósegéd** — automatikus fotósorrend-javaslat, gyenge minőségű képek jelzése, borítókép-javaslat; **virtuális berendezés** (külső képgeneráló szolgáltatás interfész mögött, első körben mock) — a kép automatikusan „Virtuálisan berendezett" vízjelet kap.
6. **Közösségi poszt-generátor** — ingatlanból kész posztképek (sablonos, márkázott) + szöveg.

### C) Lead → ügyfél → eladás
7. **AI lead-pontozás és „Ma kit hívj?" lista** — prioritás a sürgősség, finanszírozás, aktivitás, egyezés alapján; indoklással („3 hasonló ingatlant megnézett, hitelbírálata kész").
8. **AI vevő–ingatlan párosítás** — új ingatlan felvitelekor azonnal megmutatja a passzoló vevőket egyezési %-kal és indoklással; egy kattintással személyre szabott ajánló e-mail.
9. **Hangjegyzet → CRM** — az ügynök hívás vagy bemutató után bediktál egy hangüzenetet; az AI átírja, összefoglalja, kitölti az ügyfél adatait/keresési profilját, és feladatot javasol. (Mobilon kiemelt gomb.)
10. **AI utókövetési szekvenciák** — automatikus, de jóváhagyandó e-mail/SMS piszkozatok bemutató után, ajánlat után, csendes leadeknek, régi ügyfeleknek (évfordulós „ajánlói" üzenet).
11. **Ügylet-kockázat jelzés** — „ez az ügylet 14 napja nem mozdult", „lejár a megbízás 10 nap múlva", „foglaló határidő holnap".

### D) AI asszisztens
12. **Kulcs Asszisztens** — oldalsó panelben chat, amely az iroda saját adatain dolgozik (jogosultság szerint): „Melyik vevőm keres 3 szobás lakást Gödöllőn 70 M alatt?", „Írj ajánlatot Kovács úrnak a 12-es ingatlanról", „Mennyi jutalékom várható novemberben?". Tool-use alapon (lekérdező függvények), nem nyers SQL.

### E) Irodavezetői prémium
13. **Teljesítmény-analitika** — ügynökönként leadkonverzió, bemutató→ajánlat arány, átlagos eladási idő, megbízásszerzési arány, ranglista.
14. **Jutalék-előrejelzés** — pipeline valószínűség alapján havi/negyedéves várható bevétel.
15. **Jutalékszabályok** — sávos megosztás, „ki hozta / ki adta el" felosztás, automatikus elszámolás.
16. **Lead-elosztás** — körforgásos vagy szabály alapú kiosztás ügynököknek.
17. **Pmt. (pénzmosás elleni törvény) megfelelőség** — ügyfélátvilágítási adatlap, kockázati besorolás, határidő-emlékeztető, archiválás. *(Az ingatlanközvetítők Pmt.-kötelezettek — ezt a tartalmat a fejlesztés végén jogásznak kell ellenőriznie; jelöld TODO-val.)*

---

## 8. Csomagok (kezdeti javaslat, konfigurációból módosítható)

Árak nettó Ft/hó, éves fizetésnél −20%.

| | **Start** | **Pro** | **Pro AI** | **Iroda** |
|---|---|---|---|---|
| Ár | 0 Ft | 7 900 Ft | 24 900 Ft | 14 900 Ft/fő + 9 900 Ft platformdíj |
| Aktív ingatlan | 15 | korlátlan | korlátlan | korlátlan |
| Alapfunkciók (6. fejezet) | ✓ | ✓ | ✓ | ✓ |
| Megosztható ingatlan-oldal | logóval „Kulcs" márkával | saját márka | saját márka | iroda márka |
| AI hirdetésszöveg | 5/hó próba | 30/hó | korlátlan | korlátlan |
| Vevő–ingatlan párosítás | – | ✓ | ✓ AI indoklással | ✓ |
| Értékbecslő riport, megbízásszerző prezentáció | – | – | ✓ | ✓ |
| Lead-pontozás, „Ma kit hívj" | – | – | ✓ | ✓ |
| Hangjegyzet → CRM, utókövetési szekvenciák | – | – | ✓ | ✓ |
| Kulcs Asszisztens | – | – | ✓ | ✓ |
| AI kredit / hó | 10 | 50 | 400 | 300/fő |
| Irodavezetői funkciók (13–17) | – | – | – | ✓ |

Kreditcsomag vásárolható (pl. 200 kredit = 4 900 Ft). 14 napos ingyenes Pro AI próbaidőszak regisztrációkor, bankkártya nélkül.

---

## 9. Design system — „modern, prémium, nyugodt magabiztosság"

> **Jóváhagyott látványterv:** a `design/` mappában lévő fájlok a kötelező vizuális referencia. Ezeket a képernyőket kell pixelpontosan, React-komponensekként újraépíteni (a fájlok csak referenciák, ne futtasd és ne másold be őket nyersen az appba):
> - `Main.dc.html` — „Ma" irányítópult (oldalsáv felirattal, felső sáv, KPI-sor, „Ma kit hívj?", Mai bemutatók, Pipeline szakaszonként, Figyelmeztetések, Legutóbbi ingatlanok)
> - `Ingatlan.dc.html` — ingatlan-adatlap (galéria-mozaik, összegzőkártya, fülek, Passzoló vevők panel)
> - `Terkep.dc.html` — ingatlanok térkép + lista nézetben (szűrőchipek, árcímkés jelölők, üvegpanelek)
> - `Pipeline.dc.html` — ügyletek kanban (AI kockázati sáv, öregedés-jelzők, réz zárás előtti oszlopok)
> - `Mobil.dc.html` — mobil „Ma" képernyő alsó navigációval és kiemelt mikrofon-gombbal
> - `Alapelemek.dc.html` — színek, tipográfia, gombok, chipek, beviteli mező, AI javaslat blokk, zárolt prémium kártya, üres állapot
>
> Ha a `design/screenshots/` mappában képek is vannak, azok mutatják a végleges megjelenést. A színeket, méreteket, lekerekítéseket és árnyékokat ezekből a fájlokból vedd át design tokenekbe. Ahol ez a fejezet és a látványterv eltér, **a látványterv az irányadó**. A fotók helyén a tervben tónusos helykitöltők vannak – az appban valódi (seed) fotók legyenek.

**Hangulat:** egy prémium ingatlan-magazin és egy gyors, modern munkaeszköz (Linear / Attio szintű kidolgozottság) keresztezése. Fotóközpontú, levegős, de információban gazdag. Nem „sablonos admin dashboard".

**Színszerepek:** erdőzöld = cselekvés és aktív állapot; réz = pénz, jutalék, zárás előtti szakasz, kizárólagos megbízás; ibolya = AI. Ezeket ne keverd.

### Színek (CSS változókként, világos + sötét téma)
| Token | Világos | Sötét | Használat |
|---|---|---|---|
| `--bg` | `#F7F6F2` (meleg törtfehér) | `#0E1013` | háttér |
| `--surface` | `#FFFFFF` | `#16191E` | kártyák |
| `--ink` | `#16181D` | `#ECEDEF` | fő szöveg |
| `--muted` | `#6B6F76` | `#9A9FA8` | másodlagos szöveg |
| `--primary` | `#1F5C4A` (mély erdőzöld) | `#3FA585` | fő akció, aktív állapot |
| `--accent` | `#C8763A` (réz) | `#E09A5F` | kiemelés, jutalék, prémium |
| `--ai` | átmenet `#6D5BF6 → #C8763A` | ugyanaz, kicsit világosabb | csak AI-funkciókhoz |
| `--success / --warning / --danger` | `#2E8B57 / #D9962B / #C2453B` | | státuszok |
| `--line` | `#E7E4DC` | `#262A31` | keretek, elválasztók |
| `--primary-soft` | `#E6EFEA` | `#173D33` | aktív menü, pozitív chip háttér |
| `--accent-soft` / `--accent-text` | `#F6E9DE` / `#9A5422` | `#3A2A1E` / `#E9B48A` | réz chip, kis réz szöveg |
| `--ai-soft` / `--ai-text` | `#EFEDFE` / `#5040D9` | `#25214A` / `#B3A9FF` | AI chip, AI javaslat háttér |

Kontraszt minden szövegre min. WCAG AA. A réz (`#C8763A`) kis szövegként nem elég kontrasztos – kis méretben a `--accent-text` színt használd.

### Tipográfia
- Címek és nagy számok (árak, KPI-k): **Fraunces** (serif, editoriális, prémium hatás), tabuláris számjegyekkel.
- Felület és szöveg: **Plus Jakarta Sans** (400/500/600/700).
- Skála: 12 / 14 / 16 / 20 / 24 / 32 / 44 px. Árformátum: `59,9 M Ft`, `1 250 000 Ft/m²` → magyar szóközös ezreselválasztó.

### Forma és mélység
- Lekerekítés: kártya 16px, gomb/input 10px, chip teljesen kerek.
- Árnyék: puha, többrétegű, alacsony átlátszóság; sötét módban árnyék helyett 1px finom keret.
- **Üvegeffekt** (backdrop-blur) csak lebegő elemeken: térkép fölötti panel, parancspaletta, felső sáv görgetéskor.

### AI-felület vizuális nyelve
- AI-funkció gombjai: négyágú csillag ikon (✦) + vékony átmenetes keret `--ai` színnel (hoverre a keret lassan „körbefut").
- AI-kártyák (pl. „Ma kit hívj?", „Passzoló vevők"): 3px-es ibolya→réz átmenetes csík a kártya **tetején**, halvány ibolya árnyék, „✦ AI …" chip a cím mellett.
- AI által generált tartalom: halvány ibolya hátterű doboz (`--ai-soft`), felül „AI JAVASLAT" címke, alatta a tartalom, a hiányzó adatra rákérdező sor, majd „Elfogad / Szerkeszt / Elvet" gombok. Az AI soha nem küld ki semmit jóváhagyás nélkül.
- Streamelt szöveg gépelés-animációval; generálás közben skeleton-csillámlás.
- Zárolt prémium funkció: elmosott előnézet a valódi felületről + kártya „Ezzel a funkcióval átlagosan X…" típusú értékígérettel és „Kipróbálom 14 napig" gombbal.

### Mozgás
- 150–250 ms, `ease-out`; oldalváltás finom fade + 4px csúszás; kártya hover: enyhe emelkedés + fotó 1.03 zoom.
- Számláló animáció KPI-knál, konfetti-mentes, de kellemes „Lezárva!" mikroanimáció ügylet zárásakor.
- `prefers-reduced-motion` tiszteletben tartása.

### Elrendezés és navigáció
- **Desktop:** bal oldali oldalsáv ikon + felirattal (logó, fő menü, „PRÉMIUM" szekció ✦ ikonokkal, alul csomag/kredit kártya és felhasználó). Munkaigényes képernyőkön (adatlap, térkép, kanban) 76px-es ikonsávra csukódik. Felső sáv: globális kereső ⌘K jelzéssel, „✦ Asszisztens", értesítések, „+ Új".
- **Mobil (PWA):** üveghatású alsó navigáció: Ma · Ingatlanok · [kiemelt kerek **mikrofon** gomb] · Lead · Naptár. A mikrofon nyomva tartásra hangjegyzetet rögzít, rövid koppintásra gyorsmenüt nyit (új lead, új bemutató, új ingatlan). A „Több" menü a fejlécben lévő avatarból nyílik.
- Részletek gyors megtekintése **oldalsó fiókban (drawer)**, teljes oldal csak szükség esetén.
- Táblázatokban inline szerkesztés, oszlopválasztás, sűrűség-kapcsoló.
- Minden listanak legyen **kidolgozott üres állapota** (egyszerű vonalas illusztráció + egy egyértelmű következő lépés), **skeleton** betöltése és hibaállapota.
- Toast értesítések visszavonás („Visszavonás") lehetőséggel törlésnél.

### Kulcsképernyők — kidolgozási szint
1. **Ma (dashboard)** — fejlécben üdvözlés + dátum + „3 teendő vár rád ma"; bento: *Ma kit hívj* (AI, prémium), *Mai bemutatók* idővonalon, *Havi jutalék-cél* gyűrű (réz), *Pipeline érték* mini oszlopdiagram, *Új leadek*, *Figyelmeztetések*.
2. **Ingatlan-adatlap** — teljes szélességű fotógaléria (mozaik, kattintásra lightbox), mellette ragadós összegzőkártya (ár Fraunces betűvel, m²-ár, státusz, megbízás lejárat sáv), alatta fülek; jobb oldali „Passzoló vevők" panel egyezési %-kal.
3. **Térkép + lista** — bal oldalt kártyalista, jobbra térkép árcímkés jelölőkkel (pill alakú „59,9 M"), hover összekapcsolás a kártya és a jelölő között, rajzolható keresési terület.
4. **Ügyfél-adatlap** — fejléc avatarral, szerep-chipekkel, gyors akciókkal (hívás, e-mail, SMS, bemutató); középen idővonal; jobb oldalt keresési profil és „Kapott ajánlatok".
5. **Pipeline kanban** — oszlopfejlécben összérték és darabszám, kártyán fotó-bélyegkép, ár, ügyfél, „napok a szakaszban" jelző (sárga/piros öregedés).
6. **Értékbecslő riport szerkesztő** — bal oldalt paraméterek, jobb oldalt élő PDF-előnézet.
7. **Csomagok / árazás oldal** — 4 kártya, kiemelt „Pro AI", éves/havi kapcsoló, funkció-összehasonlító táblázat.
8. **Nyilvános ingatlan-oldal** — magazinszerű, nagy hero fotó, főbb adatok ikonokkal, térkép (pontos cím nélkül körrel), ügynökkártya, érdeklődési űrlap.

---

## 10. Magyar specifikumok

- Teljes magyar felület (i18n struktúra `next-intl`-lel, hogy később angol is jöhessen).
- Dátum: `2026. október 2.`, idő 24 órás; pénznem HUF, opcionálisan EUR kijelzés.
- Címkezelés: irányítószám, település, budapesti kerület (római számmal is: XIII. kerület), utca, házszám, emelet/ajtó.
- Ingatlanjellemzők a magyar piac szerint: félszoba, gázcirkó / távfűtés / hőszivattyú / házközponti, panel / tégla / csúsztatott zsalus, gépkocsibeálló, kertkapcsolatos, tetőtéri, közös költség, energetikai tanúsítvány besorolás (AA++ … JJ).
- Finanszírozási címkék: készpénz, lakáshitel, CSOK Plusz, Otthon Start (tartsd ezeket egy szerkeszthető listában, mert a támogatások változnak).
- Portál-feltöltés (XML feed export) és portál-lead importálás: **interfész + mock** első körben; a valós integrációkat csak a portálok hivatalos partner-feltételei szerint kötjük be később.

---

## 11. Biztonság, adatvédelem, minőség

- RLS minden táblán, szerveroldali jogosultság-ellenőrzés minden műveletnél.
- GDPR: hozzájárulás rögzítése, adatkezelési tájékoztató link az űrlapokon, ügyféladat-export és törlés/anonimizálás, adatmegőrzési beállítás.
- Feltöltött fájlok: privát bucket, aláírt URL-ek; nyilvános oldalon csak a kiválasztott fotók.
- AI-ra küldött adatok minimalizálása (csak ami a feladathoz kell); az AI kimenetek mindig jóváhagyandók.
- Lighthouse cél: Performance ≥ 90, Accessibility ≥ 95 a fő oldalakon.
- Hibakezelés: barátságos magyar hibaüzenetek, sehol nyers stack trace.

---

## 12. Fejlesztési fázisok és elfogadási kritériumok

Minden fázis végén: futó app, frissített `README.md` (telepítés, futtatás, env változók), rövid összefoglaló nekem arról, mi készült el és mi maradt, majd **állj meg és várd a jóváhagyást**. Minden fázis után git commit beszédes üzenettel.

**0. fázis — Alapok és design system**
- Projekt felállítása, Supabase séma + migrációk + RLS, auth (regisztráció, belépés, szervezet létrehozása: egyéni / iroda).
- Design tokenek a `design/` mappa látványtervéből, téma (világos/sötét), alap komponenskönyvtár, app-keret (oldalsáv, felső sáv, mobil alsó navigáció, ⌘K paletta).
- Egy `/design` belső oldal, amely bemutatja az összes komponenst és állapotot – vizuálisan egyezzen az `Alapelemek.dc.html` tervvel.
- A „Ma" irányítópult statikusan, seed adatokkal, a `Main.dc.html` terv szerint – ez az első vizuális ellenőrzőpont.
- **Seed adatok:** 1 iroda 4 ügynökkel, ~40 valószerű magyar ingatlan (Budapest több kerület, Pest megyei agglomeráció pl. Gödöllő, Dunakeszi, Szentendre, Budaörs), ingyenes licencű helykitöltő fotókkal, ~80 ügyfél, keresési profilok, leadek, bemutatók, ügyletek minden szakaszban. Bejelentkezés demó fiókkal egy kattintással.
- ✅ Kész, ha: a demóval belépve a keret, a téma, a `/design` oldal és a „Ma" képernyő hibátlanul működik desktopon és mobilon, és szemre egyezik a látványtervvel.

**1. fázis — Alap CRM**
- 6. fejezet 1–8. és 11–12. pontja.
- ✅ Kész, ha: új ingatlan felvehető fotókkal, ügyfél keresési profillal, a lead ügyféllé alakítható, bemutató rögzíthető, ügylet a kanbanon végigvihető, a nyilvános ingatlan-oldal megosztható és az ott beküldött érdeklődés leadként megjelenik.

**2. fázis — Csomagok és jogosultságok**
- Entitlements, `FeatureGate`, kreditrendszer, Stripe előfizetés (teszt mód + mock), árazás oldal, próbaidőszak, zárolt prémium funkciók előnézete, limitek (pl. 15 aktív ingatlan Start-ban).
- ✅ Kész, ha: csomagváltáskor a funkciók azonnal nyílnak/zárulnak, a kreditfogyás látszik.

**3. fázis — AI funkciók (7. fejezet A–D)**
- Közös AI réteg: Claude kliens, prompt-sablonok külön fájlokban, streaming, kreditlevonás, mock mód, naplózás.
- Sorrend: hirdetésszöveg-író → vevő–ingatlan párosítás → értékbecslő riport PDF → lead-pontozás és „Ma kit hívj" → hangjegyzet → CRM → utókövetési szekvenciák → Kulcs Asszisztens (tool-use).
- ✅ Kész, ha: mindegyik működik mock módban és valódi API kulccsal is, az AI kimenetek jóváhagyás nélkül sehová nem mennek ki.

**4. fázis — Iroda funkciók (7. fejezet E) és jutalék**
- Csapatkezelés, meghívás e-mailben, szerepkörök, teljesítmény-analitika, jutalékszabályok és előrejelzés, lead-elosztás, Pmt. modul.

**5. fázis — Csiszolás**
- PWA telepíthetőség, offline olvasás az utoljára nézett ingatlanokra, értesítések, Playwright smoke tesztek a fő folyamatokra, Lighthouse-javítások, landing page a termékhez (marketing oldal az árazással).

---

## 13. Munkaszabályok

- Kérdezz, ha egy döntésnek üzleti következménye van, vagy két megoldás között nem egyértelmű a választás.
- Ne találj ki nem létező külső API-kat: ha egy integráció részletei nem ismertek, interfész + mock + `TODO(integráció)` megjegyzés.
- Komponensek kicsik és újrahasznosíthatók; nincs 400 sornál hosszabb komponensfájl.
- Minden felhasználói szöveg a fordítási fájlokban, nem beégetve.
- Ha egy fázis közben a specifikációtól el kell térni, írd le az okát a `DECISIONS.md` fájlba.
