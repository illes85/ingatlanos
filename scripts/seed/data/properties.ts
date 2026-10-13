/**
 * ~40 valószerű ingatlan Budapest több kerületében és a Pest megyei agglomerációban.
 * A látványtervben szereplő tételek (Gödöllő, Szabadság út; Budapest XIII., Váci út; …) rögzítve.
 * `stage`: az eladói ügylet szakasza (ha van); `stageDays`: hány napja van abban a szakaszban.
 */
import type { AgentKey } from "./people";
import type { PlaceKey } from "./places";

type PType = "flat" | "house" | "plot" | "office" | "retail" | "holiday_home";
type Stage = "acquisition" | "assessment" | "mandate_signed" | "listed" | "offer" | "deposit" | "contract" | "closed";

export interface SeedProperty {
  key: string;
  place: PlaceKey;
  street: string;
  houseNo: string;
  title: string;
  type: PType;
  subtype: string;
  price: number;
  area: number;
  lot?: number;
  rooms: number;
  half?: number;
  floor?: number;
  floors?: number;
  elevator?: boolean;
  heating: string;
  material: string;
  condition: string;
  year: number;
  energy: "AA++" | "AA+" | "AA" | "BB" | "CC" | "DD" | "EE" | "FF" | "GG" | "HH" | "II" | "JJ";
  agent: AgentKey;
  seller?: string;
  mandate?: "exclusive" | "non_exclusive";
  mandateDays?: number;
  stage?: Stage;
  stageDays?: number;
  createdDaysAgo: number;
  highlights: string[];
  garden?: boolean;
  terrace?: boolean;
  parking?: string;
  rent?: boolean;
  description?: string;
  commissionPct?: number;
}

