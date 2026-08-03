import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next"); // Pour gérer le flow PreSignupWizard

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Si next=onboarding, on va direct à onboarding (flow PreSignupWizard)
  // Sinon, on passe par la sélection de templates
  const destination = next === "onboarding" ? "/onboarding" : "/templates";
  return NextResponse.redirect(`${origin}${destination}`);
}
