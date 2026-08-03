"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";

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

const TONE_BORDER: Record<Tone, string> = {
  good: "border-good",
  warning: "border-warning",
  critical: "border-critical",
};

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const tone = toneFromScore(score, max);
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-sm font-semibold ${TONE_BORDER[tone]} ${TONE_TEXT[tone]}`}
    >
      <span className={`h-2 w-2 rounded-full ${TONE_BG[tone]}`} />
      {score}/{max}
    </div>
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
    <div className="relative min-h-screen">
      {/* Aurora glow hero */}
      <div className="aurora" />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero section */}
        <div className="relative mb-16 text-center">
          <h1 className="mb-4 font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Landing Roast
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-ink-secondary sm:text-xl">
            Soumets ton URL, reçois un <span className="text-link font-semibold">score /100</span> +{" "}
            <span className="text-link font-semibold">3 quick wins</span> gratuits.
            <br />
            Landing pages B2B optimisées conversion paid.
          </p>

          {/* Form */}
          {!result && (
            <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ton-landing-page.com"
                  required
                  disabled={loading}
                  className="flex-1 rounded-xl border border-border bg-surface px-5 py-4 text-ink placeholder-ink-muted transition focus:border-link focus:outline-none focus:ring-2 focus:ring-link/20 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-btn-primary px-8 py-4 font-semibold text-btn-primary-ink transition hover:bg-btn-primary/90 disabled:opacity-50"
                >
                  {loading ? "Analyse en cours..." : "Analyser gratuitement"}
                </button>
              </div>
              {error && (
                <p className="mt-4 rounded-lg border border-critical bg-critical-tint px-4 py-3 text-sm text-critical">
                  {error}
                </p>
              )}
            </form>
          )}

          {/* Loading state */}
          {loading && (
            <div className="mx-auto mt-12 max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
              <div className="mb-4 flex justify-center gap-2">
                <span className="bounce-dot h-3 w-3 rounded-full bg-link" />
                <span className="bounce-dot h-3 w-3 rounded-full bg-link" />
                <span className="bounce-dot h-3 w-3 rounded-full bg-link" />
              </div>
              <p className="font-mono text-sm text-ink-secondary">
                Analyse en cours (screenshot + IA)
                <br />
                ~30-45 secondes...
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Score global */}
            <div className="spotlight-card rounded-2xl border border-border bg-surface p-8 text-center">
              <div className="mb-4">
                <span className="font-mono text-sm uppercase tracking-wider text-ink-muted">Score global</span>
              </div>
              <div
                className={`mb-6 font-display text-8xl font-bold tabular-nums ${TONE_TEXT[totalTone]}`}
              >
                {result.totalScore}
                <span className="text-4xl text-ink-muted">/100</span>
              </div>
              <p className="mb-8 text-lg text-ink-secondary">
                {result.totalScore >= 75
                  ? "🔥 Excellente landing ! Quelques détails à peaufiner."
                  : result.totalScore >= 50
                    ? "⚠️ Bonne base, gros gains possibles avec les quick wins."
                    : "🚨 Beaucoup d'améliorations nécessaires."}
              </p>

              {/* CTA Upsell */}
              <div className="rounded-xl border border-link/30 bg-accent-tint p-6">
                <h3 className="mb-2 font-display text-xl font-bold text-ink">
                  Audit complet système + funnel conversion
                </h3>
                <p className="mb-4 text-sm text-ink-secondary">
                  Analyse end-to-end : tracking, CRM, email nurturing, A/B tests prioritaires, plan 90j
                  chiffré.
                </p>
                <a
                  href={calcomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-xl bg-link px-6 py-3 font-semibold text-white transition hover:bg-link/90"
                >
                  Réserver un audit · 490€
                </a>
              </div>
            </div>

            {/* Screenshot */}
            <div className="spotlight-card overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="border-b border-border bg-surface-raised px-6 py-4">
                <h3 className="font-display text-lg font-bold text-ink">Screenshot Desktop</h3>
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
            </div>

            {/* Top 3 Quick Wins */}
            <div className="spotlight-card rounded-2xl border border-border bg-surface p-8">
              <h3 className="mb-6 font-display text-2xl font-bold text-ink">
                🎯 Top 3 Quick Wins
              </h3>
              <div className="space-y-4">
                {result.topWins.map((win, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 rounded-xl border border-border-soft bg-surface-raised p-5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-link/20 font-mono text-sm font-bold text-link">
                      {idx + 1}
                    </div>
                    <p className="text-ink">{win}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Détail sections */}
            <div className="space-y-6">
              <h3 className="font-display text-2xl font-bold text-ink">Détail par section</h3>
              {result.sections.map((section) => {
                const tone = toneFromScore(section.score, section.max);
                return (
                  <div
                    key={section.name}
                    className="spotlight-card rounded-2xl border border-border bg-surface p-6"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-display text-xl font-bold text-ink">{section.name}</h4>
                      <ScoreBadge score={section.score} max={section.max} />
                    </div>

                    {/* Issues */}
                    {section.issues.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-critical">
                          ❌ Problèmes détectés
                        </p>
                        <ul className="space-y-2">
                          {section.issues.map((issue, idx) => (
                            <li
                              key={idx}
                              className="rounded-lg border border-critical/20 bg-critical-tint px-4 py-2 text-sm text-ink-secondary"
                            >
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Wins */}
                    {section.wins.length > 0 && (
                      <div>
                        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-good">
                          ✅ Actions recommandées
                        </p>
                        <ul className="space-y-2">
                          {section.wins.map((win, idx) => (
                            <li
                              key={idx}
                              className="rounded-lg border border-good/20 bg-good-tint px-4 py-2 text-sm text-ink-secondary"
                            >
                              {win}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CTA bottom */}
            <div className="spotlight-card rounded-2xl border border-link/30 bg-accent-tint p-8 text-center">
              <h3 className="mb-3 font-display text-2xl font-bold text-ink">
                Besoin d'aide pour implémenter ces recommandations ?
              </h3>
              <p className="mb-6 text-ink-secondary">
                Audit complet système + funnel + plan d'action 90j chiffré · <strong>490€</strong>
              </p>
              <a
                href={calcomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-xl bg-link px-8 py-4 font-semibold text-white transition hover:bg-link/90"
              >
                Réserver un call · Cal.com
              </a>
            </div>

            {/* Reset button */}
            <div className="text-center">
              <button
                onClick={() => {
                  setResult(null);
                  setUrl("");
                }}
                className="rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-ink transition hover:bg-surface-raised"
              >
                Analyser une autre landing page
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!result && (
          <div className="mt-24 text-center">
            <p className="text-sm text-ink-muted">
              Propulsé par Gemini 2.0 Flash · 100% gratuit · Design v7 gethooks
            </p>
          </div>
        )}
      </div>

      {/* Footer wordmark */}
      <div className="pointer-events-none mt-24 overflow-hidden">
        <div className="footer-wordmark text-center">Landing Roast</div>
      </div>
    </div>
  );
}
