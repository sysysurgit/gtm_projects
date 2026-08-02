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
  TrendingUp,
  Code2,
  ExternalLink,
  ArrowRight,
  X,
  Check,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { PLATFORMS, type PlatformId } from "@/lib/ad-platforms";
import { Reveal } from "@/components/Reveal";
import { IconBadge } from "@/components/IconBadge";
import { SpotlightCard } from "@/components/SpotlightCard";
import { MagneticLink } from "@/components/MagneticLink";
import { EdgeParticles } from "@/components/EdgeParticles";
import { BrandNameCta } from "@/components/BrandNameCta";

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

const BEFORE = [
  "Une accroche générique qui ressemble à celle du concurrent d'à côté",
  "Un seul angle, décliné huit fois avec les mêmes mots",
  "Aucune idée si ça rentre vraiment dans le format de la régie",
  "Un prompt ChatGPT à retravailler à la main avant de pouvoir tester",
];

const AFTER = [
  "Des hooks ancrés dans ton brief réel : offre, persona, preuve, concurrence",
  "Plusieurs angles nommés et vraiment distincts (AIDA, PAS, preuve sociale...)",
  "Des limites de caractères réelles par régie, vérifiées en code, pas juste dans le prompt",
  "Un résultat prêt à coller dans ton ad manager, pas un brouillon à retravailler",
];

const EXAMPLE_CARDS = [
  { title: "0 erreur sur 14 200 bulletins de paie en 2023.", cta: "En savoir plus" },
  { title: "Vos commerciaux perdent 3h/semaine sur des devis manuels.", cta: "Essayer gratuitement" },
];

const FAQ = [
  {
    q: "C'est vraiment gratuit ?",
    a: "Oui — 5 crédits offerts chaque jour, jusqu'à 5 hooks par crédit, sans carte bancaire et sans limite de temps sur l'offre.",
  },
  {
    q: "Mes briefs sont-ils sauvegardés ?",
    a: "Ton dernier brief est mémorisé pour préremplir la prochaine génération. Un visuel joint reste éphémère : il sert uniquement à la génération en cours, jamais stocké.",
  },
  {
    q: "Sur quelles régies ça marche ?",
    a: "LinkedIn Ads, Meta Ads, Google Ads (format RSA) et Reddit Ads — chacune avec ses vraies contraintes de format, pas une limite générique.",
  },
  {
    q: "Pourquoi pas juste ChatGPT ou Claude directement ?",
    a: "Hooks connaît les contraintes réelles de chaque régie, applique des techniques de copywriting nommées et distinctes par angle, et s'auto-critique avant de te montrer le résultat — un prompt générique ne fait rien de tout ça par défaut.",
  },
];

