/**
 * Demó fiókok — a seed (scripts/seed) ezekkel hozza létre a felhasználókat, a belépési
 * oldal pedig egy kattintással ezekkel léptet be (csak DEMO_MODE=true esetén).
 * A jelszó a DEMO_USER_PASSWORD környezeti változóból jön (.env.local), nem a kódból.
 * A .test TLD foglalt, valódi címre így soha nem megy levél.
 */
export const DEMO_ACCOUNTS = {
  owner: { email: "kiss.anna@kulcs-demo.test", name: "Kiss Anna" },
  agent: { email: "major.eszter@kulcs-demo.test", name: "Major Eszter" },
  assistant: { email: "toth.kinga@kulcs-demo.test", name: "Tóth Kinga" },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export const DEMO_ORG_NAME = "Kapu Ingatlaniroda";
