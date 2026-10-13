import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export interface LeadDuplicate {
  id: string;
  fullName: string;
  ownerName: string | null;
  match: "phone" | "email";
}

export interface LeadItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: Enums["lead_source"];
  sourceDetail: string | null;
  status: Enums["lead_status"];
  urgent: boolean;
  message: string | null;
  receivedAt: string;
  aiScore: number | null;
  aiReason: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
  property: { id: string; title: string; code: string } | null;
  contact: { id: string; name: string } | null;
  /** Az irodában már szereplő egyező ügyfelek (csak a még át nem alakított leadeknél). */
  duplicates: LeadDuplicate[];
}

export interface LeadListResult {
  items: LeadItem[];
  total: number;
  pageSize: number;
  counts: Record<"aktiv" | "uj" | "atalakitott" | "lezart", number>;
}
