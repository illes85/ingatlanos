/** Magyar névsorrend: az első szó a vezetéknév, a többi a keresztnév („Szalai Hanna”). */
export function splitFullName(fullName: string | null | undefined): { lastName: string; firstName: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { lastName: "", firstName: "" };
  return { lastName: parts[0]!, firstName: parts.slice(1).join(" ") };
}
