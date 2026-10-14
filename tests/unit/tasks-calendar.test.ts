import { describe, expect, it } from "vitest";
import { addDays, parseCalendarParams, visibleDays, weekStart } from "@/features/showings/calendar";
import { combineDueAt, repeatToRule, ruleToRepeat } from "@/features/tasks/recurrence";

describe("naptár-számítás", () => {
  it("a hét hétfővel kezdődik", () => {
    expect(weekStart("2026-10-14")).toBe("2026-10-12"); // szerda
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // vasárnap
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
  });
  it("napokat ad hozzá hónaphatáron át", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("érvénytelen dátum esetén a mai napot használja", () => {
    const now = new Date("2026-10-14T10:00:00Z");
    expect(parseCalendarParams({ datum: "2026-13-45" }, now).dateKey).toBe("2026-10-14");
    expect(parseCalendarParams({ datum: "alma" }, now).dateKey).toBe("2026-10-14");
    expect(parseCalendarParams({ datum: "2026-10-20", nezet: "nap" }, now)).toEqual({ view: "nap", dateKey: "2026-10-20" });
  });
  it("a hétnézet hét napot ad", () => {
    expect(visibleDays({ view: "het", dateKey: "2026-10-14" })).toHaveLength(7);
    expect(visibleDays({ view: "nap", dateKey: "2026-10-14" })).toEqual(["2026-10-14"]);
  });
});

describe("ismétlődő feladatok", () => {
  it("felismeri az RRULE gyakoriságát", () => {
    expect(ruleToRepeat("FREQ=WEEKLY;BYDAY=MO")).toBe("weekly");
    expect(ruleToRepeat(repeatToRule("monthly"))).toBe("monthly");
    expect(ruleToRepeat(null)).toBe("none");
    expect(ruleToRepeat("FREQ=YEARLY")).toBe("none");
  });
  it("a határidő budapesti idő szerint áll össze, időpont nélkül napvégi", () => {
    expect(combineDueAt("2026-10-14", "15:30").toISOString()).toBe("2026-10-14T13:30:00.000Z");
    expect(combineDueAt("2026-10-14", undefined).toISOString()).toBe("2026-10-14T21:59:00.000Z");
  });
});
