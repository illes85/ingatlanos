import { z } from "zod";
import type { Database } from "@/types/database";

type Insert = Database["public"]["Tables"]["properties"]["Insert"];

export const PROPERTY_FORM_ERRORS = ["required", "number", "date", "tooLong", "choice", "range"] as const;
export type PropertyFormError = (typeof PROPERTY_FORM_ERRORS)[number];

export const PROPERTY_FIELDS = [
  "title", "transactionType", "propertyType", "subtype", "price", "areaSqm", "lotSqm", "rooms", "halfRooms", "bathrooms", "floor",
  "buildingFloors", "heating", "buildingMaterial", "condition", "yearBuilt", "energyRating", "balconySqm", "parking", "utilitiesMonthly",
  "commonCostMonthly", "description", "highlights", "postalCode", "city", "district", "street", "houseNumber", "floorDoor",
  "addressVisibility", "lat", "lng", "mandateType", "mandateStart", "mandateExpiresAt", "commissionPct", "responsibleAgentId", "visibility",
] as const;
export type PropertyField = (typeof PROPERTY_FIELDS)[number];

const ENERGY = ["AA++", "AA+", "AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II", "JJ"] as const;

/** Üres szöveg → undefined, hogy az opcionális mezők ne hibázzanak. */
const blank = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const text = (max: number) => z.preprocess(blank, z.string().trim().max(max, "tooLong").optional());
const num = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z.preprocess(
    (v) => (typeof v === "string" ? blank(v.replace(/\s/g, "").replace(",", ".")) : v),
    z.coerce.number({ error: "number" }).min(min, "range").max(max, "range").optional(),
  );
const int = (min = 0, max = 100_000) => num(min, max).refine((v) => v === undefined || Number.isInteger(v), "number");
const date = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date").optional());
const uuid = z.preprocess(blank, z.uuid("choice").optional());

export const propertySchema = z
  .object({
    title: z.string({ error: "required" }).trim().min(3, "required").max(140, "tooLong"),
    transactionType: z.enum(["sale", "rent"], { error: "choice" }),
    propertyType: z.enum(["flat", "house", "plot", "office", "retail", "holiday_home"], { error: "choice" }),
    subtype: text(60),
    price: num(1, 100_000_000_000).refine((v) => v !== undefined, "required"),
    areaSqm: num(1, 1_000_000),
    lotSqm: num(0, 100_000_000),
    rooms: int(0, 50),
    halfRooms: int(0, 20),
    bathrooms: int(0, 30),
    floor: int(-5, 100),
    buildingFloors: int(0, 100),
    hasElevator: z.preprocess((v) => v === "on", z.boolean()),
    heating: text(60),
    buildingMaterial: text(60),
    condition: text(60),
    yearBuilt: int(1000, 2100),
    energyRating: z.preprocess(blank, z.enum(ENERGY, "choice").optional()),
    balconySqm: num(0, 10_000),
    hasTerrace: z.preprocess((v) => v === "on", z.boolean()),
    gardenConnected: z.preprocess((v) => v === "on", z.boolean()),
    parking: text(60),
    utilitiesMonthly: int(0, 100_000_000),
    commonCostMonthly: int(0, 100_000_000),
    description: text(8000),
    highlights: z.preprocess(
      (v) => (typeof v === "string" ? v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12) : []),
      z.array(z.string().max(40, "tooLong")),
    ),
    postalCode: text(10),
    city: z.string({ error: "required" }).trim().min(2, "required").max(80, "tooLong"),
    district: int(1, 23),
    street: text(120),
    houseNumber: text(20),
    floorDoor: text(30),
    addressVisibility: z.enum(["exact", "street", "area"], { error: "choice" }).default("street"),
    lat: num(-90, 90),
    lng: num(-180, 180),
    mandateType: z.preprocess(blank, z.enum(["exclusive", "non_exclusive"], "choice").optional()),
    mandateStart: date,
    mandateExpiresAt: date,
    commissionPct: num(0, 100),
    responsibleAgentId: uuid,
    visibility: z.enum(["office", "private"], { error: "choice" }).default("office"),
  })
  .refine((v) => !v.mandateStart || !v.mandateExpiresAt || v.mandateStart <= v.mandateExpiresAt, { path: ["mandateExpiresAt"], message: "range" });

export type PropertyInput = z.infer<typeof propertySchema>;

export type ParseResult = { ok: true; data: PropertyInput } | { ok: false; fieldErrors: Partial<Record<PropertyField, PropertyFormError>> };

/** FormData → ellenőrzött értékek, vagy mezőnkénti hibakulcsok (az űrlap a messages „properties.form.errors” ágán fordítja). */
export function parsePropertyForm(formData: FormData): ParseResult {
  const raw: Record<string, FormDataEntryValue | undefined> = {};
  for (const key of [...PROPERTY_FIELDS, "hasElevator", "hasTerrace", "gardenConnected"]) {
    const value = formData.get(key);
    raw[key] = value === null ? undefined : value;
  }
  const result = propertySchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<PropertyField, PropertyFormError>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as PropertyField | undefined;
    const key = (PROPERTY_FORM_ERRORS as readonly string[]).includes(issue.message) ? (issue.message as PropertyFormError) : "required";
    if (field && !fieldErrors[field]) fieldErrors[field] = key;
  }
  return { ok: false, fieldErrors };
}

/** Űrlapértékek → adatbázissor. A kerület csak budapesti ingatlanoknál marad meg. */
export function toPropertyRow(input: PropertyInput): Omit<Insert, "organization_id" | "code"> {
  const isBudapest = input.city.trim().toLowerCase() === "budapest";
  return {
    title: input.title,
    transaction_type: input.transactionType,
    property_type: input.propertyType,
    subtype: input.subtype ?? null,
    price: input.price!,
    area_sqm: input.areaSqm ?? null,
    lot_sqm: input.lotSqm ?? null,
    rooms: input.rooms ?? null,
    half_rooms: input.halfRooms ?? 0,
    bathrooms: input.bathrooms ?? null,
    floor: input.floor ?? null,
    building_floors: input.buildingFloors ?? null,
    has_elevator: input.propertyType === "flat" ? input.hasElevator : null,
    heating: input.heating ?? null,
    building_material: input.buildingMaterial ?? null,
    condition: input.condition ?? null,
    year_built: input.yearBuilt ?? null,
    energy_rating: input.energyRating ?? null,
    balcony_sqm: input.balconySqm ?? null,
    has_terrace: input.hasTerrace,
    garden_connected: input.gardenConnected,
    parking: input.parking ?? null,
    utilities_monthly: input.utilitiesMonthly ?? null,
    common_cost_monthly: input.commonCostMonthly ?? null,
    description: input.description ?? null,
    highlights: input.highlights,
    postal_code: input.postalCode ?? null,
    city: input.city,
    district: isBudapest ? (input.district ?? null) : null,
    street: input.street ?? null,
    house_number: input.houseNumber ?? null,
    floor_door: input.floorDoor ?? null,
    address_visibility: input.addressVisibility,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    mandate_type: input.mandateType ?? null,
    mandate_start: input.mandateStart ?? null,
    mandate_expires_at: input.mandateExpiresAt ?? null,
    responsible_agent_id: input.responsibleAgentId ?? null,
    visibility: input.visibility,
  };
}
