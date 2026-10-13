import type { Database } from "@/types/database";
import type { RecentProperty } from "@/features/dashboard/types";

type Enums = Database["public"]["Enums"];

/** Egy sor az ingatlanlistában (rács, lista, térkép). A kártya a RecentProperty mezőit használja. */
export interface PropertyListItem extends RecentProperty {
  code: string;
  title: string;
  transactionType: Enums["transaction_type"];
  subtype: string | null;
  pricePerSqm: number | null;
  responsibleName: string | null;
  mandateType: Enums["mandate_type"] | null;
  mandateExpiresAt: string | null;
  /** Hány nap múlva jár le a megbízás (negatív: már lejárt). */
  mandateDaysLeft: number | null;
  /** Hány napja nem változott a státusz. */
  daysInStatus: number;
  lat: number | null;
  lng: number | null;
}

export interface PropertyListResult {
  items: PropertyListItem[];
  total: number;
  pageSize: number;
}
