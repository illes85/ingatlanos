/** A demó iroda munkatársai és a látványtervben szereplő ügyfelek. */
import { DEMO_ACCOUNTS } from "../../../src/config/demo";

export type AgentKey = "anna" | "eszter" | "balint" | "peter" | "kinga";

export const STAFF: Record<AgentKey, { email: string; name: string; role: "owner" | "agent" | "assistant"; goal: number | null; license: string | null }> = {
  anna: { email: DEMO_ACCOUNTS.owner.email, name: DEMO_ACCOUNTS.owner.name, role: "owner", goal: 3_000_000, license: "IK-2014/08812" },
  eszter: { email: DEMO_ACCOUNTS.agent.email, name: DEMO_ACCOUNTS.agent.name, role: "agent", goal: 2_200_000, license: "IK-2018/11420" },
  balint: { email: "fodor.balint@kulcs-demo.test", name: "Fodor Bálint", role: "agent", goal: 2_000_000, license: "IK-2020/13377" },
  peter: { email: "szilagyi.peter@kulcs-demo.test", name: "Szilágyi Péter", role: "agent", goal: 1_800_000, license: "IK-2021/14051" },
  kinga: { email: DEMO_ACCOUNTS.assistant.email, name: DEMO_ACCOUNTS.assistant.name, role: "assistant", goal: null, license: null },
};

/** A második, egyéni szervezet (tenant-izolációs tesztekhez). */
export const SOLO_AGENT = { email: "lakatos.dora@kulcs-demo.test", name: "Lakatos Dóra", orgName: "Lakatos Dóra Ingatlan" };

type Role = "seller" | "buyer" | "tenant" | "landlord" | "investor" | "lawyer" | "mortgage_broker" | "other";

export interface NamedContact {
  key: string;
  name: string;
  roles: Role[];
  agent: AgentKey;
}

/** A tervekben név szerint szereplő ügyfelek — rögzített felelőssel. */
export const NAMED_CONTACTS: NamedContact[] = [
  { key: "varga-bence", name: "Varga Bence", roles: ["buyer"], agent: "anna" },
  { key: "horvath-judit", name: "Horváth Judit", roles: ["seller"], agent: "anna" },
  { key: "toth-marton", name: "Tóth Márton", roles: ["buyer"], agent: "anna" },
  { key: "szabo-reka", name: "Szabó Réka", roles: ["tenant"], agent: "anna" },
  { key: "nagy-eszter", name: "Nagy Eszter", roles: ["buyer"], agent: "anna" },
  { key: "kelemen-gabor", name: "Kelemen Gábor", roles: ["seller"], agent: "anna" },
  { key: "molnar-dora", name: "Molnár Dóra", roles: ["buyer"], agent: "eszter" },
  { key: "farkas-adam", name: "Farkas Ádám", roles: ["buyer"], agent: "balint" },
  { key: "kovacs-lilla", name: "Kovács Lilla", roles: ["buyer", "seller"], agent: "anna" },
  { key: "pinter-akos", name: "Pintér Ákos", roles: ["seller"], agent: "anna" },
  { key: "szucs-tamas", name: "Szűcs Tamás", roles: ["seller"], agent: "anna" },
  { key: "lakatos-peter", name: "Lakatos Péter", roles: ["seller"], agent: "anna" },
  { key: "balogh-erika", name: "Balogh Erika", roles: ["seller"], agent: "anna" },
  { key: "feher-zoltan", name: "Fehér Zoltán", roles: ["seller"], agent: "anna" },
  { key: "simon-daniel", name: "Simon Dániel", roles: ["buyer"], agent: "anna" },
  { key: "gal-noemi", name: "Gál Noémi", roles: ["buyer"], agent: "anna" },
  { key: "olah-krisztina", name: "Oláh Krisztina", roles: ["seller"], agent: "anna" },
  { key: "biro-laszlo", name: "Bíró László", roles: ["seller"], agent: "anna" },
  { key: "dr-kertesz-anita", name: "dr. Kertész Anita", roles: ["lawyer"], agent: "anna" },
  { key: "hegedus-mark", name: "Hegedűs Márk", roles: ["mortgage_broker"], agent: "eszter" },
];

export const LAST_NAMES = [
  "Nagy", "Kovács", "Tóth", "Szabó", "Horváth", "Varga", "Kiss", "Molnár", "Németh", "Farkas", "Balogh", "Papp",
  "Takács", "Juhász", "Lakatos", "Mészáros", "Oláh", "Simon", "Rácz", "Fekete", "Szilágyi", "Török", "Fehér", "Balázs",
  "Gál", "Kis", "Szűcs", "Kocsis", "Orsós", "Pintér", "Fodor", "Szalai", "Sipos", "Magyar", "Lukács", "Gulyás", "Biró",
  "Király", "Katona", "László", "Jakab", "Bogdán", "Sándor", "Boros", "Fazekas", "Kelemen", "Antal", "Somogyi",
];

export const FIRST_NAMES = [
  "Bence", "Máté", "Levente", "Dávid", "Ádám", "Dániel", "Balázs", "Gergő", "Péter", "Tamás", "Zoltán", "András",
  "László", "Gábor", "Márk", "Attila", "Norbert", "Krisztián", "Anna", "Eszter", "Réka", "Dóra", "Lilla", "Zsófia",
  "Noémi", "Kitti", "Judit", "Erika", "Katalin", "Viktória", "Boglárka", "Petra", "Nóra", "Ágnes", "Fanni", "Hanna",
];
