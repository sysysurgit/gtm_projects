import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSignupRateLimit } from "@/lib/rate-limit";
import { notifyAdminNewSignup } from "@/lib/notify-admin";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkSignupRateLimit(ip, email);
  if (!allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Supabase renvoie un succès "silencieux" (identities vide) quand l'email existe déjà,
  // pour éviter l'énumération de comptes. On détecte ce cas pour rediriger vers la connexion.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return NextResponse.json({ error: "EMAIL_ALREADY_REGISTERED" }, { status: 409 });
  }

  // Best-effort, ne bloque jamais la réponse au user.
  void notifyAdminNewSignup(email);

  return NextResponse.json({ ok: true });
}
