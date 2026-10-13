"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented";
import { addContactActivity } from "../actions";

const TYPES = ["note", "call", "email", "sms"] as const;
type ActivityType = (typeof TYPES)[number];

/** Gyors eseményrögzítés az ügyfél idővonalára (jegyzet, hívás, e-mail, SMS). */
export function ActivityForm({ contactId }: { contactId: string }) {
  const t = useTranslations("contacts.detail.timeline");
  const router = useRouter();
  const [type, setType] = useState<ActivityType>("note");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (body.trim() === "") return;
    startTransition(async () => {
      const result = await addContactActivity(contactId, type, body);
      if (!result.ok) {
        toast.error(t("failed"));
        return;
      }
      toast.success(t("saved"));
      setBody("");
      router.refresh();
    });
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <SegmentedControl
        label={t("typeLabel")}
        value={type}
        onValueChange={setType}
        options={TYPES.map((value) => ({ value, label: t(`types.${value}`) }))}
        className="self-start"
      />
      <Field label={t("bodyLabel")} htmlFor="activity-body">
        <Textarea id="activity-body" value={body} onChange={(event) => setBody(event.target.value)} placeholder={t("bodyPlaceholder")} rows={3} />
      </Field>
      <Button type="submit" size="sm" disabled={pending || body.trim() === ""} className="self-end">
        {t("submit")}
      </Button>
    </form>
  );
}
