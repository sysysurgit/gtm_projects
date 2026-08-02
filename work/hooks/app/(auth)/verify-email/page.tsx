"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  async function handleResend(e: FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold mb-2">Vérifie ta boîte mail</h1>
        <p className="text-ink-muted mb-8 text-sm">
          On t&apos;a envoyé un lien de confirmation. Clique dessus pour activer ton compte.
        </p>
        <form onSubmit={handleResend} className="space-y-3">
          <input
            type="email"
            required
            placeholder="ton@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="w-full rounded-lg border border-border py-2 font-medium hover:border-accent"
          >
            Renvoyer l&apos;email
          </button>
        </form>
        {status === "sent" && <p className="mt-4 text-sm text-good">Email renvoyé.</p>}
        {status === "error" && <p className="mt-4 text-sm text-critical">Une erreur est survenue.</p>}
      </div>
    </main>
  );
}
