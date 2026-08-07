import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Profil entreprise : contexte + contraintes qui s'appliquent à TOUTES les
// générations (positionnement, ton de marque, conformité) — distinct du
// brief par génération (industrie/offre/persona/etc., qui change à chaque
// annonce). Champs texte libres, tous optionnels, best-effort.
//
// Écrit via supabaseAdmin (service role), pas le client anon+RLS : la table
// profiles n'a qu'une policy SELECT ("own profile"), aucune policy UPDATE —
// même convention que le reste du projet (voir /api/generate/route.ts, qui
// écrit aussi via supabaseAdmin après avoir authentifié l'utilisateur via
// le client anon getUser()).
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await request.json();
  const update: Record<string, string | null> = {};
  if (typeof body.companyDescription === "string") {
    update.company_description = body.companyDescription.trim() || null;
  }
  if (typeof body.brandTone === "string") {
    update.brand_tone = body.brandTone.trim() || null;
  }
  if (typeof body.complianceNotes === "string") {
    update.compliance_notes = body.complianceNotes.trim() || null;
  }
  if (typeof body.defaultCreativeStyle === "string") {
    update.default_creative_style = body.defaultCreativeStyle.trim() || null;
  }

  const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
