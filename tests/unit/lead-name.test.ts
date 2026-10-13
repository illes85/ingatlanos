import { describe, expect, it } from "vitest";
import { splitFullName } from "@/features/leads/name";

describe("splitFullName", () => {
  it("magyar sorrend: az első szó a vezetéknév", () => {
    expect(splitFullName("Szalai Hanna")).toEqual({ lastName: "Szalai", firstName: "Hanna" });
  });
  it("több keresztnevet egyben tart", () => {
    expect(splitFullName("Nagy Kovács Anna Mária")).toEqual({ lastName: "Nagy", firstName: "Kovács Anna Mária" });
  });
  it("egyetlen szónál csak vezetéknév", () => {
    expect(splitFullName("  Papp ")).toEqual({ lastName: "Papp", firstName: "" });
  });
  it("üres vagy hiányzó névnél üres", () => {
    expect(splitFullName("")).toEqual({ lastName: "", firstName: "" });
    expect(splitFullName(null)).toEqual({ lastName: "", firstName: "" });
  });
});
