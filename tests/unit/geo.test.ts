import { describe, expect, it } from "vitest";
import { boundsOf, inBounds, pointInPolygon, type LngLat } from "@/lib/geo";

const square: LngLat[] = [
  [19.0, 47.0],
  [19.2, 47.0],
  [19.2, 47.2],
  [19.0, 47.2],
];

describe("pointInPolygon", () => {
  it("a belső pontot felismeri", () => {
    expect(pointInPolygon([19.1, 47.1], square)).toBe(true);
  });

  it("a külső pontot kizárja", () => {
    expect(pointInPolygon([19.3, 47.1], square)).toBe(false);
    expect(pointInPolygon([19.1, 46.9], square)).toBe(false);
  });

  it("konkáv alakzatnál is jól dönt", () => {
    const l: LngLat[] = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4]];
    expect(pointInPolygon([0.5, 3], l)).toBe(true);
    expect(pointInPolygon([3, 3], l)).toBe(false);
  });

  it("három pontnál kevesebből nem lehet sokszög", () => {
    expect(pointInPolygon([0, 0], [[0, 0], [1, 1]])).toBe(false);
  });
});

describe("bounds", () => {
  it("a pontok befoglaló téglalapját adja", () => {
    expect(boundsOf(square)).toEqual({ west: 19.0, south: 47.0, east: 19.2, north: 47.2 });
    expect(boundsOf([])).toBeNull();
  });

  it("a határon lévő pont még a téglalapban van", () => {
    const b = boundsOf(square)!;
    expect(inBounds([19.0, 47.0], b)).toBe(true);
    expect(inBounds([19.21, 47.0], b)).toBe(false);
  });
});
