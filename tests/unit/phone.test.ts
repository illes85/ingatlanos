import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("a magyar mobilszám minden gyakori alakját E.164-re hozza", () => {
    for (const input of ["+36 30 123 4567", "06 30 123 4567", "0036301234567", "36301234567", "(30) 123-4567", "06-30/123-45-67"]) {
      expect(normalizePhone(input)).toBe("+36301234567");
    }
  });

  it("a budapesti vezetékes számot is kezeli", () => {
    expect(normalizePhone("06 1 234 5678")).toBe("+3612345678");
    expect(normalizePhone("+36 1 234 5678")).toBe("+3612345678");
  });

  it("külföldi számnál megtartja a számjegyeket", () => {
    expect(normalizePhone("+43 660 1234567")).toBe("+436601234567");
    expect(normalizePhone("0043 660 1234567")).toBe("+436601234567");
  });

  it("értelmezhetetlen bemenetre null", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("nincs")).toBeNull();
    expect(normalizePhone("06 30 12")).toBeNull();
  });
});

describe("formatPhone", () => {
  it("a magyar számot olvasható csoportokra bontja", () => {
    expect(formatPhone("+36301234567")).toBe("+36 30 123 4567");
    expect(formatPhone("+3612345678")).toBe("+36 1 234 5678");
  });

  it("üres vagy külföldi számnál nem rontja el", () => {
    expect(formatPhone(null)).toBe("");
    expect(formatPhone("+436601234567")).toBe("+436601234567");
  });
});
