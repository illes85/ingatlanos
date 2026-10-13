import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export interface PropertyMediaItem {
  id: string;
  kind: Enums["media_kind"];
  caption: string | null;
  isCover: boolean;
  isPublic: boolean;
  sortOrder: number;
  /** Aláírt URL (privát bucket); külső hivatkozásnál az eredeti cím. */
  url: string | null;
}

export interface PropertyShowingItem {
  id: string;
  startsAt: string;
  status: Enums["showing_status"];
  buyerName: string | null;
  agentName: string | null;
  feedbackRating: number | null;
  feedbackText: string | null;
}

export interface PropertyLeadItem {
  id: string;
  name: string | null;
  source: Enums["lead_source"];
  status: Enums["lead_status"];
  urgent: boolean;
  message: string | null;
  receivedAt: string;
  contactId: string | null;
}

export interface PropertyActivityItem {
  id: string;
  type: Enums["activity_type"];
  title: string;
  body: string | null;
  occurredAt: string;
}

export interface PropertyDocumentItem {
  id: string;
  title: string;
  kind: Enums["document_kind"];
  status: Enums["document_status"];
  createdAt: string;
}

export interface PropertyMatchItem {
  contactId: string;
  contactName: string;
  score: number;
  roomsMin: number | null;
  priceMax: number | null;
  places: string[];
  financing: string[];
  mortgageApproved: boolean;
  urgency: Enums["urgency"];
}

export interface PropertyDetail {
  property: Tables["properties"]["Row"];
  media: PropertyMediaItem[];
  responsible: { id: string; name: string } | null;
  sellerName: string | null;
  /** Hiányzik, ha a szerepkör nem láthatja a jutalékfeltételt (asszisztens). */
  commission: { pct: number | null; fixed: number | null; expectedAmount: number | null } | null;
  marketAvgPricePerSqm: number | null;
  showings: PropertyShowingItem[];
  leads: PropertyLeadItem[];
  activities: PropertyActivityItem[];
  documents: PropertyDocumentItem[];
  matches: PropertyMatchItem[];
  stats: { views: number; leads: number; showings: number; avgRating: number | null };
  daysOnMarket: number | null;
  mandateDaysLeft: number | null;
  mandateTotalDays: number | null;
}
