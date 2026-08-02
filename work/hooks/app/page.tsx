import Link from "next/link";
import {
  Briefcase,
  Users,
  Search,
  MessageCircle,
  ClipboardList,
  Ruler,
  Sparkles,
  Gauge,
  RefreshCw,
  TrendingUp,
  Code2,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { PLATFORMS, type PlatformId } from "@/lib/ad-platforms";
import { Reveal } from "@/components/Reveal";
import { IconBadge } from "@/components/IconBadge";
import { SpotlightCard } from "@/components/SpotlightCard";
import { MagneticLink } from "@/components/MagneticLink";
import { EdgeParticles } from "@/components/EdgeParticles";

const PLATFORM_ICONS: Record<PlatformId, typeof Briefcase> = {
  linkedin_ads: Briefcase,
  meta_ads: Users,
  google_ads: Search,
  reddit_ads: MessageCircle,
};

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Brief hyper-personnalisé",
    body: "Régie, format d'annonce, budget média, étape du funnel, industrie, persona, offre — et un visuel optionnel pour ancrer le hook dans ta créa. Rien de générique : chaque champ change vraiment la génération.",
  },
  {
    icon: Ruler,
    title: "Les vraies contraintes de chaque régie",
    body: "Limites de caractères réelles par plateforme et par format — intro tronquée LinkedIn, primary text Meta, bundle RSA Google, ton anti-pub Reddit. Un hook qui rentre dans le format, pas un paragraphe à recouper toi-même.",
  },
  {
    icon: Sparkles,
    title: "Techniques de copywriting éprouvées",
    body: "AIDA, PAS, Before-After-Bridge, curiosity gap, preuve sociale, urgence... chaque candidat s'appuie sur un angle différent et nommé, pour de vrais choix distincts plutôt que 8 reformulations de la même idée.",
  },
  {
    icon: Gauge,
    title: "Jamais de complaisance",
    body: "Hooks s'auto-évalue en interne selon une grille stricte (pouvoir d'arrêt au scroll, clarté, spécificité, adéquation format, alignement offre) et retravaille ce qui est faible — tu ne vois que ce qui a passé le contrôle.",
  },
];

const CREDENTIALS = [
  {
    icon: TrendingUp,
    text: "Plus de 100k$ de budgets gérés par mois sur Google Ads & LinkedIn Ads",
  },
  {
    icon: Briefcase,
    text: "5+ ans en growth marketing B2B (SEA, Paid Social, ABM)",
  },
  {
    icon: Code2,
    text: "Construit avec Claude Code — l'IA appliquée à son propre métier",
  },
];

