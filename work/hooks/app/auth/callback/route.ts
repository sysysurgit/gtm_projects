import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // À l'inscription, la première chose à compléter est le profil entreprise
  // (étape 1 du onboarding), puis le tour guidé des onglets démarre après
  // sauvegarde (voir ProfileForm). Le paramètre next=onboarding (flow
  // PreSignupWizard de la landing) pointe lui aussi vers le profil d'abord.
  return NextResponse.redirect(`${origin}/profile?onboarding=1`);
}
