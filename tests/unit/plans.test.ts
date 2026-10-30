import { describe, expect, it } from "vitest";
import {
  activeListingLimit,
  minimumPlanFor,
  monthlyCreditAllowance,
  normalizeSeats,
  quoteCreditPack,
  quotePlan,
} from "@/config/plans";

describe("csomagárak", () => {
  it("a Start ingyenes", () => {
    expect(quotePlan("start", "month").grossPeriod).toBe(0);
  });

  it("havi ár: nettó + 27% ÁFA", () => {
    const q = quotePlan("pro", "month");
    expect(q).toEqual({ netMonthly: 7_900, netPeriod: 7_900, vatPeriod: 2_133, grossPeriod: 10_033 });
  });

  it("éves fizetésnél −20% a havi díjra", () => {
    const q = quotePlan("pro_ai", "year");
    expect(q.netMonthly).toBe(19_920);
    expect(q.netPeriod).toBe(19_920 * 12);
  });

  it("az Iroda csomag: platformdíj + fejenként", () => {
    expect(quotePlan("office", "month", 5).netMonthly).toBe(9_900 + 5 * 14_900);
  });

  it("a férőhelyszám korlátos és egész", () => {
    expect(normalizeSeats("office", 0)).toBe(1);
    expect(normalizeSeats("office", 2.9)).toBe(2);
    expect(normalizeSeats("office", Number.NaN)).toBe(1);
    expect(normalizeSeats("pro", 7)).toBe(1);
  });

  it("kreditcsomag ÁFÁ-val", () => {
    expect(quoteCreditPack(4_900)).toEqual({ net: 4_900, vat: 1_323, gross: 6_223 });
  });
});

describe("limitek és funkciók", () => {
  it("az Iroda kerete fejenként számít", () => {
    expect(monthlyCreditAllowance("office", 4)).toBe(1_200);
    expect(monthlyCreditAllowance("pro_ai", 4)).toBe(400);
  });

  it("csak a Start korlátoz ingatlanszámot", () => {
    expect(activeListingLimit("start")).toBe(15);
    expect(activeListingLimit("pro")).toBeNull();
  });

  it("a minimális csomag a funkció szerint", () => {
    expect(minimumPlanFor("ai.listing_writer")).toBe("start");
    expect(minimumPlanFor("ai.buyer_matching")).toBe("pro");
    expect(minimumPlanFor("ai.assistant")).toBe("pro_ai");
    expect(minimumPlanFor("office.analytics")).toBe("office");
  });
});
