import type { Database } from "@/types/database";
import type { PropertyFormValues } from "./components/property-form";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

const str = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));

/** Adatbázissor → az űrlap kezdőértékei (minden mező szöveg, ahogy a böngésző kezeli). */
export function propertyToFormValues(p: PropertyRow, commissionPct: number | null): PropertyFormValues {
  return {
    title: p.title,
    transactionType: p.transaction_type,
    propertyType: p.property_type,
    subtype: str(p.subtype),
    price: str(p.price),
    areaSqm: str(p.area_sqm),
    lotSqm: str(p.lot_sqm),
    rooms: str(p.rooms),
    halfRooms: p.half_rooms ? String(p.half_rooms) : "",
    bathrooms: str(p.bathrooms),
    floor: str(p.floor),
    buildingFloors: str(p.building_floors),
    hasElevator: p.has_elevator ?? false,
    heating: str(p.heating),
    buildingMaterial: str(p.building_material),
    condition: str(p.condition),
    yearBuilt: str(p.year_built),
    energyRating: str(p.energy_rating),
    balconySqm: str(p.balcony_sqm),
    hasTerrace: p.has_terrace,
    gardenConnected: p.garden_connected,
    parking: str(p.parking),
    utilitiesMonthly: str(p.utilities_monthly),
    commonCostMonthly: str(p.common_cost_monthly),
    description: str(p.description),
    highlights: p.highlights.join(", "),
    postalCode: str(p.postal_code),
    city: p.city,
    district: str(p.district),
    street: str(p.street),
    houseNumber: str(p.house_number),
    floorDoor: str(p.floor_door),
    addressVisibility: p.address_visibility,
    mandateType: str(p.mandate_type),
    mandateStart: str(p.mandate_start),
    mandateExpiresAt: str(p.mandate_expires_at),
    commissionPct: str(commissionPct),
    responsibleAgentId: str(p.responsible_agent_id),
    visibility: p.visibility,
  };
}
