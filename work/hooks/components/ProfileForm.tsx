"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check } from "lucide-react";
import { CREATIVE_STYLE_OPTIONS } from "@/lib/brief-options";

export function ProfileForm({
  initialFirstName,
  initialBrandName,
  initialCompanyDescription,
  initialBrandTone,
  initialComplianceNotes,
  initialDefaultCreativeStyle,
  onboarding = false,
}: {
  initialFirstName: string;
  initialBrandName: string;
  initialCompanyDescription: string;
  initialBrandTone: string;
  initialComplianceNotes: string;
  initialDefaultCreativeStyle: string;
  // Mode première inscription : bannière d'étape + lance le tour guidé des
  // onglets après sauvegarde (voir AppTour).
  onboarding?: boolean;
}) {
  const router = useRouter();
  const [companyDescription, setCompanyDescription] = useState(initialCompanyDescription);
  const [brandTone, setBrandTone] = useState(initialBrandTone);
  const [complianceNotes, setComplianceNotes] = useState(initialComplianceNotes);
  const [defaultCreativeStyle, setDefaultCreativeStyle] = useState(initialDefaultCreativeStyle);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyDescriptionPlaceholder =
    "Ex : PME de 40 salaries, editeur SaaS RH, positionne sur la paie automatisee pour cabinets comptables. Concurrence historique sur le prix, on se differencie par la fiabilite (0 erreur sur 14 200 bulletins en 2023).";
  const brandTonePlaceholder =
    'Ex : Direct et sans jargon, jamais de superlatifs vagues ("revolutionnaire", "leader"). On peut etre un peu cash sur les problemes du secteur. Jamais d\'humour sur la paie (sujet sensible pour nos clients).';
  const complianceNotesPlaceholder =
    'Ex : Secteur RH - jamais promettre un resultat chiffre non audite. Jamais comparer nommement a un concurrent. Toujours rester conforme RGPD dans le wording (pas de "on connait tout de vos salaries").';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyDescription, brandTone, complianceNotes, defaultCreativeStyle }),
    });
    setSaving(false);

    if (!res.ok) {
      setError("Une erreur est survenue, réessaie.");
      return;
    }
    setSaved(true);

    if (onboarding) {
      // Étape 1 terminée → lance le tour guidé des onglets (AppTour),
      // puis redirige vers Templates (point de départ du tour).
      try {
        localStorage.setItem("hooks-tour-pending", "1");
      } catch {
        /* localStorage indisponible — pas de tour, pas bloquant */
      }
      setTimeout(() => router.push("/templates"), 700);
      return;
    }
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      {onboarding && (
        <div className="mb-8 rounded-2xl border border-accent/30 bg-accent-tint/60 p-5">
          <p className="font-display text-xl font-normal">
            Bienvenue ! Première étape : ton profil entreprise.
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            Complète ces infos une fois — elles s&apos;appliqueront à toutes tes générations.
            Ensuite, on te fait visiter l&apos;app. 🎉
          </p>
        </div>
      )}

      <div className="mb-8 flex items-center gap-3">
        <div className="icon-tile h-11 w-11 shrink-0">
          <Building2 size={20} strokeWidth={1.75} className="text-link" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-normal">Profil entreprise</h1>
          <p className="text-sm text-ink-muted">
            {initialFirstName ? `${initialFirstName} · ` : ""}
            {initialBrandName || "Ta marque"}
          </p>
        </div>
      </div>

      <p className="mb-6 text-sm text-ink-secondary">
        Ce contexte s&apos;applique à TOUTES tes générations, sans avoir à le retaper à chaque
        brief — contrairement au brief (industrie, offre, persona...) qui change à chaque
        annonce, ceci reste stable dans le temps.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="company-description" className="mb-2 block text-sm font-medium text-ink-secondary">
            Contexte de l&apos;entreprise
          </label>
          <p className="mb-2 text-xs text-ink-muted">
            Positionnement, marché, ce qui la rend différente — le contexte qu&apos;un nouveau
            collaborateur devrait connaître avant d&apos;écrire une pub.
          </p>
          <textarea
            id="company-description"
            rows={4}
            value={companyDescription}
            onChange={(e) => setCompanyDescription(e.target.value)}
            placeholder={companyDescriptionPlaceholder}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="brand-tone" className="mb-2 block text-sm font-medium text-ink-secondary">
            Ton de marque
          </label>
          <p className="mb-2 text-xs text-ink-muted">
            Comment la marque parle — formel, direct, humoristique, jamais tel registre...
          </p>
          <textarea
            id="brand-tone"
            rows={3}
            value={brandTone}
            onChange={(e) => setBrandTone(e.target.value)}
            placeholder={brandTonePlaceholder}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="compliance-notes" className="mb-2 block text-sm font-medium text-ink-secondary">
            Contraintes de conformité
          </label>
          <p className="mb-2 text-xs text-ink-muted">
            Ce que les hooks ne doivent jamais dire — allégations interdites, réglementation du
            secteur, mentions obligatoires.
          </p>
          <textarea
            id="compliance-notes"
            rows={3}
            value={complianceNotes}
            onChange={(e) => setComplianceNotes(e.target.value)}
            placeholder={complianceNotesPlaceholder}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="creative-style" className="mb-2 block text-sm font-medium text-ink-secondary">
            Style créatif par défaut
          </label>
          <p className="mb-2 text-xs text-ink-muted">
            Le style « Des hooks comme... » appliqué automatiquement à toutes tes générations.
            Si un style est défini ici, il ne sera plus demandé dans le formulaire de génération.
          </p>
          <select
            id="creative-style"
            value={defaultCreativeStyle}
            onChange={(e) => setDefaultCreativeStyle(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          >
            {CREATIVE_STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-critical">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-btn-primary px-5 py-2.5 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95 disabled:opacity-60"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Enregistré
            </>
          ) : saving ? (
            "Enregistrement..."
          ) : (
            "Enregistrer"
          )}
        </button>
      </form>
    </div>
  );
}
