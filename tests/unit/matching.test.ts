import { describe, expect, it } from "vitest";
import { MIN_MATCH_SCORE, scoreMatch, type MatchableProfile, type MatchableProperty } from "@/features/properties/matching";

const property: MatchableProperty = {
  transactionType: "sale",
  propertyType: "house",
  price: 94_500_000,
  areaSqm: 128,
  rooms: 4,
  city: "Gödöllő",
  district: null,
};

const profile: MatchableProfile = {
  active: true,
  transactionType: "sale",
  propertyTypes: ["house"],
  priceMin: 70_000_000,
  priceMax: 100_000_000,
  areaMin: 100,
  areaMax: null,
  roomsMin: 4,
  cities: ["Gödöllő"],
  districts: [],
};

describe("scoreMatch", () => {
  it("tökéletes illeszkedésnél 100 pont", () => {
    expect(scoreMatch(property, profile).score).toBe(100);
  });

  it("a városnevet ékezet- és kisbetű-függetlenül hasonlítja", () => {
    expect(scoreMatch(property, { ...profile, cities: ["godollo"] }).score).toBe(100);
  });

  it("más város esetén a helyszín pontjai elvesznek", () => {
    expect(scoreMatch(property, { ...profile, cities: ["Dunakeszi"] }).score).toBe(75);
  });

  it("megadott terület hiányában semleges helyszínpontot ad", () => {
    expect(scoreMatch(property, { ...profile, cities: [] }).score).toBe(93);
  });

  it("budapesti kerület alapján is illeszt", () => {
    const flat: MatchableProperty = { ...property, propertyType: "flat", city: "Budapest", district: 13 };
    const buyer: MatchableProfile = { ...profile, propertyTypes: ["flat"], cities: [], districts: [13] };
    expect(scoreMatch(flat, buyer).score).toBe(100);
  });

  it("a kereten kicsit túllépő ár csökkenti a pontot, a nagy túllépés kizár", () => {
    expect(scoreMatch({ ...property, price: 104_000_000 }, profile).score).toBe(86);
    expect(scoreMatch({ ...property, price: 130_000_000 }, profile).score).toBeNull();
  });

  it("a keret alatti ár kisebb levonással jár", () => {
    expect(scoreMatch({ ...property, price: 60_000_000 }, profile).score).toBe(93);
  });

  it("kizárja a más ügylettípust, ingatlantípust és az inaktív profilt", () => {
    expect(scoreMatch({ ...property, transactionType: "rent" }, profile).score).toBeNull();
    expect(scoreMatch({ ...property, propertyType: "flat" }, profile).score).toBeNull();
    expect(scoreMatch(property, { ...profile, active: false }).score).toBeNull();
  });

  it("eggyel kevesebb szobánál részpontot ad", () => {
    expect(scoreMatch({ ...property, rooms: 3 }, profile).score).toBe(94);
    expect(scoreMatch({ ...property, rooms: 2 }, profile).score).toBe(90);
  });

  it("az ajánlási küszöb 50", () => {
    expect(MIN_MATCH_SCORE).toBe(50);
  });
});
