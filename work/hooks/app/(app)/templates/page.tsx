"use client";

import { useRouter } from "next/navigation";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";
import { PLATFORMS } from "@/lib/ad-platforms";
import { Reveal } from "@/components/Reveal";
import { SpotlightCard } from "@/components/SpotlightCard";
import { ArrowRight, Play } from "lucide-react";

export default function TemplateSelectionPage() {
  const router = useRouter();

  function handleTemplateSelect(templateId: string) {
    // Encode le template ID dans l'URL pour le récupérer dans onboarding
    router.push(`/onboarding?template=${templateId}`);
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-normal">Templates industrie</h1>
      <p className="mb-10 text-lg text-ink-secondary">
        Briefs complets prêts à générer — tout est déjà configuré
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {INDUSTRY_TEMPLATES.map((template, i) => {
          const platformLabel = PLATFORMS[template.brief.platform]?.label;
          return (
            <Reveal key={template.id} delay={i * 0.06}>
              <div className="group cursor-pointer">
                <SpotlightCard className="h-full rounded-2xl border border-border-soft bg-surface p-6 transition-all group-hover:-translate-y-1 group-hover:border-accent/30">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-raised text-2xl">
                    {template.icon}
                  </div>
                  <h2 className="mb-2 font-display text-xl font-normal">{template.label}</h2>
                  <p className="mb-3 text-sm text-ink-secondary">{template.description}</p>
                  <p className="mb-4 text-xs text-ink-muted">
                    Plateforme : {platformLabel} • {template.brief.industry}
                  </p>
                  <button
                    onClick={() => handleTemplateSelect(template.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Générer maintenant
                  </button>
                </SpotlightCard>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.3}>
        <div className="mt-10 rounded-2xl border border-border-soft bg-surface p-6 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-muted">
            Besoin d'un brief 100% sur mesure ?
          </p>
          <button
            onClick={() => router.push("/onboarding")}
            className="inline-flex items-center gap-2 text-ink-secondary transition-colors hover:text-ink"
          >
            Commencer un brief personnalisé
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Reveal>
    </div>
  );
}
