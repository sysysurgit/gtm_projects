"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error === "EMAIL_ALREADY_REGISTERED") {
        router.push(`/login?notice=account_exists&email=${encodeURIComponent(email)}`);
        return;
      }
      setError(
        data.error === "RATE_LIMITED"
          ? "Trop de tentatives, réessaie plus tard."
          : (data.error ?? "Une erreur est survenue.")
      );
      return;
    }
    router.push("/verify-email");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border-soft bg-surface p-8">
        <h1 className="mb-1 font-display text-3xl font-normal">Créer un compte</h1>
        <p className="mb-8 text-sm text-ink-muted">3 générations gratuites, sans carte bancaire.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-ink-secondary" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-secondary" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-btn-primary py-2 font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
        <p className="mt-6 text-sm text-ink-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-link">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
