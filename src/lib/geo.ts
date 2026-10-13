export type LngLat = [lng: number, lat: number];

/** Pont-sokszögben teszt (ray casting). A sokszög nyitott lánc: az utolsó pont automatikusan összeér az elsővel. */
export function pointInPolygon(point: LngLat, polygon: readonly LngLat[]): boolean {
  if (polygon.length < 3) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function inBounds([lng, lat]: LngLat, b: Bounds): boolean {
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

/** A pontok befoglaló téglalapja; üres listára null. */
export function boundsOf(points: readonly LngLat[]): Bounds | null {
  if (points.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return { west, south, east, north };
}
