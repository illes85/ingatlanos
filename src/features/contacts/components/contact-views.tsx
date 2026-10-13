import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mail, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Database } from "@/types/database";
import type { ContactListItem, DirectoryHit } from "../types";

type Role = Database["public"]["Enums"]["contact_role"];

const ROLE_TONE: Record<Role, "primary" | "accent" | "ai" | "neutral"> = {
  seller: "accent",
  landlord: "accent",
  buyer: "primary",
  tenant: "primary",
  investor: "ai",
  lawyer: "neutral",
  mortgage_broker: "neutral",
  other: "neutral",
};

export async function RoleChips({ roles }: { roles: Role[] }) {
  const t = await getTranslations("enums.contactRole");
  if (roles.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <Badge key={role} tone={ROLE_TONE[role]} size="xs">
          {t(role)}
        </Badge>
      ))}
    </span>
  );
}

async function lastContactText(days: number | null) {
  const t = await getTranslations("contacts.lastContact");
  return days === null ? t("never") : t("ago", { count: days });
}

/** Kártyanézet: monogram, név, szerep, elérhetőségek, felelős és az utolsó kapcsolat. */
export async function ContactCards({ items }: { items: ContactListItem[] }) {
  const t = await getTranslations("contacts");
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {await Promise.all(
        items.map(async (c) => (
          <li key={c.id} className="flex">
            <Link href={`/ugyfelek/${c.id}`} className="group flex w-full hover:text-ink">
              <Card className="flex w-full flex-col gap-3 p-5 transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-raised">
                <div className="flex items-start gap-3.5">
                  <Avatar name={c.fullName || c.company || "?"} size="xl" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-16 font-bold">{c.fullName || c.company}</span>
                    {c.company && c.fullName ? <span className="truncate text-13 text-muted">{c.company}</span> : null}
                    <RoleChips roles={c.roles} />
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-13 text-ink-2">
                  {c.phone ? (
                    <span className="flex items-center gap-2">
                      <Phone size={14} className="text-muted" aria-hidden="true" />
                      {c.phone}
                    </span>
                  ) : null}
                  {c.email ? (
                    <span className="flex items-center gap-2">
                      <Mail size={14} className="text-muted" aria-hidden="true" />
                      <span className="truncate">{c.email}</span>
                    </span>
                  ) : null}
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-subtle pt-3 text-12 text-muted">
                  <span>{c.ownerName ? t("detail.owner", { name: c.ownerName }) : ""}</span>
                  <span>{await lastContactText(c.daysSinceContact)}</span>
                </div>
              </Card>
            </Link>
          </li>
        )),
      )}
    </ul>
  );
}

/** Táblázatos nézet. Mobilon vízszintesen görgethető, a név oszlop rögzített. */
export async function ContactTable({ items }: { items: ContactListItem[] }) {
  const t = await getTranslations("contacts");
  return (
    <div className="overflow-x-auto rounded-card border border-line-card bg-surface shadow-card">
      <table className="w-full min-w-[860px] border-collapse text-left text-14">
        <thead>
          <tr className="border-b border-line-subtle text-12 font-bold tracking-[0.04em] text-muted uppercase">
            <th scope="col" className="sticky left-0 bg-surface px-4 py-3">{t("table.name")}</th>
            <th scope="col" className="px-3 py-3">{t("table.roles")}</th>
            <th scope="col" className="px-3 py-3">{t("table.phone")}</th>
            <th scope="col" className="px-3 py-3">{t("table.email")}</th>
            <th scope="col" className="px-3 py-3">{t("table.owner")}</th>
            <th scope="col" className="px-3 py-3">{t("table.lastContact")}</th>
          </tr>
        </thead>
        <tbody>
          {await Promise.all(
            items.map(async (c) => (
              <tr key={c.id} className="border-b border-line-subtle last:border-b-0 hover:bg-surface-sunken/60">
                <th scope="row" className="sticky left-0 bg-inherit px-4 py-2.5 font-normal">
                  <Link href={`/ugyfelek/${c.id}`} className="flex items-center gap-3 hover:text-ink">
                    <Avatar name={c.fullName || c.company || "?"} size="md" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">{c.fullName || c.company}</span>
                      {c.company && c.fullName ? <span className="truncate text-12 text-muted">{c.company}</span> : null}
                    </span>
                  </Link>
                </th>
                <td className="px-3 py-2.5"><RoleChips roles={c.roles} /></td>
                <td className="px-3 py-2.5 whitespace-nowrap text-ink-2">{c.phone ?? "–"}</td>
                <td className="px-3 py-2.5 text-ink-2">{c.email ?? "–"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-ink-2">{c.ownerName ?? "–"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-ink-2">{await lastContactText(c.daysSinceContact)}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Ügynöknek: az irodában már szereplő, de más felelősségében lévő ügyfelek (csak név és felelős). */
export async function DirectoryNotice({ hits }: { hits: DirectoryHit[] }) {
  if (hits.length === 0) return null;
  const t = await getTranslations("contacts.directory");
  return (
    <Card variant="flat" className="flex flex-col gap-3 border-dashed p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-15 font-bold">{t("title")}</h2>
        <p className="text-13 text-muted">{t("body")}</p>
      </div>
      <ul className="flex flex-col divide-y divide-line-subtle">
        {hits.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-14">
            <span className="font-semibold">{h.fullName}</span>
            <span className="text-13 text-muted">{h.ownerName ? t("owner", { name: h.ownerName }) : ""}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
