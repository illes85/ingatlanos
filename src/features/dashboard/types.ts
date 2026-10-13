import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export interface CallListItem {
  id: string;
  name: string;
  role: Enums["contact_role"] | null;
  context: string | null;
  reason: string | null;
  score: number;
  phone: string | null;
}

export interface ShowingItem {
  id: string;
  startsAt: string;
  status: Enums["showing_status"];
  feedbackRequested: boolean;
  address: string;
  propertyLabel: string;
  buyerName: string | null;
  price: number | null;
  photoUrl: string | null;
  mapsQuery: string;
  propertyId: string;
}

export interface StageBar {
  stage: Enums["deal_stage"];
  count: number;
  value: number;
  preClose: boolean;
}

export type AlertItem =
  | { kind: "deposit"; severity: "danger"; daysLeft: number; address: string; href: string }
  | { kind: "mandate"; severity: "warning"; daysLeft: number; address: string; href: string }
  | { kind: "stale"; severity: "neutral"; days: number; address: string; href: string };

export interface RecentProperty {
  id: string;
  price: number;
  address: string;
  areaSqm: number | null;
  rooms: number | null;
  halfRooms: number;
  floor: number | null;
  propertyType: Enums["property_type"];
  energyRating: Enums["energy_rating"] | null;
  status: Enums["property_status"];
  daysSinceListed: number | null;
  photoUrl: string | null;
}

export interface DashboardData {
  firstName: string;
  todoCount: number;
  commission: { earned: number; goal: number | null };
  pipeline: { value: number; trendPct: number | null };
  mandates: { active: number; exclusive: number };
  leads: { fresh: number; urgent: number };
  callList: { items: CallListItem[]; total: number; locked: boolean };
  showings: ShowingItem[];
  stages: StageBar[];
  alerts: AlertItem[];
  recent: RecentProperty[];
}
