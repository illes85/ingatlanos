import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

export interface PublicPropertyData {
  title: string;
  transaction_type: "sale" | "rent";
  property_type: "flat" | "house" | "plot" | "office" | "retail" | "holiday_home";
  subtype: string | null;
  status: "active" | "under_offer" | "reserved";
  price: number;
  area_sqm: number | null;
  rooms: number | null;
  half_rooms: number;
  bathrooms: number | null;
  floor: number | null;
  building_floors: number | null;
  has_elevator: boolean | null;
  heating: string | null;
  condition: string | null;
  year_built: number | null;
  energy_rating: string | null;
  balcony_sqm: number | null;
  has_terrace: boolean;
  garden_connected: boolean;
  parking: string | null;
  lot_sqm: number | null;
  utilities_monthly: number | null;
  common_cost_monthly: number | null;
  description: string | null;
  highlights: string[];
  address_visibility: "exact" | "street" | "area";
  city: string;
  district: number | null;
  postal_code: string | null;
  street: string | null;
  house_number: string | null;
  photos: { path: string; caption: string | null }[];
  agent: { name: string | null; phone: string | null; email: string | null; license: string | null };
  office: string | null;
}

export interface PublicProperty extends Omit<PublicPropertyData, "photos"> {
  photos: { url: string; caption: string | null }[];
}

/** Az első fotó hosszabb (24 órás) élettartamú URL-je a megosztási előnézethez (a közösségi oldalak gyorsítótárazzák). */
const PREVIEW_SECONDS = 24 * 3600;
const PAGE_SECONDS = 3600;

/** A nyilvános oldal adata az anon függvényen át, a fotók aláírt URL-jeivel. Hiányzó vagy kikapcsolt oldal: null. */
export async function getPublicProperty(slug: string): Promise<PublicProperty | null> {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("get_public_property", { p_slug: slug });
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const property = data as unknown as PublicPropertyData;

  const paths = property.photos.map((p) => p.path);
  const [first, rest] = await Promise.all([
    paths.length > 0 ? supabase.storage.from("property-media").createSignedUrl(paths[0]!, PREVIEW_SECONDS) : null,
    paths.length > 1 ? supabase.storage.from("property-media").createSignedUrls(paths.slice(1), PAGE_SECONDS) : null,
  ]);
  const urls = [first?.data?.signedUrl, ...(rest?.data ?? []).map((s) => s.signedUrl)];
  const photos = property.photos
    .map((p, i) => ({ url: urls[i], caption: p.caption }))
    .filter((p): p is { url: string; caption: string | null } => Boolean(p.url));
  return { ...property, photos };
}
