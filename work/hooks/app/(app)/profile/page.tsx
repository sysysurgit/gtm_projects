import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const params = await searchParams;
  const onboarding = params.onboarding === "1";

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, brand_name, company_description, brand_tone, compliance_notes, default_creative_style")
    .eq("id", user.id)
    .single();

  return (
    <ProfileForm
      initialFirstName={profile?.first_name ?? ""}
      initialBrandName={profile?.brand_name ?? ""}
      initialCompanyDescription={profile?.company_description ?? ""}
      initialBrandTone={profile?.brand_tone ?? ""}
      initialComplianceNotes={profile?.compliance_notes ?? ""}
      initialDefaultCreativeStyle={profile?.default_creative_style ?? "none"}
      onboarding={onboarding}
    />
  );
}
