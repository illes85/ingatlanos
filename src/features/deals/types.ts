import type { DealSide, DealStage } from "@/config/pipeline";
import type { Database } from "@/types/database";

export type DealStatus = Database["public"]["Enums"]["deal_status"];
export type PropertyType = Database["public"]["Enums"]["property_type"];

export interface DealCardData {
  id: string;
  side: DealSide;
  stage: DealStage;
  status: DealStatus;
  title: string;
  propertyId: string | null;
  propertyType: PropertyType | null;
  coverUrl: string | null;
  contactName: string | null;
  agentName: string | null;
  expectedValue: number | null;
  daysInStage: number;
  /** A jelenlegi felhasználó mozgathatja-e (owner vagy a felelős ügynök). */
  canMove: boolean;
}

export interface DealBoard {
  side: DealSide;
  deals: DealCardData[];
  openCount: number;
  weightedValue: number;
}
