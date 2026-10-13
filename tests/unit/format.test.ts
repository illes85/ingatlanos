import { describe, expect, it } from "vitest";
import {
  NBSP,
  calendarDaysBetween,
  dayPart,
  districtLabel,
  formatArea,
  formatDate,
  formatDateWithWeekday,
  formatHuf,
  formatInteger,
  formatMillions,
  formatPricePerSqm,
  formatRooms,
  formatShortAddress,
  formatShortDate,
  formatShortDateWithYear,
  formatSignedPercent,
  formatTime,
  formatWeekdayMonthDay,
  givenName,
  initials,
  toRoman,
} from "@/lib/format";

// A tesztekben olvashatóság kedvéért sima szóközt írunk, és NBSP-re cseréljük.
const s = (text: string) => text.replace(/ /g, NBSP);

describe("számok és pénz", () => {
  it("ezres tagolás nem törhető szóközzel, 4 jegyűnél is", () => {
    expect(formatInteger(1284)).toBe(s("1 284"));
    expect(formatInteger(14)).toBe("14");
    expect(formatHuf(1_840_000)).toBe(s("1 840 000 Ft"));
  });

  it("millió forintos rövid alak a terv szerint", () => {
    expect(formatMillions(94_500_000)).toBe(s("94,5 M Ft"));
    expect(formatMillions(72_000_000)).toBe(s("72,0 M Ft"));
    expect(formatMillions(412_500_000)).toBe(s("412,5 M Ft"));
    expect(formatMillions(94_500_000, { currency: false })).toBe(s("94,5 M"));
    expect(formatMillions(1_160_000, { decimals: 2, currency: false })).toBe(s("1,16 M"));
  });

  it("kompakt oszlopösszeg", () => {
    expect(formatMillions(312_000_000, { compact: true, currency: false })).toBe(s("312 M"));
    expect(formatMillions(79_900_000, { compact: true, currency: false })).toBe(s("79,9 M"));
    expect(formatMillions(74_000_000, { compact: true, currency: false })).toBe(s("74 M"));
    expect(formatMillions(1_240_000_000, { compact: true })).toBe(s("1,2 Mrd Ft"));
  });

  it("m²-ár, terület, szobák, százalék", () => {
    expect(formatPricePerSqm(738_000)).toBe(s("738 000 Ft/m²"));
    expect(formatPricePerSqm(1_250_000)).toBe(s("1 250 000 Ft/m²"));
    expect(formatArea(128)).toBe(s("128 m²"));
    expect(formatArea(76.5)).toBe(s("76,5 m²"));
    expect(formatRooms(4, 1)).toBe(s("4 + 1"));
    expect(formatRooms(2)).toBe("2");
    expect(formatSignedPercent(8.2)).toBe("+8,2%");
  });
});

describe("dátumok (Europe/Budapest)", () => {
  // 2026-10-02 11:30 UTC = 13:30 budapesti idő (CEST, UTC+2)
  const d = new Date("2026-10-02T11:30:00Z");

  it("teljes dátum és hét napja", () => {
    expect(formatDate(d)).toBe("2026. október 2.");
    expect(formatDateWithWeekday(d)).toBe("2026. október 2., péntek");
    expect(formatWeekdayMonthDay(d)).toBe("Péntek, október 2.");
  });

  it("rövid dátum és idő", () => {
    expect(formatShortDate(new Date("2026-09-28T10:00:00Z"))).toBe("szept. 28.");
    expect(formatShortDateWithYear(new Date("2027-01-14T10:00:00Z"))).toBe("2027. jan. 14.");
    expect(formatTime(d)).toBe("13:30");
  });

  it("naptári napok különbsége budapesti éjfél szerint", () => {
    expect(calendarDaysBetween("2026-10-02T22:30:00Z", "2026-10-03T06:00:00Z")).toBe(0);
    expect(calendarDaysBetween("2026-10-02T10:00:00Z", "2026-10-11T10:00:00Z")).toBe(9);
  });

  it("napszak a köszönéshez", () => {
    expect(dayPart(new Date("2026-10-02T05:00:00Z"))).toBe("morning"); // 07:00
    expect(dayPart(new Date("2026-10-02T10:00:00Z"))).toBe("day"); // 12:00
    expect(dayPart(new Date("2026-10-02T18:00:00Z"))).toBe("evening"); // 20:00
  });
});

describe("címek és nevek", () => {
  it("római kerületszám", () => {
    expect(toRoman(13)).toBe("XIII");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(23)).toBe("XXIII");
    expect(districtLabel(11)).toBe("XI.");
    expect(() => toRoman(0)).toThrow();
  });

  it("rövid cím", () => {
    expect(formatShortAddress({ city: "Budapest", district: 13, street: "Váci út" })).toBe(
      "Budapest XIII., Váci út",
    );
    expect(formatShortAddress({ city: "Gödöllő", street: "Szabadság út" })).toBe("Gödöllő, Szabadság út");
  });

  it("monogram és keresztnév", () => {
    expect(initials("Kiss Anna")).toBe("KA");
    expect(givenName("Kiss Anna")).toBe("Anna");
  });
});

describe("budapesti nap- és hónaphatárok", () => {
  it("nyári időszámításban (UTC+2)", async () => {
    const { budapestDayRange, budapestMonthStart } = await import("@/lib/format");
    const { start, end } = budapestDayRange(new Date("2026-10-02T11:30:00Z"));
    expect(start.toISOString()).toBe("2026-10-01T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-02T22:00:00.000Z");
    expect(budapestMonthStart(new Date("2026-10-02T11:30:00Z")).toISOString()).toBe("2026-09-30T22:00:00.000Z");
  });

  it("téli időszámítás váltásának napján (25 órás nap)", async () => {
    const { budapestDayRange } = await import("@/lib/format");
    const { start, end } = budapestDayRange(new Date("2026-10-25T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});
