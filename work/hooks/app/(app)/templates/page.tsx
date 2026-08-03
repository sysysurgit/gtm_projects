"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";
import { Reveal } from "@/components/Reveal";
import { SpotlightCard } from "@/components/SpotlightCard";
import { ArrowRight } from "lucide-react";

export default function TemplateSelectionPage() {
  const router = useRouter();

  function handleTemplateSelect(templateId: string) {
    // Encode le template ID dans l'URL pour le récupérer dans onboarding
    router.push(`/onboarding?template=${templateId}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border-soft bg-paper/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="font-display text-xl">
            Hooks
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h1 className="text-center font-display text-3xl font-normal sm:text-4xl">
              Commencez avec un template adapté
            </h1>
            <p className="mt-4 text-center text-lg text-ink-secondary">
              Choisissez votre industrie pour un brief pré-rempli et optimisé
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {INDUSTRY_TEMPLATES.map((template, i) => (
              <Reveal key={template.id} delay={i * 0.06}>
                <div
                  className="group cursor-pointer"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <SpotlightCard
                    className="h-full rounded-2xl border border-border-soft bg-surface p-6 transition-all group-hover:-translate-y-1 group-hover:border-accent/30"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-raised text-2xl">
                      {template.icon}
                    </div>
                    <h2 className="mb-2 font-display text-xl font-normal">{template.label}</h2>
                    <p className="mb-4 text-sm text-ink-secondary">{template.description}</p>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-link">
                      Utiliser ce template
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </SpotlightCard>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="mt-10 text-center">
              <p className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-muted">ou</p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 text-ink-secondary transition-colors hover:text-ink"
              >
                Commencer un brief personnalisé
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
