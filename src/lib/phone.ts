/**
 * Magyar telefonszám normalizálása E.164 alakra (duplikátum-felismeréshez és tárolásra).
 * Elfogadott kezdetek: +36…, 0036…, 06…, 36…; a szóközöket, kötőjeleket, zárójeleket eldobja.
 * Külföldi számnál (+ és nem 36) a számjegyeket megtartja. Nem értelmezhető bemenetre null.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (digits === "") return null;

  if (hasPlus) {
    // Már nemzetközi alakú.
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("06")) {
    digits = `36${digits.slice(2)}`;
  } else if (digits.startsWith("36")) {
    // 36301234567 – országkóddal, plusz nélkül.
  } else if (digits.startsWith("0")) {
    return null; // ismeretlen nemzetközi előhívó
  } else {
    // Körzetszám nélküli vagy 30/20/70-es mobil: magyarnak vesszük.
    digits = `36${digits}`;
  }

  // A magyar számok hossza 11–12 számjegy az országkóddal (pl. 3611234567 budapesti vezetékes: 11, mobil: 11).
  if (digits.startsWith("36") && (digits.length < 10 || digits.length > 12)) return null;
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/** Megjelenítésre: +36301234567 → „+36 30 123 4567”; más alakot változatlanul ad vissza. */
export function formatPhone(normalized: string | null | undefined): string {
  if (!normalized) return "";
  const m = /^\+36(1|\d{2})(\d{3})(\d{3,4})$/.exec(normalized);
  return m ? `+36 ${m[1]} ${m[2]} ${m[3]}` : normalized;
}
