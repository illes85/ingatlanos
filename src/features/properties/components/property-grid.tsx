import { PropertyCard } from "@/components/domain/property-card";
import type { PropertyListItem } from "../types";

/** Rácsnézet: nagy fotós kártyák, 1–3 oszlopban. */
export function PropertyGrid({ items }: { items: PropertyListItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((property) => (
        <li key={property.id} className="flex">
          <PropertyCard property={property} />
        </li>
      ))}
    </ul>
  );
}
