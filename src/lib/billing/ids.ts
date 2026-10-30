import { createHash } from "node:crypto";

/**
 * Determinisztikus uuid szöveges kulcsból; azonos az SQL `app.det_uuid()` függvénnyel
 * (md5('kulcs:' || kulcs)::uuid). A kreditkönyvelés idempotencia-kulcsa.
 */
export function detUuid(key: string): string {
  const h = createHash("md5").update(`kulcs:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
