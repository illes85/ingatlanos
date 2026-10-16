import { describe, expect, it } from "vitest";
import { mockGeocode } from "@/lib/geocoding/mock";

describe("mock geokódoló", () => {
  it("budapesti kerületet a kerület közelébe helyezi", () => {
    const r = mockGeocode({ city: "Budapest", district: 11, street: "Bartók Béla út", houseNumber: "12" })!;
    expect(r.provider).toBe("mock");
    expect(r.precision).toBe("approximate");
    expect(r.lat).toBeGreaterThan(47.44);
    expect(r.lat).toBeLessThan(47.48);
    expect(r.lng).toBeGreaterThan(19.02);
    expect(r.lng).toBeLessThan(19.06);
  });

  it("ugyanarra a címre mindig ugyanazt adja, más címre mást", () => {
    const a = mockGeocode({ city: "Gödöllő", street: "Szabadság út", houseNumber: "3" });
    const b = mockGeocode({ city: "Gödöllő", street: "Szabadság út", houseNumber: "3" });
    const c = mockGeocode({ city: "Gödöllő", street: "Szabadság út", houseNumber: "4" });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("ismeretlen településre nem talál ki pozíciót", () => {
    expect(mockGeocode({ city: "Ismeretlenfalva" })).toBeNull();
  });

  it("a kerület nélküli budapesti cím a városközpontba esik", () => {
    const r = mockGeocode({ city: "budapest" })!;
    expect(r.lat).toBeGreaterThan(47.4);
    expect(r.lat).toBeLessThan(47.6);
  });
});