export const SEED_PROPERTIES: SeedProperty[] = [
  // ------------------------------------------------------------ a tervből
  {
    key: "godollo-szabadsag", place: "godollo", street: "Szabadság út", houseNo: "41", title: "Családi ház kertkapcsolattal, csendes utcában",
    type: "house", subtype: "családi ház", price: 94_500_000, area: 128, lot: 620, rooms: 4, half: 1, heating: "gas_condensing", material: "brick",
    condition: "excellent", year: 2008, energy: "BB", agent: "anna", seller: "kelemen-gabor", mandate: "exclusive", mandateDays: 104, stage: "listed",
    stageDays: 12, createdDaysAgo: 30, highlights: ["Kertkapcsolatos", "Napelem", "Dupla garázs", "Terasz", "Csendes utca"], garden: true, terrace: true,
    parking: "garage", commissionPct: 3,
    description: "Gödöllő csendes, kertvárosi részén, a Szabadság úton eladó ez a 2008-ban épült, 128 m²-es, 4 + 1 szobás családi ház 620 m²-es, gondozott telekkel. A nappali és a konyha közvetlenül a teraszra és a kertre nyílik. Fűtése gázcirkó, a tetőn 4 kW-os napelem. Dupla garázs, automata kapu, öntözőrendszer.",
  },
  {
    key: "bp13-vaci", place: "bp-13", street: "Váci út", houseNo: "84", title: "Világos 2 szobás lakás panorámával a Váci úton", type: "flat", subtype: "tégla lakás",
    price: 64_900_000, area: 58, rooms: 2, floor: 6, floors: 8, elevator: true, heating: "district", material: "brick", condition: "renovated", year: 2004,
    energy: "CC", agent: "anna", seller: "biro-laszlo", mandate: "exclusive", mandateDays: 61, stage: "offer", stageDays: 3, createdDaysAgo: 41,
    highlights: ["Panorámás", "Lift", "Erkély"], parking: "underground", commissionPct: 3,
  },
  {
    key: "dunakeszi-baratsag", place: "dunakeszi", street: "Barátság útja", houseNo: "12/B", title: "Új építésű ikerházfél kerttel", type: "house", subtype: "ikerház",
    price: 84_900_000, area: 112, lot: 410, rooms: 3, half: 1, heating: "heat_pump", material: "brick", condition: "new", year: 2025, energy: "AA",
    agent: "anna", seller: "pinter-akos", mandate: "exclusive", mandateDays: 178, stage: "mandate_signed", stageDays: 1, createdDaysAgo: 2,
    highlights: ["Hőszivattyú", "Kertkapcsolatos", "Új építés"], garden: true, parking: "carport", commissionPct: 2.8,
  },
  {
    key: "szentendre-paprét", place: "szentendre", street: "Pap-rét", houseNo: "7", title: "3 szobás lakás a Dunakanyar kapujában", type: "flat", subtype: "tégla lakás",
    price: 72_000_000, area: 76, rooms: 3, floor: 1, floors: 3, elevator: false, heating: "gas_condensing", material: "brick", condition: "good", year: 1998,
    energy: "CC", agent: "anna", seller: "olah-krisztina", mandate: "exclusive", mandateDays: 9, stage: "listed", stageDays: 6, createdDaysAgo: 96,
    highlights: ["Csendes", "Közel a HÉV-hez"], parking: "street", commissionPct: 3,
  },
  {
    key: "budaors-kamaraerdei", place: "budaors", street: "Kamaraerdei út", houseNo: "23", title: "Sorházi lakás az erdő szélén", type: "house", subtype: "sorház",
    price: 98_500_000, area: 118, lot: 220, rooms: 4, heating: "gas_condensing", material: "brick", condition: "good", year: 2012, energy: "BB",
    agent: "anna", seller: "lakatos-peter", mandate: "non_exclusive", mandateDays: 70, stage: "listed", stageDays: 18, createdDaysAgo: 52,
    highlights: ["Erdő közelében", "Saját kert", "Gépkocsibeálló"], garden: true, parking: "carport", commissionPct: 2.5,
  },
  {
    key: "veresegyhaz-fo", place: "veresegyhaz", street: "Fő út", houseNo: "118", title: "Kertkapcsolatos lakás a tó közelében", type: "flat", subtype: "tégla lakás",
    price: 59_900_000, area: 68, rooms: 3, floor: 0, floors: 2, heating: "gas_condensing", material: "brick", condition: "renovated", year: 2007, energy: "BB",
    agent: "anna", seller: "kovacs-lilla", mandate: "exclusive", mandateDays: 40, stage: "deposit", stageDays: 9, createdDaysAgo: 75,
    highlights: ["Kertkapcsolatos", "Tó közelében"], garden: true, parking: "own", commissionPct: 3,
  },
  {
    key: "bp11-bartok", place: "bp-11", street: "Bartók Béla út", houseNo: "52", title: "Polgári lakás a Bartók Béla úton", type: "flat", subtype: "tégla lakás",
    price: 79_900_000, area: 71, rooms: 2, half: 1, floor: 3, floors: 5, elevator: true, heating: "house_central", material: "brick", condition: "renovated",
    year: 1912, energy: "DD", agent: "anna", seller: "olah-krisztina", mandate: "exclusive", mandateDays: 50, stage: "deposit", stageDays: 11, createdDaysAgo: 88,
    highlights: ["Belmagasság 3,4 m", "Felújított", "Lift"], commissionPct: 3,
  },
  {
    key: "kerepes-szilasliget", place: "kerepes", street: "Szilasliget, Mátyás király utca", houseNo: "9", title: "Felújított családi ház Szilasligeten", type: "house",
    subtype: "családi ház", price: 74_000_000, area: 104, lot: 780, rooms: 3, half: 1, heating: "gas_condensing", material: "brick", condition: "renovated",
    year: 1986, energy: "CC", agent: "anna", seller: "biro-laszlo", mandate: "exclusive", mandateDays: 60, stage: "contract", stageDays: 5, createdDaysAgo: 120,
    highlights: ["Nagy telek", "Felújított"], garden: true, parking: "garage", commissionPct: 3,
  },
  {
    key: "fot-vorosmarty", place: "fot", street: "Vörösmarty tér", houseNo: "3", title: "Családi ház a fóti központban", type: "house", subtype: "családi ház",
    price: 64_000_000, area: 96, lot: 540, rooms: 3, heating: "gas_condensing", material: "brick", condition: "good", year: 1994, energy: "CC", agent: "anna",
    seller: "kovacs-lilla", mandate: "exclusive", mandateDays: 0, stage: "closed", stageDays: 9, createdDaysAgo: 160, highlights: ["Központ közeli"], garden: true,
    commissionPct: 3,
  },
  {
    key: "godollo-isaszegi", place: "godollo", street: "Isaszegi út", houseNo: "15", title: "Kétgenerációs ház Gödöllőn", type: "house", subtype: "családi ház",
    price: 89_000_000, area: 168, lot: 900, rooms: 5, heating: "gas_condensing", material: "brick", condition: "good", year: 1999, energy: "CC", agent: "anna",
    seller: "pinter-akos", mandate: "exclusive", mandateDays: 0, stage: "closed", stageDays: 2, createdDaysAgo: 140, highlights: ["Kétgenerációs", "Nagy telek"],
    garden: true, commissionPct: 2.8,
  },
  {
    key: "szentendre-bukkos", place: "szentendre", street: "Bükkös part", houseNo: "31", title: "Lakás a Bükkös-patak mentén", type: "flat", subtype: "tégla lakás",
    price: 68_000_000, area: 72, rooms: 3, floor: 2, floors: 3, heating: "gas_condensing", material: "brick", condition: "good", year: 2001, energy: "CC",
    agent: "anna", seller: "horvath-judit", stage: "acquisition", stageDays: 2, createdDaysAgo: 4, highlights: ["Patakparti"],
  },
  {
    key: "mogyorod-hegy", place: "mogyorod", street: "Hegy utca", houseNo: "6", title: "Panorámás családi ház Mogyoródon", type: "house", subtype: "családi ház",
    price: 89_000_000, area: 146, lot: 1020, rooms: 4, half: 1, heating: "gas_condensing", material: "brick", condition: "good", year: 2005, energy: "BB",
    agent: "anna", seller: "feher-zoltan", stage: "acquisition", stageDays: 5, createdDaysAgo: 6, highlights: ["Panoráma", "Nagy telek"], garden: true,
  },
  {
    key: "bp14-thokoly", place: "bp-14", street: "Thököly út", houseNo: "118", title: "2,5 szobás lakás a Thököly úton", type: "flat", subtype: "tégla lakás",
    price: 56_500_000, area: 57, rooms: 2, half: 1, floor: 2, floors: 4, elevator: false, heating: "gas_individual", material: "brick", condition: "to_renovate",
    year: 1930, energy: "EE", agent: "anna", seller: "balogh-erika", stage: "assessment", stageDays: 4, createdDaysAgo: 8, highlights: ["Felújítandó"],
  },
  {
    key: "godollo-blaha", place: "godollo", street: "Blaha Lujza utca", houseNo: "22", title: "Felújított ikerház Gödöllő belvárosában", type: "house", subtype: "ikerház",
    price: 69_900_000, area: 92, lot: 380, rooms: 3, heating: "gas_condensing", material: "brick", condition: "renovated", year: 1978, energy: "CC", agent: "anna",
    seller: "szucs-tamas", mandate: "exclusive", mandateDays: 175, stage: "mandate_signed", stageDays: 6, createdDaysAgo: 10, highlights: ["Belváros"], garden: true,
    commissionPct: 3,
  },
  // ------------------------------------------------------------ további állomány
  { key: "bp2-pasareti", place: "bp-2", street: "Pasaréti út", houseNo: "61", title: "Kertes lakás Pasaréten", type: "flat", subtype: "tégla lakás", price: 129_000_000, area: 82, rooms: 3, floor: 0, floors: 3, heating: "gas_condensing", material: "brick", condition: "excellent", year: 2016, energy: "AA", agent: "eszter", mandate: "exclusive", mandateDays: 120, stage: "listed", stageDays: 9, createdDaysAgo: 34, highlights: ["Kertkapcsolatos", "Garázs"], garden: true, parking: "garage", commissionPct: 2.5 },
  { key: "bp2-hukovszki", place: "bp-2", street: "Hűvösvölgyi út", houseNo: "102", title: "Családi ház a Hűvösvölgyben", type: "house", subtype: "családi ház", price: 239_000_000, area: 210, lot: 820, rooms: 5, half: 1, heating: "heat_pump", material: "brick", condition: "excellent", year: 2019, energy: "AA+", agent: "eszter", mandate: "exclusive", mandateDays: 150, stage: "listed", stageDays: 21, createdDaysAgo: 40, highlights: ["Medence", "Hőszivattyú"], garden: true, parking: "garage", commissionPct: 2.5 },
  { key: "bp3-bechtel", place: "bp-3", street: "Bécsi út", houseNo: "271", title: "Erkélyes lakás Óbudán", type: "flat", subtype: "tégla lakás", price: 61_500_000, area: 54, rooms: 2, floor: 4, floors: 6, elevator: true, heating: "district", material: "brick", condition: "good", year: 2009, energy: "CC", agent: "balint", mandate: "non_exclusive", mandateDays: 80, stage: "listed", stageDays: 7, createdDaysAgo: 25, highlights: ["Erkély"], parking: "underground" },
  { key: "bp3-panel", place: "bp-3", street: "Vörösvári út", houseNo: "88", title: "Felújított panellakás Óbudán", type: "flat", subtype: "panel lakás", price: 46_900_000, area: 53, rooms: 2, floor: 7, floors: 10, elevator: true, heating: "district", material: "panel", condition: "renovated", year: 1976, energy: "DD", agent: "peter", mandate: "non_exclusive", mandateDays: 45, stage: "offer", stageDays: 5, createdDaysAgo: 60, highlights: ["Felújított"] },
  { key: "bp6-andrassy", place: "bp-6", street: "Andrássy út", houseNo: "88", title: "Elegáns polgári lakás az Andrássy úton", type: "flat", subtype: "tégla lakás", price: 159_000_000, area: 112, rooms: 3, half: 1, floor: 2, floors: 4, elevator: true, heating: "gas_individual", material: "brick", condition: "excellent", year: 1890, energy: "DD", agent: "eszter", mandate: "exclusive", mandateDays: 90, stage: "listed", stageDays: 15, createdDaysAgo: 50, highlights: ["Világörökség", "Belmagasság"], commissionPct: 3 },
  { key: "bp6-kiado", place: "bp-6", street: "Király utca", houseNo: "40", title: "Kiadó bútorozott lakás a Király utcában", type: "flat", subtype: "tégla lakás", price: 340_000, area: 48, rooms: 1, half: 1, floor: 3, floors: 4, elevator: true, heating: "gas_individual", material: "brick", condition: "renovated", year: 1900, energy: "EE", agent: "peter", mandate: "non_exclusive", mandateDays: 60, createdDaysAgo: 12, highlights: ["Bútorozott"], rent: true },
  { key: "bp8-jozsef", place: "bp-8", street: "József körút", houseNo: "31", title: "Befektetési lakás a Józsefvárosban", type: "flat", subtype: "tégla lakás", price: 49_900_000, area: 44, rooms: 1, half: 1, floor: 1, floors: 4, elevator: false, heating: "gas_individual", material: "brick", condition: "renovated", year: 1905, energy: "EE", agent: "balint", mandate: "non_exclusive", mandateDays: 55, stage: "listed", stageDays: 11, createdDaysAgo: 35, highlights: ["Befektetésnek"] },
  { key: "bp11-allee", place: "bp-11", street: "Bocskai út", houseNo: "10", title: "Újépítésű lakás az Allee közelében", type: "flat", subtype: "tégla lakás", price: 87_500_000, area: 68, rooms: 3, floor: 5, floors: 7, elevator: true, heating: "district", material: "brick", condition: "new", year: 2024, energy: "AA", agent: "eszter", mandate: "exclusive", mandateDays: 140, stage: "mandate_signed", stageDays: 3, createdDaysAgo: 5, highlights: ["Új építés", "Terasz"], terrace: true, parking: "underground", commissionPct: 2.5 },
  { key: "bp12-svabhegy", place: "bp-12", street: "Költő utca", houseNo: "14", title: "Villalakás a Svábhegyen", type: "flat", subtype: "tégla lakás", price: 189_000_000, area: 124, rooms: 4, floor: 1, floors: 2, heating: "gas_condensing", material: "brick", condition: "excellent", year: 2011, energy: "BB", agent: "eszter", mandate: "exclusive", mandateDays: 30, stage: "offer", stageDays: 2, createdDaysAgo: 70, highlights: ["Panoráma", "Kert"], garden: true, parking: "garage", commissionPct: 2.5 },
  { key: "bp13-angyalfold", place: "bp-13", street: "Dagály utca", houseNo: "11", title: "Erkélyes lakás a Dagály mellett", type: "flat", subtype: "tégla lakás", price: 72_900_000, area: 63, rooms: 2, half: 1, floor: 4, floors: 7, elevator: true, heating: "district", material: "brick", condition: "excellent", year: 2018, energy: "BB", agent: "balint", mandate: "exclusive", mandateDays: 100, stage: "listed", stageDays: 4, createdDaysAgo: 20, highlights: ["Erkély", "Teremgarázs"], parking: "underground", commissionPct: 3 },
  { key: "bp13-kiado", place: "bp-13", street: "Hollán Ernő utca", houseNo: "25", title: "Kiadó 2 szobás lakás Újlipótvárosban", type: "flat", subtype: "tégla lakás", price: 290_000, area: 52, rooms: 2, floor: 2, floors: 5, elevator: true, heating: "house_central", material: "brick", condition: "good", year: 1936, energy: "DD", agent: "anna", mandate: "non_exclusive", mandateDays: 30, createdDaysAgo: 9, highlights: ["Bútorozott", "Duna közelében"], rent: true },
  { key: "bp14-zuglo-haz", place: "bp-14", street: "Columbus utca", houseNo: "47", title: "Zuglói ikerház kerttel", type: "house", subtype: "ikerház", price: 134_000_000, area: 140, lot: 400, rooms: 4, half: 1, heating: "gas_condensing", material: "brick", condition: "good", year: 2003, energy: "BB", agent: "peter", mandate: "exclusive", mandateDays: 95, stage: "listed", stageDays: 13, createdDaysAgo: 44, highlights: ["Kert", "Garázs"], garden: true, parking: "garage", commissionPct: 2.8 },
  { key: "bp15-rakospalota", place: "bp-15", street: "Fő út", houseNo: "64", title: "Családi ház Rákospalotán", type: "house", subtype: "családi ház", price: 79_500_000, area: 120, lot: 600, rooms: 4, heating: "gas_condensing", material: "brick", condition: "good", year: 1992, energy: "CC", agent: "peter", stage: "assessment", stageDays: 3, createdDaysAgo: 7, highlights: ["Nagy telek"], garden: true },
  { key: "dunakeszi-alag", place: "dunakeszi", street: "Alagi út", houseNo: "33", title: "Lakás az Alagi lakóparkban", type: "flat", subtype: "tégla lakás", price: 58_900_000, area: 64, rooms: 3, floor: 1, floors: 3, heating: "gas_condensing", material: "brick", condition: "good", year: 2010, energy: "BB", agent: "balint", mandate: "non_exclusive", mandateDays: 65, stage: "listed", stageDays: 8, createdDaysAgo: 30, highlights: ["Lakópark"], parking: "own" },
  { key: "budaors-telek", place: "budaors", street: "Szivárvány utca", houseNo: "—", title: "Építési telek panorámával Budaörsön", type: "plot", subtype: "építési telek", price: 54_000_000, area: 760, lot: 760, rooms: 0, heating: "none", material: "none", condition: "plot", year: 2026, energy: "JJ", agent: "eszter", mandate: "non_exclusive", mandateDays: 85, createdDaysAgo: 18, highlights: ["Panoráma", "Közművesített"] },
  { key: "torokbalint-haz", place: "torokbalint", street: "Munkácsy Mihály utca", houseNo: "19", title: "Modern családi ház Törökbálinton", type: "house", subtype: "családi ház", price: 119_000_000, area: 152, lot: 700, rooms: 5, heating: "heat_pump", material: "brick", condition: "new", year: 2023, energy: "AA+", agent: "eszter", stage: "acquisition", stageDays: 3, createdDaysAgo: 3, highlights: ["Okosotthon", "Hőszivattyú"], garden: true },
  { key: "erd-haz", place: "erd", street: "Budai út", houseNo: "140", title: "Családi ház Érden nagy telekkel", type: "house", subtype: "családi ház", price: 67_500_000, area: 110, lot: 980, rooms: 3, half: 1, heating: "gas_condensing", material: "brick", condition: "good", year: 1997, energy: "CC", agent: "balint", stage: "acquisition", stageDays: 1, createdDaysAgo: 1, highlights: ["Nagy telek"], garden: true },
  { key: "pomaz-haz", place: "pomaz", street: "Beniczky utca", houseNo: "8", title: "Csendes családi ház Pomázon", type: "house", subtype: "családi ház", price: 76_900_000, area: 118, lot: 820, rooms: 4, heating: "gas_condensing", material: "brick", condition: "good", year: 2002, energy: "BB", agent: "peter", mandate: "exclusive", mandateDays: 110, stage: "mandate_signed", stageDays: 4, createdDaysAgo: 6, highlights: ["Csendes utca"], garden: true, commissionPct: 3 },
  { key: "vac-lakas", place: "vac", street: "Széchenyi utca", houseNo: "29", title: "Belvárosi lakás Vácon", type: "flat", subtype: "tégla lakás", price: 39_900_000, area: 58, rooms: 2, floor: 1, floors: 2, heating: "gas_individual", material: "brick", condition: "good", year: 1965, energy: "DD", agent: "balint", mandate: "non_exclusive", mandateDays: 40, stage: "offer", stageDays: 6, createdDaysAgo: 48, highlights: ["Belváros"] },
  { key: "veresegyhaz-haz", place: "veresegyhaz", street: "Patak utca", houseNo: "4", title: "Új építésű ház a Veresegyházi tavaknál", type: "house", subtype: "családi ház", price: 112_000_000, area: 134, lot: 620, rooms: 4, half: 1, heating: "heat_pump", material: "brick", condition: "new", year: 2025, energy: "AA++", agent: "eszter", mandate: "exclusive", mandateDays: 160, stage: "mandate_signed", stageDays: 2, createdDaysAgo: 4, highlights: ["Napelem", "Hőszivattyú"], garden: true, commissionPct: 2.5 },
  { key: "godollo-lakas", place: "godollo", street: "Remsey körút", houseNo: "5", title: "Erkélyes lakás az egyetem közelében", type: "flat", subtype: "panel lakás", price: 38_500_000, area: 55, rooms: 2, floor: 3, floors: 4, heating: "district", material: "panel", condition: "renovated", year: 1979, energy: "DD", agent: "peter", mandate: "non_exclusive", mandateDays: 50, stage: "listed", stageDays: 16, createdDaysAgo: 40, highlights: ["Egyetem közelében"] },
  { key: "fot-telek", place: "fot", street: "Somlyói út", houseNo: "—", title: "Építési telek Fóton", type: "plot", subtype: "építési telek", price: 24_900_000, area: 900, lot: 900, rooms: 0, heating: "none", material: "none", condition: "plot", year: 2026, energy: "JJ", agent: "peter", stage: "assessment", stageDays: 2, createdDaysAgo: 5, highlights: ["Csendes"] },
  { key: "bp11-iroda", place: "bp-11", street: "Fehérvári út", houseNo: "84", title: "Iroda a Fehérvári úton", type: "office", subtype: "iroda", price: 92_000_000, area: 120, rooms: 4, floor: 1, floors: 5, elevator: true, heating: "house_central", material: "brick", condition: "good", year: 1990, energy: "DD", agent: "balint", mandate: "non_exclusive", mandateDays: 120, createdDaysAgo: 65, highlights: ["Utcafronti"] },
  { key: "szentendre-nyaralo", place: "szentendre", street: "Pismány, Áfonya utca", houseNo: "3", title: "Nyaraló a Pismányon", type: "holiday_home", subtype: "nyaraló", price: 42_000_000, area: 60, lot: 500, rooms: 2, heating: "electric", material: "wood", condition: "to_renovate", year: 1975, energy: "GG", agent: "eszter", mandate: "non_exclusive", mandateDays: 75, stage: "listed", stageDays: 10, createdDaysAgo: 33, highlights: ["Erdős környezet"], garden: true },
  { key: "dunakeszi-sorhaz", place: "dunakeszi", street: "Kossuth Lajos utca", houseNo: "56", title: "Sorházi lakás Dunakeszin", type: "house", subtype: "sorház", price: 69_500_000, area: 98, lot: 160, rooms: 3, half: 1, heating: "gas_condensing", material: "brick", condition: "good", year: 2014, energy: "BB", agent: "balint", mandate: "exclusive", mandateDays: 130, stage: "listed", stageDays: 5, createdDaysAgo: 15, highlights: ["Kertkapcsolatos"], garden: true, commissionPct: 3 },
];
