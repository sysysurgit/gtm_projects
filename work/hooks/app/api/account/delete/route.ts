import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    // Suppression en cascade via Supabase (briefs, generations, usage_counters sont déjà en cascade ON DELETE)
    // Suppression du profil
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      return NextResponse.json({ error: "PROFILE_DELETE_FAILED" }, { status: 500 });
    }

    // Suppression de l'utilisateur Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (authError) {
      console.error("Error deleting auth user:", authError);
      return NextResponse.json({ error: "AUTH_DELETE_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account deletion failed:", err);
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}
