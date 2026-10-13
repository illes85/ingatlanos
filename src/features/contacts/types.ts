import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export interface ContactListItem {
  id: string;
  fullName: string;
  company: string | null;
  roles: Enums["contact_role"][];
  phone: string | null;
  email: string | null;
  ownerId: string | null;
  ownerName: string | null;
  lastContactedAt: string | null;
  /** Hány napja volt az utolsó kapcsolat (null: még nem volt). */
  daysSinceContact: number | null;
  createdAt: string;
}

export interface DirectoryHit {
  id: string;
  fullName: string;
  roles: Enums["contact_role"][];
  ownerName: string | null;
}

export interface ContactListResult {
  items: ContactListItem[];
  total: number;
  pageSize: number;
  /** Ügynöknek: a keresésre az irodában talált, de nem általa kezelt ügyfelek (csak név és felelős). */
  directory: DirectoryHit[];
}
