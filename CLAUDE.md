@AGENTS.md

## Modellválasztás (munkamegosztás)

A munkamenet alapmodellje a **Sonnet 5.5 (medium)**: ezzel készülnek a képernyők, komponensek, űrlapok, tesztek és a dokumentáció. A főmunkamenet modelljét nem váltom magamtól; a nehéz részeket a `.claude/agents/` ágenseinek adom át, amelyek saját modellel futnak:

| Mikor | Ágens | Modell |
|---|---|---|
| Új/módosított RLS-policy, migráció, storage-szabály, auth- vagy jogosultsági logika; minden fázis lezárása előtt | `biztonsagi-atnezes` | Opus |
| Több táblát érintő séma-változás, adatmigráció meglévő adatra | `migracio-tervezo` | Opus |
| „Hol van…”, „mi használja…” jellegű keresés | `kereso` | Haiku |

Szabályok:
- Jogosultsági vagy migrációs változtatás után mindig hívd meg a `biztonsagi-atnezes` ágenst, mielőtt kész állapotot jelentesz.
- Ha egy hibát két próbálkozás után sem sikerült megoldani, javasold a felhasználónak az Opus 5.5 / high átváltást.
- A felhasználó magyarul kommunikál; a fázisok végén megállunk jóváhagyásra.
