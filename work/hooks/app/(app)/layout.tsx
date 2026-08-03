"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/onboarding", label: "Générer" },
  { href: "/dashboard", label: "Historique" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border-soft bg-paper/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Link href="/onboarding" className="font-display text-xl">
            Hooks
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-ink-secondary sm:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="text-ink-muted transition-colors hover:text-ink">
              Déconnexion
            </button>
            <Link
              href="/profile"
              aria-label="Profil entreprise"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              <Building2 className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </nav>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="sm:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <nav className="mt-4 flex flex-col gap-4 text-sm text-ink-secondary sm:hidden">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="transition-colors hover:text-ink"
            >
              Profil entreprise
            </Link>
            <button
              onClick={handleLogout}
              className="text-left text-ink-muted transition-colors hover:text-ink"
            >
              Déconnexion
            </button>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{children}</main>
    </>
  );
}
