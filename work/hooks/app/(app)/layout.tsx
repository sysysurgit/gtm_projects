"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
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
      <header className="border-b border-border-soft px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/onboarding" className="font-semibold">
            Hooks
          </Link>
          <nav className="hidden items-center gap-6 text-sm sm:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-link">
                {l.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="text-ink-muted hover:text-link">
              Déconnexion
            </button>
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
          <nav className="mt-4 flex flex-col gap-4 text-sm sm:hidden">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="hover:text-link"
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="text-left text-ink-muted hover:text-link"
            >
              Déconnexion
            </button>
          </nav>
        )}
      </header>
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">{children}</main>
    </>
  );
}
