/** Ékezetmentes, kisbetűs, kötőjeles szöveg a címből: „Napfényes lakás, Újbuda” → „napfenyes-lakas-ujbuda”. */
export function slugify(text: string, maxLength = 48): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** A cím szlagje + 8 véletlen karakter: olvasható, ütközésmentes és nem kitalálható a link. */
export function makePublicSlug(title: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  const base = slugify(title);
  return base ? `${base}-${suffix}` : suffix;
}
