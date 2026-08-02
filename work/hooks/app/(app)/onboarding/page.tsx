import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { DefaultBrief } from "@/lib/types";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, brand_name, default_brief")
    .eq("id", user.id)
    .single();

  return (
    <OnboardingWizard
      initialFirstName={profile?.first_name ?? ""}
      initialBrandName={profile?.brand_name ?? ""}
      defaultBrief={(profile?.default_brief as DefaultBrief | null) ?? null}
    />
  );
}
