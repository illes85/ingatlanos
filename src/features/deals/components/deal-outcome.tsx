"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setDealOutcome } from "../actions";

/** Elveszett ügylet jelölése (ok megadásával) és újranyitása. */
export function DealOutcome({ dealId, status }: { dealId: string; status: "open" | "won" | "lost" }) {
  const t = useTranslations("deals.detail");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (outcome: "lost" | "reopen", reason?: string) =>
    startTransition(async () => {
      const result = await setDealOutcome(dealId, outcome, reason);
      if (!result.ok) {
        toast.error(t("failed"));
        return;
      }
      toast.success(outcome === "lost" ? t("markedLost") : t("reopened"));
      router.refresh();
    });

  if (status === "lost") {
    return (
      <Button variant="secondary" disabled={pending} onClick={() => run("reopen")}>
        {t("reopen")}
      </Button>
    );
  }
  if (status === "won") return null;
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        const reason = window.prompt(t("lostPrompt"));
        if (reason === null) return;
        run("lost", reason);
      }}
    >
      {t("markLost")}
    </Button>
  );
}
