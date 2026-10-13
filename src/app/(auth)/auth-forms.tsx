"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DEMO_ACCOUNTS, type DemoRole } from "@/config/demo";
import {
  sendMagicLink,
  signInAsDemo,
  signInWithGoogle,
  signInWithPassword,
  signUp,
  type AuthFormState,
} from "./actions";

const initial: AuthFormState = {};

function FormError({ state }: { state: AuthFormState }) {
  const t = useTranslations("auth.errors");
  if (!state.error) return null;
  return (
    <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-13 font-semibold text-danger-text">
      {t(state.error)}
    </p>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-12 text-muted">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function SignInForm({ next, googleEnabled, callbackError }: { next?: string; googleEnabled: boolean; callbackError: boolean }) {
  const t = useTranslations("auth");
  const [state, action, pending] = React.useActionState(signInWithPassword, initial);
  const [magic, magicAction, magicPending] = React.useActionState(sendMagicLink, initial);
  const [email, setEmail] = React.useState("");

  return (
    <div className="flex flex-col gap-4">
      {callbackError ? <FormError state={{ error: "callback" }} /> : null}
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label={t("email")} htmlFor="email" error={state.fieldErrors?.email && t(`errors.${state.fieldErrors.email}`)}>
          <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t("password")} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <FormError state={state} />
        <Button type="submit" size="lg" disabled={pending}>
          {t("signIn")}
        </Button>
      </form>

      <Divider label={t("or")} />

      <form action={magicAction} className="flex flex-col gap-2">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next ?? ""} />
        <Button type="submit" variant="secondary" size="lg" disabled={magicPending || email.length === 0}>
          <Mail size={18} />
          {t("magicLink")}
        </Button>
        {magic.sentTo ? <p className="text-13 font-semibold text-success-text">{t("magicLinkSent", { email: magic.sentTo })}</p> : null}
        {magic.fieldErrors?.email ? <p className="text-13 text-danger-text">{t(`errors.${magic.fieldErrors.email}`)}</p> : null}
      </form>

      {googleEnabled ? (
        <form action={signInWithGoogle}>
          <Button type="submit" variant="secondary" size="lg" className="w-full">
            {t("google")}
          </Button>
        </form>
      ) : null}

      <p className="text-center text-14 text-muted">
        {t("noAccount")}{" "}
        <Link href="/regisztracio" className="font-semibold text-primary hover:text-ink">
          {t("toSignUp")}
        </Link>
      </p>
    </div>
  );
}

export function SignUpForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = React.useActionState(signUp, initial);
  const err = (key?: AuthFormState["error"]) => (key ? t(`errors.${key}`) : undefined);

  if (state.sentTo) {
    return <p className="rounded-panel bg-primary-soft p-4 text-14 font-semibold text-primary">{t("magicLinkSent", { email: state.sentTo })}</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={t("fullName")} htmlFor="fullName" error={err(state.fieldErrors?.fullName)}>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      <Field label={t("email")} htmlFor="email" error={err(state.fieldErrors?.email)}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label={t("password")} htmlFor="password" hint={t("passwordHint")} error={err(state.fieldErrors?.password)}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormError state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        {t("signUp")}
      </Button>
      <p className="text-12 leading-normal text-muted">
        {t.rich("privacy", {
          link: (chunks) => (
            <a href="/adatkezeles" className="font-semibold text-primary underline-offset-2 hover:underline">
              {chunks}
            </a>
          ),
        })}
      </p>
      <p className="text-center text-14 text-muted">
        {t("haveAccount")}{" "}
        <Link href="/belepes" className="font-semibold text-primary hover:text-ink">
          {t("toSignIn")}
        </Link>
      </p>
    </form>
  );
}

const DEMO_LABEL: Record<DemoRole, "demoOwner" | "demoAgent" | "demoAssistant"> = {
  owner: "demoOwner",
  agent: "demoAgent",
  assistant: "demoAssistant",
};

export function DemoLogin() {
  const t = useTranslations("auth");
  const [pendingRole, setPendingRole] = React.useState<DemoRole | null>(null);
  const [state, setState] = React.useState<AuthFormState>({});

  const run = (role: DemoRole) => {
    setPendingRole(role);
    React.startTransition(async () => {
      const result = await signInAsDemo(role);
      setState(result ?? {});
      setPendingRole(null);
    });
  };

  return (
    <Card variant="flat" className="flex flex-col gap-3 p-4">
      <div className="flex flex-col">
        <span className="text-14 font-bold">{t("demoTitle")}</span>
        <span className="text-13 text-muted">{t("demoSubtitle")}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map((role) => (
          <Button
            key={role}
            variant={role === "owner" ? "primary" : "secondary"}
            size="sm"
            className="w-full px-2"
            disabled={pendingRole !== null}
            onClick={() => run(role)}
            data-testid={`demo-${role}`}
          >
            {t(DEMO_LABEL[role])}
          </Button>
        ))}
      </div>
      <FormError state={state} />
    </Card>
  );
}
