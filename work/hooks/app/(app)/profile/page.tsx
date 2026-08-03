import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, brand_name, company_description, brand_tone, compliance_notes")
    .eq("id", user.id)
    .single();

  return (
    <ProfileForm
      initialFirstName={profile?.first_name ?? ""}
      initialBrandName={profile?.brand_name ?? ""}
      initialCompanyDescription={profile?.company_description ?? ""}
      initialBrandTone={profile?.brand_tone ?? ""}
      initialComplianceNotes={profile?.compliance_notes ?? ""}
    />
  );
}