export default function LandingPage() {
  const platforms = Object.entries(PLATFORMS) as [PlatformId, (typeof PLATFORMS)[PlatformId]][];

  return (
    <main className="relative flex-1 overflow-x-clip">
      <EdgeParticles className="pointer-events-none absolute top-0 left-0 z-0 hidden w-40 lg:block" />
      <EdgeParticles className="pointer-events-none absolute top-0 right-0 z-0 hidden w-40 lg:block" />

      <div className="relative z-10">
      {/* Bandeau d'annonce — info réelle, pas d'urgence fabriquée */}
      <div className="border-b border-border-soft bg-surface px-4 py-2.5 text-center text-xs text-ink-secondary">
        100% gratuit — 5 crédits offerts chaque jour, sans carte bancaire.
      </div>

      <header className="sticky top-0 z-30 border-b border-border-soft bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-1">
            <Link href="/" aria-label="Hooks" className="text-2xl leading-none">
              🪝
            </Link>
            <p className="text-[10px] leading-none text-ink-muted italic">
              a sysy&apos;s gtm project
            </p>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-ink-secondary sm:flex">
            <a href="#fonctionnalites" className="transition-colors hover:text-ink">
              Fonctionnalités
            </a>
            <a href="#pourquoi" className="transition-colors hover:text-ink">
              Pourquoi Hooks
            </a>
            <a href="#faq" className="transition-colors hover:text-ink">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden text-sm text-ink-secondary transition-colors hover:text-ink sm:inline"
            >
              Se connecter
            </Link>
            <MagneticLink
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-btn-primary px-4 py-2 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95"
            >
              Essayer <ArrowRight className="h-3.5 w-3.5" />
            </MagneticLink>
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="aurora" />

        <section className="relative z-10 mx-auto max-w-3xl px-6 pt-16 pb-10 text-center sm:pt-24">
          <Reveal>
            <h1 className="text-balance font-display text-5xl leading-[1.05] font-normal sm:text-7xl">
              Générateur d&apos;accroch
              <span className="relative inline-block">
                e
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 text-4xl select-none sm:-top-14 sm:text-6xl"
                  style={{
                    transform:
                      "translateX(-50%) perspective(300px) rotateX(22deg) rotateZ(-9deg)",
                    filter: "drop-shadow(0 10px 14px rgba(20,20,30,0.35))",
                  }}
                >
                  🪝
                </span>
              </span>
              s pour publicitaires exigeants
            </h1>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mt-6 text-balance text-lg text-ink-secondary">
              Hooks écrit tes accroches pour LinkedIn, Meta, Google et Reddit Ads.
              <br />
              Calibrées sur ta régie, ton industrie et ta cible — pas un prompt générique.
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-8">
              <BrandNameCta />
              <p className="mt-4 text-xs text-ink-muted">
                Sans carte bancaire. 5 crédits offerts par jour.
              </p>
            </div>
          </Reveal>
        </section>

        <Reveal delay={0.3}>
          <section className="relative z-10 mx-auto max-w-2xl px-6 pb-20">
            <p className="mb-3 text-center text-xs font-medium tracking-wide text-ink-muted uppercase">
              Exemple de résultat
            </p>
            <div className="grid gap-4 rounded-2xl border border-border-soft bg-surface p-4 sm:grid-cols-2 sm:p-5">
              {EXAMPLE_CARDS.map((c) => (
                <div key={c.title} className="rounded-xl border border-border-soft bg-surface-raised p-4 text-left">
                  <p className="text-sm font-medium text-ink">{c.title}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-link uppercase">
                    {c.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </div>

      <section id="fonctionnalites" className="mx-auto max-w-4xl scroll-mt-20 px-6 py-16">
        <Reveal>
          <h2 className="text-balance text-center font-display text-3xl font-normal sm:text-4xl">
            Ce qui rend chaque génération vraiment utile
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <SpotlightCard className="h-full rounded-2xl border border-border-soft bg-surface p-6 transition-transform hover:-translate-y-1">
                <IconBadge size="sm" floatDelay={i * 0.25}>
                  <f.icon size={20} strokeWidth={1.75} className="text-link" />
                </IconBadge>
                <p className="mt-4 mb-2 font-semibold">{f.title}</p>
                <p className="text-sm text-ink-secondary">{f.body}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <Reveal>
          <p className="mb-6 text-center text-xs font-medium tracking-wide text-ink-muted uppercase">
            Régies supportées
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {platforms.map(([id, p], i) => {
            const Icon = PLATFORM_ICONS[id];
            return (
              <Reveal key={id} delay={i * 0.05}>
                <SpotlightCard className="h-full rounded-2xl border border-border-soft bg-surface p-4 text-center transition-transform hover:-translate-y-1">
                  <div className="flex justify-center">
                    <IconBadge size="sm" floatDelay={i * 0.3}>
                      <Icon size={20} strokeWidth={1.75} className="text-link" />
                    </IconBadge>
                  </div>
                  <p className="mt-3 mb-1 text-sm font-semibold break-words">{p.label}</p>
                  <p className="text-xs text-ink-muted">
                    {p.formats.length} format{p.formats.length > 1 ? "s" : ""}
                  </p>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <Reveal>
          <h2 className="text-balance text-center font-display text-3xl font-normal sm:text-4xl">
            Un hook ne devrait jamais être une corvée de rédaction
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Reveal delay={0.05}>
            <div className="h-full rounded-2xl border border-border-soft p-6 sm:p-7">
              <span className="inline-block rounded-full border border-border-soft px-3 py-1 text-xs font-medium tracking-wide text-ink-muted uppercase">
                Sans Hooks
              </span>
              <ul className="mt-5 space-y-3.5">
                {BEFORE.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                    <X className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="h-full rounded-2xl border border-accent/40 bg-accent-tint/40 p-6 shadow-[0_0_40px_-15px_rgba(42,77,255,0.5)] sm:p-7">
              <span className="inline-block rounded-full border border-accent/40 bg-paper px-3 py-1 text-xs font-medium tracking-wide text-link uppercase">
                Avec Hooks
              </span>
              <ul className="mt-5 space-y-3.5">
                {AFTER.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-link" strokeWidth={1.75} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="pourquoi" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-16">
        <Reveal>
          <p className="mb-3 text-center text-xs font-medium tracking-wide text-ink-muted uppercase">
            Pourquoi Hooks existe
          </p>
          <h2 className="text-balance text-center font-display text-3xl font-normal sm:text-4xl">
            Construit par quelqu&apos;un qui gère encore des budgets média au jour le jour.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <SpotlightCard className="mt-10 rounded-2xl border border-border-soft bg-surface p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-4">
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
            <p className="mb-4 text-ink-secondary">
              Après plus de 5 ans à piloter des budgets Google Ads, LinkedIn Ads et Meta Ads pour
              des environnements B2B exigeants — plus de 100k$/mois en Lead Growth Marketing,
              du paid media et de l&apos;ABM avant ça — j&apos;ai vu passer assez de hooks
              médiocres pour savoir où se cache le vrai coût : jamais dans la génération, toujours
              dans le budget média dépensé à découvrir qu&apos;une accroche ne fonctionne pas.
            </p>
            <p className="mb-6 text-ink-secondary">
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

      <section className="mx-auto max-w-lg px-6 py-16 text-center">
        <Reveal>
          <div className="rounded-2xl border border-accent/40 bg-surface p-8 shadow-[0_0_50px_-20px_rgba(42,77,255,0.5)] sm:p-10">
            <p className="font-display text-6xl font-normal">0€</p>
            <p className="mt-1 text-sm text-ink-muted">Pour toujours, sans carte bancaire</p>
            <ul className="mt-6 space-y-3 border-t border-border-soft pt-6 text-left">
              {["5 crédits offerts par jour", "Jusqu'à 5 hooks par crédit", "4 régies, leurs vraies contraintes", "Aucune limite de temps sur l'offre"].map(
                (item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-link" strokeWidth={1.75} />
                    {item}
                  </li>
                )
              )}
            </ul>
            <MagneticLink
              href="/signup"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95"
            >
              Essayer gratuitement <ArrowRight className="h-4 w-4" />
            </MagneticLink>
          </div>
        </Reveal>
      </section>

      <section id="faq" className="mx-auto max-w-2xl scroll-mt-20 px-6 py-16">
        <Reveal>
          <h2 className="text-balance text-center font-display text-3xl font-normal sm:text-4xl">
            Questions fréquentes
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="mt-10 divide-y divide-border-soft rounded-2xl border border-border-soft bg-surface">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-6 py-5 first:rounded-t-2xl last:rounded-b-2xl">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:content-none">
                  {item.q}
                  <Plus className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-45" />
                </summary>
                <p className="mt-3 text-sm text-ink-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-normal sm:text-4xl">
            Prêt à tester sur ton prochain brief ?
          </h2>
          <p className="mt-4 mb-8 text-ink-secondary">5 crédits offerts par jour, sans carte bancaire.</p>
          <MagneticLink
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-btn-primary px-6 py-3 font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95"
          >
            Essayer gratuitement <ArrowRight className="h-4 w-4" />
          </MagneticLink>
        </Reveal>
      </section>

      <footer className="relative overflow-hidden border-t border-border-soft px-6 pt-16">
        <div className="mx-auto grid max-w-6xl gap-10 pb-16 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl">Hooks</p>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              Générateur d&apos;accroches publicitaires calibrées sur ton brief réel, régie par
              régie.
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-ink-muted uppercase">Produit</p>
            <ul className="space-y-2 text-sm text-ink-secondary">
              <li>
                <a href="#fonctionnalites" className="hover:text-ink">
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#pourquoi" className="hover:text-ink">
                  Pourquoi Hooks
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-ink">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-ink-muted uppercase">Compte</p>
            <ul className="space-y-2 text-sm text-ink-secondary">
              <li>
                <Link href="/signup" className="hover:text-ink">
                  Inscription
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-ink">
                  Connexion
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-border-soft py-6 text-xs text-ink-muted">
          <p>&copy; {new Date().getFullYear()} Hooks. Tous droits réservés.</p>
          <a
            href="https://linkedin.com/in/syrian-fis"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
            aria-label="Profil LinkedIn de Syrian FIS"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          </a>
        </div>
        <div className="pointer-events-none flex justify-center overflow-hidden pb-2 text-center">
          <p className="footer-wordmark">Hooks</p>
        </div>
      </footer>
      </div>
    </main>
  );
}
