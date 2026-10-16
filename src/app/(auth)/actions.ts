"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv, serverEnv } from "@/lib/env";
import { DEMO_ACCOUNTS, type DemoRole } from "@/config/demo";

/** Az űrlapok hibakulcsai a messages/hu.json „auth.errors” ágára mutatnak. */
export type AuthErrorKey =
  | "invalidCredentials"
  | "emailTaken"
  | "weakPassword"
  | "invalidEmail"
  | "nameRequired"
  | "generic"
  | "demoDisabled"
  | "callback";

export interface AuthFormState {
  error?: AuthErrorKey;
  fieldErrors?: Partial<Record<"fullName" | "email" | "password" | "name", AuthErrorKey>>;
  sentTo?: string;
}

const emailSchema = z.email();

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  // Csak alkalmazáson belüli útvonal: a visszaper jel és a vezérlőkarakterek a böngészőben //-nek számítanának.
  return /^\/(?![/\\])[A-Za-z0-9\-_/?=&.%#]*$/.test(value) ? value : "/ma";
}

export async function signInWithPassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!emailSchema.safeParse(email).success) return { fieldErrors: { email: "invalidEmail" } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.code === "invalid_credentials" ? "invalidCredentials" : "generic" };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (fullName.length < 2) fieldErrors.fullName = "nameRequired";
  if (!emailSchema.safeParse(email).success) fieldErrors.email = "invalidEmail";
  if (password.length < 8) fieldErrors.password = "weakPassword";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${publicEnv.siteUrl}/auth/callback` },
  });
  if (error) return { error: error.code === "user_already_exists" ? "emailTaken" : "generic" };
  // Ha az e-mail-megerősítés be van kapcsolva, nincs még munkamenet: levelet küldtünk.
  if (!data.session) return { sentTo: email };
  redirect("/szervezet-letrehozasa");
}

export async function sendMagicLink(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!emailSchema.safeParse(email).success) return { fieldErrors: { email: "invalidEmail" } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next")))}` },
  });
  if (error) return { error: "generic" };
  return { sentTo: email };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? publicEnv.siteUrl;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/belepes?error=callback");
  redirect(data.url);
}

/** Egykattintásos demó belépés (csak DEMO_MODE=true). */
export async function signInAsDemo(role: DemoRole): Promise<AuthFormState> {
  const { demoMode, demoPassword } = serverEnv();
  if (!demoMode || !demoPassword || !(role in DEMO_ACCOUNTS)) return { error: "demoDisabled" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role].email,
    password: demoPassword,
  });
  if (error) return { error: "generic" };
  redirect("/ma");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/belepes");
}

export async function createOrganization(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const type = formData.get("type") === "office" ? "office" : "individual";
  if (name.length < 2) return { fieldErrors: { name: "nameRequired" } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", { p_name: name, p_type: type });
  if (error) return { error: "generic" };
  redirect("/ma");
}
