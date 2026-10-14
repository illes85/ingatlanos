import { describe, expect, it } from "vitest";
import { makePublicSlug, slugify } from "@/features/public-page/slug";

describe("nyilvános link", () => {
  it("ékezetmentes, kötőjeles szlaget készít", () => {
    expect(slugify("Napfényes lakás, Újbuda – II. emelet!")).toBe("napfenyes-lakas-ujbuda-ii-emelet");
    expect(slugify("   ")).toBe("");
  });
  it("a végződés véletlen, a link megfelel a nyilvános oldal mintájának", () => {
    const a = makePublicSlug("Családi ház kertkapcsolattal");
    const b = makePublicSlug("Családi ház kertkapcsolattal");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-z0-9-]{8,120}$/);
    expect(makePublicSlug("")).toMatch(/^[a-z0-9]{8}$/);
  });
});
