"use client";

import { useState, type FormEvent } from "react";
import { Building2, Check } from "lucide-react";

export function ProfileForm({
  initialFirstName,
  initialBrandName,
  initialCompanyDescription,
  initialBrandTone,
  initialComplianceNotes,
}: {
  initialFirstName: string;
  initialBrandName: string;
  initialCompanyDescription: string;
  initialBrandTone: string;
  initialComplianceNotes: string;
}) {
  const [companyDescription, setCompanyDescription] = useState(initialCompanyDescription);
  const [brandTone, setBrandTone] = useState(initialBrandTone);
  const [complianceNotes, setComplianceNotes] = useState(initialComplianceNotes);
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
      body: JSON.stringify({ companyDescription, brandTone, complianceNotes }),
    });
    setSaving(false);

    if (!res.ok) {
      setError("Une erreur est survenue, réessaie.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
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
