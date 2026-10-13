import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AiCard, AiChip } from "@/components/ai/ai";
import { ProgressBar } from "@/components/ui/progress";
import { formatMillions } from "@/lib/format";
import type { PropertyMatchItem } from "../detail-types";

/**
 * „Passzoló vevők”: a keresési profilok szabályalapú egyezése az ingatlannal. A profilok láthatóságát az RLS adja:
 * az ügynök csak a saját ügyfeleit látja teljes adattal, ezért mások nem jelennek meg itt.
 */
export async function MatchesPanel({ matches }: { matches: PropertyMatchItem[] }) {
  const t = await getTranslations("properties.detail.matches");

  return (
    <AiCard className="gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="serif text-22 font-medium">{t("title")}</h2>
        <AiChip size="sm">{t("chip")}</AiChip>
      </div>
      {matches.length === 0 ? (
        <p className="text-14 text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {matches.map((match) => {
            const details = [
              match.roomsMin ? t("rooms", { count: match.roomsMin }) : null,
              match.places.length ? match.places.slice(0, 2).join(", ") : null,
              match.priceMax ? t("upTo", { amount: formatMillions(match.priceMax) }) : null,
              ...match.financing.slice(0, 1),
              match.mortgageApproved ? t("mortgageApproved") : null,
            ].filter(Boolean);
            return (
              <li key={match.contactId} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/ugyfelek/${match.contactId}`} className="text-15 font-bold hover:text-primary">
                    {match.contactName}
                  </Link>
                  <span className="serif text-18 font-medium text-primary" aria-label={t("scoreLabel", { score: match.score })}>
                    {match.score}%
                  </span>
                </div>
                <ProgressBar value={match.score} fill="primary" label={t("scoreLabel", { score: match.score })} />
                <span className="text-12 text-muted">{details.join(" · ")}</span>
              </li>
            );
          })}
        </ul>
      )}
    </AiCard>
  );
}
