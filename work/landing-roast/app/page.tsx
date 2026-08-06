"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flame } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SpotlightCard } from "@/components/SpotlightCard";
import { MagneticLink } from "@/components/MagneticLink";

interface SectionScore {
  name: string;
  score: number;
  max: number;
  issues: string[];
  wins: string[];
}

interface AnalysisResult {
  url: string;
  screenshot: string;
  totalScore: number;
  sections: SectionScore[];
  topWins: string[];
  shareId: string;
}

type Tone = "good" | "warning" | "critical";

function toneFromScore(score: number, max: number): Tone {
  const ratio = score / max;
  if (ratio >= 0.75) return "good";
  if (ratio >= 0.5) return "warning";
  return "critical";
}

const TONE_TEXT: Record<Tone, string> = {
  good: "text-good",
  warning: "text-warning",
  critical: "text-critical",
};

const TONE_BG: Record<Tone, string> = {
  good: "bg-good",
  warning: "bg-warning",
  critical: "bg-critical",
};

const TONE_TINT: Record<Tone, string> = {
  good: "bg-good-tint",
  warning: "bg-warning-tint",
  critical: "bg-critical-tint",
};

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const tone = toneFromScore(score, max);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-semibold tracking-wide uppercase ${TONE_TEXT[tone]} ${TONE_TINT[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_BG[tone]}`} />
      {score}/{max}
    </span>
  );
}

export default function LandingRoastPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur analyse");
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const totalTone = result ? toneFromScore(result.totalScore, 100) : "critical";
  const calcomLink = process.env.NEXT_PUBLIC_CALCOM_LINK || "https://cal.com";

  return (
    <main className="relative flex-1 overflow-x-clip">
      {/* Bandeau d'annonce */}
      <div className="border-b border-border-soft bg-surface px-4 py-2.5 text-center text-xs text-ink-secondary">
        <span className="pulse-dot mr-2 align-middle" />
        100% gratuit — score + 3 quick wins en ~30-45 secondes
      </div>

      <header className="sticky top-0 z-30 border-b border-border-soft bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              aria-label="Landing Roast"
              className="inline-flex items-center gap-1.5 font-display text-xl leading-none"
            >
              Landing Roast <Flame className="h-4 w-4 text-link" strokeWidth={1.75} />
            </Link>
            <p className="text-[10px] leading-none text-ink-muted italic">a sysy&apos;s gtm project</p>
          </div>
          <div className="flex items-center gap-4">
            <MagneticLink
              href={calcomLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-btn-primary px-4 py-2 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95"
            >
              Audit complet · 490€ <ArrowRight className="h-3.5 w-3.5" />
            </MagneticLink>
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="aurora" />
        <div className="side-glow side-glow-left" />
        <div className="side-glow side-glow-right" />

        <section className="relative z-10 mx-auto max-w-3xl px-6 pt-16 pb-10 text-center sm:pt-24">
          <Reveal>
            <span className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-border-soft bg-surface px-2.5 py-1 font-mono text-[11px] tracking-wide text-ink-secondary uppercase">
              <span className="signal-dot h-1.5 w-1.5 rounded-full bg-link" />
              Analyse IA de landing pages paid
            </span>
            <h1 className="text-balance font-display text-4xl leading-[1.1] font-normal sm:text-5xl">
              Ta landing page tient-elle la route{" "}
              <span className="relative inline-block whitespace-nowrap">
                face au paid ?
                <svg
                  aria-hidden
                  viewBox="0 0 220 24"
                  className="pointer-events-none absolute -bottom-2 left-0 h-4 w-full text-link sm:-bottom-3 sm:h-6 -z-10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M4 15.5C40 8 90 5 112 10.5C138 17 168 6 216 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="underline-draw"
                  />
                </svg>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink-secondary">
              Soumets ton URL, reçois un <span className="font-semibold text-link">score /100</span> et{" "}
              <span className="font-semibold text-link">3 quick wins</span> gratuits — hero, value prop, trust
              signals, CTA, mobile, clarté. Calibré pour les landing pages B2B optimisées conversion paid.
            </p>
          </Reveal>

          {!result && (
            <Reveal delay={0.16}>
              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ton-landing-page.com"
                  required
                  disabled={loading}
                  className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-btn-primary px-6 py-3 font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Analyse en cours..." : "Analyser gratuitement"}
                  {!loading && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </form>
              {error && (
                <p className="mt-4 rounded-2xl border border-critical/40 bg-critical-tint px-4 py-3 text-sm text-critical">
                  {error}
                </p>
              )}
            </Reveal>
          )}

          {loading && (
            <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border-soft bg-surface p-8 text-center">
              <div className="mb-4 flex justify-center gap-2.5">
                <span className="bounce-dot h-3 w-3 rounded-full bg-link" />
                <span className="bounce-dot h-3 w-3 rounded-full bg-link" />
                <span className="bounce-dot h-3 w-3 rounded-full bg-link" />
              </div>
              <p className="font-mono text-xs text-ink-secondary">
                Analyse en cours (screenshot + IA)
                <br />
                ~30-45 secondes...
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-8 px-6 pb-24">
        {result && (
          <div className="flex flex-col gap-8">
            {/* Score global */}
            <SpotlightCard className="rounded-2xl border border-border-soft bg-surface p-8 text-center">
              <span className="font-mono text-xs font-medium tracking-wide text-ink-muted uppercase">
                Score global
              </span>
              <div className={`mt-4 mb-2 font-display text-7xl font-normal tabular-nums ${TONE_TEXT[totalTone]}`}>
                {result.totalScore}
                <span className="text-3xl text-ink-muted">/100</span>
              </div>
              <p className="mb-8 text-ink-secondary">
                {result.totalScore >= 75
                  ? "🔥 Excellente landing ! Quelques détails à peaufiner."
                  : result.totalScore >= 50
                    ? "⚠️ Bonne base, gros gains possibles avec les quick wins."
                    : "🚨 Beaucoup d'améliorations nécessaires."}
              </p>

              <div className="rounded-2xl border border-accent/30 bg-accent-tint/50 p-6 text-left">
                <h3 className="mb-2 font-display text-xl font-normal text-ink">
                  Audit complet système + funnel conversion
                </h3>
                <p className="mb-4 text-sm text-ink-secondary">
                  Analyse end-to-end : tracking, CRM, email nurturing, A/B tests prioritaires, plan 90j chiffré.
                </p>
                <MagneticLink
                  href={calcomLink}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-btn-primary px-5 py-2.5 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95"
                >
                  Réserver un audit · 490€ <ArrowRight className="h-3.5 w-3.5" />
                </MagneticLink>
              </div>
            </SpotlightCard>

            {/* Screenshot */}
            <SpotlightCard className="overflow-hidden rounded-2xl border border-border-soft bg-surface">
              <div className="border-b border-border-soft bg-surface-raised px-6 py-4">
                <h3 className="font-display text-lg font-normal text-ink">Screenshot Desktop</h3>
                <p className="text-sm text-ink-muted">{result.url}</p>
              </div>
              <div className="p-6">
                <Image
                  src={result.screenshot}
                  alt="Screenshot landing page"
                  width={1440}
                  height={900}
                  className="w-full rounded-lg border border-border-soft"
                  unoptimized
                />
              </div>
            </SpotlightCard>

            {/* Top 3 Quick Wins */}
            <SpotlightCard className="rounded-2xl border border-border-soft bg-surface p-6 sm:p-8">
              <h3 className="mb-6 font-display text-2xl font-normal text-ink">🎯 Top 3 Quick Wins</h3>
              <div className="flex flex-col gap-4">
                {result.topWins.map((win, idx) => (
                  <div key={idx} className="flex gap-4 rounded-2xl border border-border-soft bg-surface-raised p-5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-tint font-mono text-sm font-bold text-link">
                      {idx + 1}
                    </div>
                    <p className="text-ink">{win}</p>
                  </div>
                ))}
              </div>
            </SpotlightCard>

            {/* Détail sections */}
            <div className="flex flex-col gap-5">
              <h3 className="font-display text-2xl font-normal text-ink">Détail par section</h3>
              {result.sections.map((section) => {
                return (
                  <SpotlightCard
                    key={section.name}
                    className="rounded-2xl border border-border-soft bg-surface p-6 transition-transform hover:-translate-y-1"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-display text-xl font-normal text-ink">{section.name}</h4>
                      <ScoreBadge score={section.score} max={section.max} />
                    </div>

                    {section.issues.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 font-mono text-xs font-medium tracking-wide text-critical uppercase">
                          ❌ Problèmes détectés
                        </p>
                        <ul className="flex flex-col gap-2">
                          {section.issues.map((issue, idx) => (
                            <li
                              key={idx}
                              className="rounded-xl border border-critical/20 bg-critical-tint px-4 py-2 text-sm text-ink-secondary"
                            >
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.wins.length > 0 && (
                      <div>
                        <p className="mb-2 font-mono text-xs font-medium tracking-wide text-good uppercase">
                          ✅ Actions recommandées
                        </p>
                        <ul className="flex flex-col gap-2">
                          {section.wins.map((win, idx) => (
                            <li
                              key={idx}
                              className="rounded-xl border border-good/20 bg-good-tint px-4 py-2 text-sm text-ink-secondary"
                            >
                              {win}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </SpotlightCard>
                );
              })}
            </div>

            {/* CTA bottom */}
            <SpotlightCard className="rounded-2xl border border-accent/30 bg-accent-tint/50 p-8 text-center">
              <h3 className="mb-3 font-display text-2xl font-normal text-ink">
                Besoin d&apos;aide pour implémenter ces recommandations ?
              </h3>
              <p className="mb-6 text-ink-secondary">
                Audit complet système + funnel + plan d&apos;action 90j chiffré · <strong>490€</strong>
              </p>
              <MagneticLink
                href={calcomLink}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95"
              >
                Réserver un call · Cal.com <ArrowRight className="h-4 w-4" />
              </MagneticLink>
            </SpotlightCard>

            {/* Reset */}
            <div className="text-center">
              <button
                onClick={() => {
                  setResult(null);
                  setUrl("");
                }}
                className="rounded-full border border-border-soft px-5 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                Analyser une autre landing page
              </button>
            </div>
          </div>
        )}

        {!result && (
          <p className="mt-16 text-center text-xs text-ink-muted">
            Propulsé par Gemini · 100% gratuit · analyse en ~30-45 secondes
          </p>
        )}
      </div>

      <footer className="relative overflow-hidden border-t border-border-soft px-6 pt-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 pb-10 text-center">
          <p className="font-display text-2xl">Landing Roast</p>
          <p className="max-w-md text-sm text-ink-muted">
            Analyse IA de landing pages paid — un projet gratuit des Sysy&apos;s GTM Projects.
          </p>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 border-t border-border-soft py-6 text-xs text-ink-muted">
          <p>&copy; {new Date().getFullYear()} Sysy&apos;s GTM Projects. Tous droits réservés.</p>
        </div>
        <div className="pointer-events-none flex justify-center overflow-hidden pb-2 text-center">
          <p className="footer-wordmark">Roast</p>
        </div>
      </footer>
    </main>
  );
}
