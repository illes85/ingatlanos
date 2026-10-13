/**
 * Seed · fotók. A scripts/seed/photos/ mappából tölt fel (ingyenes licencű képek, lásd a mappa
 * README-jét). Ha a mappa üres, kihagyja: az app ilyenkor a terv tónusos helykitöltőit mutatja.
 * Mappák: exterior-house/, exterior-flat/, interior/, plot/ — .jpg / .webp fájlok.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Database } from "../../../src/types/database";
import { insert, type PropertyRef, type SeedContext } from "./core";

const ROOT = path.join(process.cwd(), "scripts", "seed", "photos");
const POOLS = ["exterior-house", "exterior-flat", "interior", "plot"] as const;
type Pool = (typeof POOLS)[number];

function listPool(pool: Pool): string[] {
  const dir = path.join(ROOT, pool);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.(jpe?g|webp)$/i.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

export async function seedPhotos(ctx: SeedContext, properties: PropertyRef[]): Promise<number> {
  const pools = Object.fromEntries(POOLS.map((p) => [p, listPool(p)])) as Record<Pool, string[]>;
  if (Object.values(pools).every((files) => files.length === 0)) return 0;

  // Egyszer töltjük fel a képkészletet a szervezet mappájába; a média-sorok erre hivatkoznak.
  const uploaded = new Map<string, string>();
  for (const pool of POOLS) {
    for (const file of pools[pool]) {
      const storagePath = `${ctx.orgId}/seed/${pool}/${path.basename(file)}`;
      const contentType = file.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg";
      const { error } = await ctx.admin.storage
        .from("property-media")
        .upload(storagePath, readFileSync(file), { contentType, upsert: true });
      if (error) throw new Error(`Fotó feltöltése (${file}): ${error.message}`);
      uploaded.set(file, storagePath);
    }
  }

  const rows: Database["public"]["Tables"]["property_media"]["Insert"][] = [];
  properties.forEach((property, index) => {
    const type = property.seed.type;
    const exteriorPool: Pool = type === "plot" ? "plot" : type === "house" || type === "holiday_home" ? "exterior-house" : "exterior-flat";
    const exterior = pools[exteriorPool].length ? pools[exteriorPool] : pools["exterior-house"];
    const picks: string[] = [];
    if (exterior.length) picks.push(exterior[index % exterior.length]!);
    if (type !== "plot") {
      for (let i = 0; i < 4 && pools.interior.length; i++) {
        picks.push(pools.interior[(index * 3 + i) % pools.interior.length]!);
      }
    }
    picks.forEach((file, order) => {
      rows.push({
        organization_id: ctx.orgId,
        property_id: property.id,
        kind: "photo",
        storage_path: uploaded.get(file)!,
        sort_order: order,
        is_cover: order === 0,
        is_public: true,
      });
    });
  });
  if (rows.length) await insert(ctx.admin, "property_media", rows);
  return rows.length;
}
