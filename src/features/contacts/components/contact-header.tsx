import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarPlus, Mail, MessageSquare, Pencil, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import type { ContactDetail } from "../detail-queries";
import { RoleChips } from "./contact-views";

const ACTION = "inline-flex h-11 items-center gap-2 rounded-control border border-line bg-surface px-4 text-14 font-semibold text-ink hover:bg-surface-sunken";

/** Ügyfél fejléc: monogram, név, szerepek, felvétel és felelős, gyors akciók (hívás, e-mail, SMS, bemutató). */
export async function ContactHeader({ detail }: { detail: ContactDetail }) {
  const t = await getTranslations("contacts.detail");
  const tLast = await getTranslations("contacts.lastContact");
  const { contact: c } = detail;
  const name = c.full_name || c.company || "";
  const phone = c.phone_normalized ?? c.phone;

  return (
    <header className="flex flex-col gap-4">
      <nav aria-label={t("breadcrumb")} className="text-14 text-muted">
        <Link href="/ugyfelek" className="hover:text-ink">
          {t("breadcrumb")}
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-2" aria-current="page">
          {name}
        </span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={name || "?"} size="xl" className="size-16 text-20" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="serif text-34 leading-tight font-medium md:text-[38px]">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-14 text-muted">
              <RoleChips roles={c.roles} />
              {c.company && c.full_name ? <span>{t("company", { name: c.company })}</span> : null}
              <span>{t("since", { date: formatDate(c.created_at) })}</span>
              {detail.ownerName ? <span>{t("owner", { name: detail.ownerName })}</span> : null}
              <span>{detail.daysSinceContact === null ? tLast("never") : tLast("ago", { count: detail.daysSinceContact })}</span>
            </div>
          </div>
        </div>
        <Button variant="inverse" asChild>
          <Link href={`/ugyfelek/${c.id}/szerkesztes`}>
            <Pencil size={16} aria-hidden="true" />
            {t("edit")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {phone ? (
          <a href={`tel:${phone}`} className={ACTION}>
            <Phone size={16} aria-hidden="true" />
            {t("actions.call")} · {formatPhone(c.phone_normalized) || c.phone}
          </a>
        ) : null}
        {c.email ? (
          <a href={`mailto:${c.email}`} className={ACTION}>
            <Mail size={16} aria-hidden="true" />
            {t("actions.email")}
          </a>
        ) : null}
        {phone ? (
          <a href={`sms:${phone}`} className={ACTION}>
            <MessageSquare size={16} aria-hidden="true" />
            {t("actions.sms")}
          </a>
        ) : null}
        <Link href={`/naptar?ugyfel=${c.id}`} className={ACTION}>
          <CalendarPlus size={16} aria-hidden="true" />
          {t("actions.showing")}
        </Link>
      </div>
    </header>
  );
}
