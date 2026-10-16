export interface GeocodeQuery {
  postalCode?: string | null;
  city: string;
  district?: number | null;
  street?: string | null;
  houseNumber?: string | null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** exact = címpont; approximate = terület-/településközép vagy közelítés. */
  precision: "exact" | "approximate";
  provider: string;
}
