"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Building2, LogOut, Trash2, Sun, Moon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AppTour } from "@/components/AppTour";

const NAV_LINKS = [
  { href: "/onboarding", label: "Générer", tour: "generate" },
  { href: "/templates", label: "Templates", tour: "templates" },
  { href: "/favorites", label: "Favoris", tour: "favorites" },
  { href: "/dashboard", label: "Historique", tour: "history" },
];

interface UsageInfo {
  remaining: number;
  cap: number;
  scope: "daily" | "monthly" | "lifetime";
  lastResetOn: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [isLight, setIsLight] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Thème : initialisé depuis <html data-theme> (déjà appliqué par le script
  // anti-flash du root layout), togglé + persisté en localStorage.
  useEffect(() => {
    setIsLight(document.documentElement.getAttribute("data-theme") === "light");
  }, []);

  function toggleTheme() {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.setAttribute("data-theme", next ? "light" : "");
    try {
      localStorage.setItem("hooks-theme", next ? "light" : "dark");
    } catch {
      /* localStorage indisponible (mode privé strict) — thème non persisté */
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    loadUsage();
  }, []);

  async function loadUsage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("usage_counters")
      .select("count, cap, scope, last_reset_on")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setUsage({
        remaining: data.cap - data.count,
        cap: data.cap,
        scope: data.scope,
        lastResetOn: data.last_reset_on,
      });
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } else {
      alert("Erreur lors de la suppression du compte.");
    }
  }

  function getResetDate() {
    if (!usage) return null;
    const lastReset = new Date(usage.lastResetOn);
    if (usage.scope === "monthly") {
      // Premier jour du mois prochain
      const nextMonth = new Date(lastReset.getFullYear(), lastReset.getMonth() + 1, 1);
      return nextMonth.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } else if (usage.scope === "daily") {
      // Demain
      const tomorrow = new Date(lastReset);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    }
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border-soft bg-paper/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Link href="/templates" className="font-display text-xl">
            Hooks
          </Link>

          {/* Crédits au centre sur desktop */}
          {usage && (
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <span className="font-medium text-ink">{usage.remaining}</span>
              <span className="text-ink-muted">crédit{usage.remaining > 1 ? "s" : ""}</span>
              {getResetDate() && (
                <>
                  <span className="text-ink-muted">·</span>
                  <span className="text-xs text-ink-muted">
                    renouvelé le {getResetDate()}
                  </span>
                </>
              )}
            </div>
          )}

          <nav className="hidden items-center gap-6 text-sm text-ink-secondary sm:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                data-tour={l.tour}
                className="transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={toggleTheme}
              aria-label={isLight ? "Passer en mode sombre" : "Passer en mode clair"}
              title={isLight ? "Mode sombre" : "Mode clair"}
              className="text-ink-muted transition-colors hover:text-ink"
            >
              {isLight ? <Moon className="h-4 w-4" strokeWidth={1.75} /> : <Sun className="h-4 w-4" strokeWidth={1.75} />}
            </button>
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen((v) => !v)}
                aria-label="Menu profil entreprise"
                data-tour="profile"
                className="text-ink-muted transition-colors hover:text-ink"
              >
                <Building2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border-soft bg-surface-raised py-2 shadow-lg">
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-surface"
                  >
                    <Building2 className="h-4 w-4" strokeWidth={1.75} />
                    Profil entreprise
                  </Link>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.75} />
                    Déconnexion
                  </button>
                  <div className="my-1 border-t border-border-soft" />
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setDeleteConfirmOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-critical transition-colors hover:bg-surface"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    Supprimer le compte
                  </button>
                </div>
              )}
            </div>
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
            {/* Crédits sur mobile */}
            {usage && (
              <div className="mb-2 rounded-lg border border-border-soft bg-surface px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{usage.remaining}</span>
                  <span className="text-ink-muted">crédit{usage.remaining > 1 ? "s" : ""}</span>
                </div>
                {getResetDate() && (
                  <p className="mt-1 text-xs text-ink-muted">
                    Renouvelé le {getResetDate()}
                  </p>
                )}
              </div>
            )}
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
            <button
              onClick={() => {
                toggleTheme();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 text-left transition-colors hover:text-ink"
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {isLight ? "Mode sombre" : "Mode clair"}
            </button>
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
            <button
              onClick={() => {
                setMenuOpen(false);
                setDeleteConfirmOpen(true);
              }}
              className="text-left text-critical transition-colors hover:text-critical/80"
            >
              Supprimer le compte
            </button>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{children}</main>

      {/* Tour guidé post-inscription (une seule fois, après le profil entreprise) */}
      <AppTour />

      {/* Modal de confirmation de suppression */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/80 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-md rounded-2xl border border-border-soft bg-surface p-6">
            <h2 className="mb-3 font-display text-xl font-normal">Supprimer le compte</h2>
            <p className="mb-6 text-sm text-ink-secondary">
              Cette action est irréversible. Toutes vos générations et données seront définitivement supprimées.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 rounded-lg border border-border-soft bg-surface-raised px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  handleDeleteAccount();
                }}
                className="flex-1 rounded-lg bg-critical px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