export default function LandingPage() {
  const platforms = Object.entries(PLATFORMS) as [PlatformId, (typeof PLATFORMS)[PlatformId]][];

  return (
    <main className="relative flex-1 overflow-x-clip">
      <EdgeParticles className="pointer-events-none absolute top-0 left-0 z-0 hidden w-40 lg:block" />
      <EdgeParticles className="pointer-events-none absolute top-0 right-0 z-0 hidden w-40 lg:block" />

      <div className="relative z-10">
      <div className="relative overflow-hidden">
        <div className="aurora" />

        <div className="absolute top-4 left-4 z-20 rounded border border-ink px-2 py-1.5 text-[11px] leading-[0.95] font-bold text-ink italic transition-transform hover:-rotate-3 hover:scale-105 sm:top-6 sm:left-6">
          <div>SYSY&apos;S</div>
          <div>GTM</div>
          <div>PROJECTS</div>
        </div>
        <Link
          href="/login"
          className="absolute top-6 right-4 z-20 text-sm text-ink/70 transition-colors hover:text-ink sm:top-8 sm:right-6"
        >
          Se connecter
        </Link>

        <section className="relative z-10 px-6 pt-28 pb-20 max-w-3xl mx-auto text-center sm:pt-32 sm:pb-28">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/25 bg-ink/5 px-3 py-1 text-[11px] font-medium tracking-wide text-ink/70 uppercase backdrop-blur-sm">
              LinkedIn · Meta · Google · Reddit Ads
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-6 font-display text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] text-balance">
              Générateur d&apos;accroches pour publicitaires exigeants
            </h1>
          </Reveal>

          <Reveal delay={0.5}>
            <p className="mt-6 text-lg text-ink-secondary text-balance">
              Hooks génère des accroches publicitaires prêtes à tester, pensées avant tout pour
              les régies SEA (LinkedIn, Meta, Google, Reddit Ads) — mais adaptables à d&apos;autres
              formats. Chaque génération est calibrée sur ton contexte réel : ta régie, ton
              industrie et ton persona, pas un prompt générique.
            </p>
          </Reveal>
          <Reveal delay={0.6}>
            <div className="mt-10">
              <MagneticLink
                href="/signup"
                className="inline-block rounded-lg bg-accent text-accent-ink font-medium px-6 py-3 shadow-[0_12px_30px_-8px_rgba(28,0,254,0.45)] transition-[filter] hover:brightness-95"
              >
                Essayer gratuitement — 10 crédits offerts par jour
              </MagneticLink>
            </div>
          </Reveal>
        </section>
      </div>

      <section className="px-6 pb-16 max-w-3xl mx-auto">
        <Reveal>
          <SpotlightCard className="rounded-2xl border border-border-soft bg-surface text-ink p-8 text-center sm:p-12">
            <div className="flex justify-center">
              <IconBadge size="md">
                <RefreshCw size={24} strokeWidth={1.75} className="text-accent-ink" />
              </IconBadge>
            </div>
            <p className="mt-6 font-display text-2xl sm:text-3xl font-semibold text-balance">
              Hooks analyse ses propres recommandations et les retravaille jusqu&apos;à obtenir
              un résultat vraiment convaincant — avant de te les montrer.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              <span>20s pour un résultat</span>
              <span>4 régies, leurs vraies contraintes</span>
            </div>
          </SpotlightCard>
        </Reveal>
      </section>

      <section className="px-6 py-16 max-w-4xl mx-auto">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-wide text-ink-muted mb-6">
            Régies supportées
          </p>
        </Reveal>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {platforms.map(([id, p], i) => {
            const Icon = PLATFORM_ICONS[id];
            return (
              <Reveal key={id} delay={i * 0.05}>
                <SpotlightCard className="h-full rounded-lg border border-border-soft bg-surface text-ink p-4 text-center transition-transform hover:-translate-y-1">
                  <div className="flex justify-center">
                    <IconBadge size="sm" floatDelay={i * 0.3}>
                      <Icon size={20} strokeWidth={1.75} className="text-accent-ink" />
                    </IconBadge>
                  </div>
                  <p className="mt-3 font-semibold text-sm mb-1 break-words">{p.label}</p>
                  <p className="text-xs text-ink-muted">
                    {p.formats.length} format{p.formats.length > 1 ? "s" : ""}
                  </p>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="px-6 py-16 max-w-4xl mx-auto">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Ce qui rend chaque génération vraiment utile
          </h2>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <SpotlightCard className="h-full rounded-lg border border-border-soft bg-surface text-ink p-6 transition-transform hover:-translate-y-1">
                <IconBadge size="sm" floatDelay={i * 0.25}>
                  <f.icon size={20} strokeWidth={1.75} className="text-accent-ink" />
                </IconBadge>
                <p className="mt-4 font-semibold mb-2">{f.title}</p>
                <p className="text-sm text-ink-secondary">{f.body}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-6 py-16 max-w-3xl mx-auto">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-wide text-ink-muted mb-3">
            Pourquoi Hooks existe
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 text-balance">
            Construit par quelqu&apos;un qui gère encore des budgets média au jour le jour.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <SpotlightCard className="rounded-lg border border-border-soft bg-surface text-ink p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <Image
                src="/founder.jpeg"
                alt="Syrian FIS"
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold">Syrian FIS</p>
                <p className="text-sm text-ink-muted">Lead Growth Marketing · Créateur de Hooks</p>
              </div>
              <a
                href="https://linkedin.com/in/syrian-fis"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-ink-muted transition-colors hover:text-link"
                aria-label="Profil LinkedIn de Syrian FIS"
              >
                <ExternalLink className="h-5 w-5" strokeWidth={1.75} />
              </a>
            </div>
            <p className="text-ink-secondary mb-4">
              Après plus de 5 ans à piloter des budgets Google Ads, LinkedIn Ads et Meta Ads pour
              des environnements B2B exigeants — plus de 100k$/mois en Lead Growth Marketing,
              du paid media et de l&apos;ABM avant ça — j&apos;ai vu passer assez de hooks
              médiocres pour savoir où se cache le vrai coût : jamais dans la génération, toujours
              dans le budget média dépensé à découvrir qu&apos;une accroche ne fonctionne pas.
            </p>
            <p className="text-ink-secondary mb-6">
              Hooks est né de cette frustration très concrète. Je l&apos;ai construit avec Claude
              Code, en marge de mon métier de growth marketer, pour avoir enfin un outil qui
              connaît les vraies contraintes de chaque régie et qui retravaille ses propres
              recommandations plutôt que de sortir huit variations du même paragraphe.
            </p>
            <div className="grid gap-4 border-t border-border-soft pt-5 sm:grid-cols-3">
              {CREDENTIALS.map((c) => (
                <div key={c.text} className="flex items-start gap-2">
                  <c.icon className="mt-0.5 h-4 w-4 shrink-0 text-link" strokeWidth={1.75} />
                  <p className="text-xs text-ink-secondary">{c.text}</p>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </Reveal>
      </section>

      <section className="px-6 py-16 max-w-2xl mx-auto text-center">
        <Reveal>
          <SpotlightCard className="rounded-2xl border border-border-soft bg-surface text-ink p-8 sm:p-10">
            <p className="font-display text-3xl sm:text-4xl font-bold mb-3">100% gratuit.</p>
            <p className="text-ink-secondary">
              10 crédits par jour, jusqu&apos;à 5 hooks par crédit — sans carte bancaire, sans
              essai limité dans le temps.
            </p>
          </SpotlightCard>
        </Reveal>
      </section>

      <section className="px-6 py-20 max-w-2xl mx-auto text-center">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Prêt à tester sur ton prochain brief ?
          </h2>
          <p className="text-ink-secondary mb-8">10 crédits offerts par jour, sans carte bancaire.</p>
          <MagneticLink
            href="/signup"
            className="inline-block rounded-lg bg-accent text-accent-ink font-medium px-6 py-3 shadow-[0_12px_30px_-8px_rgba(28,0,254,0.45)] transition-[filter] hover:brightness-95"
          >
            Essayer gratuitement
          </MagneticLink>
        </Reveal>
      </section>
      </div>
    </main>
  );
}
