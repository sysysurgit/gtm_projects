// Notifie l'admin (fis.syrian@gmail.com) à chaque nouvelle inscription.
// Best-effort : une erreur d'envoi ne doit jamais bloquer le signup de l'utilisateur.
const ADMIN_EMAIL = "fis.syrian@gmail.com";

export async function notifyAdminNewSignup(userEmail: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Hooks <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `🪝 Nouvel inscrit Hooks : ${userEmail}`,
        text: `Nouvelle inscription sur Hooks.\n\nEmail : ${userEmail}\nDate : ${new Date().toISOString()}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("notifyAdminNewSignup failed", res.status, body);
    }
  } catch (err) {
    console.error("notifyAdminNewSignup error", err);
  }
}
