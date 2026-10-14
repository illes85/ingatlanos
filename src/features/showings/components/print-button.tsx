"use client";

import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const t = useTranslations("showings.sheet");
  return (
    <Button type="button" onClick={() => window.print()} className="print:hidden">
      <Printer size={17} aria-hidden="true" />
      {t("print")}
    </Button>
  );
}
