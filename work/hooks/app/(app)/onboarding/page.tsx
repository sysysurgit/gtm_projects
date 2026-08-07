import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { DefaultBrief } from "@/lib/types";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, brand_name, default_brief, default_creative_style")
    .eq("id", user.id)
    .single();

  // Charger le template si présent dans l'URL
  const params = await searchParams;
  const templateId = params.template;
  let templateBrief: DefaultBrief | null = null;

  if (templateId) {
    const template = INDUSTRY_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      // Le brief du template inclut maintenant platform et adFormat
      templateBrief = template.brief;
    }
  }

  return (
    <OnboardingWizard
      initialFirstName={profile?.first_name ?? ""}
      initialBrandName={profile?.brand_name ?? ""}
      defaultBrief={templateBrief ?? (profile?.default_brief as DefaultBrief | null) ?? null}
      profileCreativeStyle={profile?.default_creative_style ?? "none"}
    />
  );
}
