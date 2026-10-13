import { describe, expect, it } from "vitest";
import { parsePropertyForm, toPropertyRow } from "@/features/properties/schema";
import { DEFAULT_FILTERS, parsePropertyFilters, propertyFiltersToParams } from "@/features/properties/filters";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = { title: "Napfényes lakás", transactionType: "sale", propertyType: "flat", price: "45 000 000", city: "Szeged" };

describe("parsePropertyForm", () => {
  it("elfogad egy minimális, érvényes űrlapot, és szóközös árat is értelmez", () => {
    const result = parsePropertyForm(form(valid));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.price).toBe(45_000_000);
  });

  it("mezőnként jelzi a hiányzó kötelező értékeket", () => {
    const result = parsePropertyForm(form({ transactionType: "sale", propertyType: "flat" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.title).toBe("required");
      expect(result.fieldErrors.price).toBe("required");
      expect(result.fieldErrors.city).toBe("required");
    }
  });

  it("hibás számot és dátumtartományt jelez", () => {
    const bad = parsePropertyForm(form({ ...valid, areaSqm: "sok" }));
    expect(bad.ok === false && bad.fieldErrors.areaSqm).toBe("number");
    const dates = parsePropertyForm(form({ ...valid, mandateStart: "2026-12-01", mandateExpiresAt: "2026-06-01" }));
    expect(dates.ok === false && dates.fieldErrors.mandateExpiresAt).toBe("range");
  });

  it("a vesszős kiemeléseket listává bontja és csonkolja a felesleget", () => {
    const result = parsePropertyForm(form({ ...valid, highlights: "Napelem, Dupla garázs , ,Csendes utca" }));
    expect(result.ok && result.data.highlights).toEqual(["Napelem", "Dupla garázs", "Csendes utca"]);
  });
});

describe("toPropertyRow", () => {
  it("a kerületet csak budapesti címnél tartja meg", () => {
    const budapest = parsePropertyForm(form({ ...valid, city: "Budapest", district: "13" }));
    const szeged = parsePropertyForm(form({ ...valid, district: "13" }));
    expect(budapest.ok && toPropertyRow(budapest.data).district).toBe(13);
    expect(szeged.ok && toPropertyRow(szeged.data).district).toBeNull();
  });

  it("liftet csak lakásnál tárol", () => {
    const house = parsePropertyForm(form({ ...valid, propertyType: "house", hasElevator: "on" }));
    expect(house.ok && toPropertyRow(house.data).has_elevator).toBeNull();
  });
});

describe("ingatlan-szűrők az URL-ben", () => {
  it("oda-vissza alakítva megőrzi a szűrőket, az alapértékek kimaradnak", () => {
    const filters = { ...DEFAULT_FILTERS, transaction: "sale" as const, types: ["flat" as const, "house" as const], roomsMin: 3, priceMaxM: 100, q: "gödöllő" };
    const params = propertyFiltersToParams(filters);
    expect(params.toString()).not.toContain("nezet");
    expect(parsePropertyFilters(params)).toEqual(filters);
  });

  it("ismeretlen vagy hibás paraméternél az alapértékre esik vissza", () => {
    const parsed = parsePropertyFilters({ nezet: "xx", szoba: "-5", tip: "flat,hajó", oldal: "0" });
    expect(parsed.view).toBe("racs");
    expect(parsed.roomsMin).toBeNull();
    expect(parsed.types).toEqual(["flat"]);
    expect(parsed.page).toBe(1);
  });
});
