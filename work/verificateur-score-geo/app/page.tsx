"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { MagneticLink } from "@/components/MagneticLink";

interface Recommendation {
  points: number;
  action: string;
}

interface ScoreCategory {
  key: string;
  label: string;
  score: number;
  max: number;
  details: string[];
  recommendations: Recommendation[];
}

interface AgentReadinessResult {
  hostname: string;
  score: number;
  checks: ScoreCategory[];
  llmsTxtDraft: string | null;
}

interface GeoScoreResult {
  url: string;
  hostname: string;
  fetchedAt: string;
  pageTitle: string | null;
  metaDescription: string | null;
  totalScore: number;
  aiEvaluated: boolean;
  categories: ScoreCategory[];
  agentReadiness: AgentReadinessResult | null;
}

type PageCategory = "home" | "pricing" | "product" | "resources" | "about" | "careers" | "contact" | "legal" | "other";

const CATEGORY_LABELS: Record<PageCategory, string> = {
  home: "Accueil",
  pricing: "Pricing",
  product: "Produit",
  resources: "Ressources",
  about: "À propos",
  careers: "Carrières",
  contact: "Contact",
  legal: "Légal",
  other: "Autre",
};

interface SelectedPage {
  url: string;
  category: PageCategory;
}

interface DiscoveryResult {
  rootUrl: string;
  hostname: string;
  pages: SelectedPage[];
  source: "sitemap" | "homepage-links";
  totalFound: number;
  totalFoundIsApproximate: boolean;
  capped: boolean;
  agentReadiness: AgentReadinessResult;
}

interface PageCrawlResult {
  url: string;
  category: PageCategory;
  status: "pending" | "loading" | "done" | "error";
  result?: GeoScoreResult;
  error?: string;
}

type Tone = "good" | "warning" | "critical";

function toneFromRatio(ratio: number): Tone {
  if (ratio >= 0.75) return "good";
  if (ratio >= 0.5) return "warning";
  return "critical";
}

function statusWord(ratio: number): string {
  if (ratio >= 0.75) return "Signal fort";
  if (ratio >= 0.5) return "Signal moyen";
  return "Signal faible";
}

const TONE_TEXT: Record<Tone, string> = { good: "text-good", warning: "text-warning", critical: "text-critical" };
const TONE_BG: Record<Tone, string> = { good: "bg-good", warning: "bg-warning", critical: "bg-critical" };
const TONE_TINT: Record<Tone, string> = { good: "bg-good-tint", warning: "bg-warning-tint", critical: "bg-critical-tint" };

function CategoryTag({ category }: { category: PageCategory }) {
  return (
    <span className="shrink-0 rounded bg-border-soft px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-ink-muted uppercase">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function StatusPill({ ratio }: { ratio: number }) {
  const tone = toneFromRatio(ratio);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] tracking-wide uppercase ${TONE_TEXT[tone]} ${TONE_TINT[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_BG[tone]}`} />
      {statusWord(ratio)}
    </span>
  );
}

// Étapes réelles de l'analyse (fetch + parsing + appel IA côté serveur).
// Un délai minimum de 3 à 8s est imposé côté client pour laisser le temps de
// les afficher — sans jamais raccourcir le vrai temps de calcul si celui-ci
// dépasse ce minimum.
const LOADING_STEPS = [
  "Récupération de la page…",
  "Analyse de la structure et du balisage…",
  "Détection des données structurées (schema.org)…",
  "Recherche de citations, statistiques et sources…",
  "Évaluation de la clarté d'entité par l'IA…",
  "Calcul du score final…",
];

/** Exécute `worker` sur chaque élément avec au plus `limit` tâches en vol simultanément. */
async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function runner() {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;
      await worker(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
}

function potentialScore(categories: ScoreCategory[], currentScore: number): number {
  const gain = categories.reduce((sum, c) => sum + c.recommendations.reduce((s, r) => s + r.points, 0), 0);
  return Math.min(100, currentScore + gain);
}

/** Plan d'action d'une page : recommandations triées par impact, avec le score visé si on les applique. */
function ActionPlan({
  categories,
  currentScore,
  hostname,
  title = "Plan d'action GEO",
}: {
  categories: ScoreCategory[];
  currentScore: number;
  hostname: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const items = categories
    .flatMap((c) => c.recommendations.map((r) => ({ ...r, categoryLabel: c.label })))
    .sort((a, b) => b.points - a.points);
  if (items.length === 0) return null;
  const target = potentialScore(categories, currentScore);

  function handleCopy() {
    const lines = [
      `${title} — ${hostname} (score actuel : ${currentScore}/100, visé : ${target}/100)`,
      "",
      ...items.map((item, i) => `${i + 1}. [+${item.points}] ${item.categoryLabel} — ${item.action}`),
      "",
      "Généré avec le Vérificateur de Score GEO.",
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent-tint/40 p-4 text-left sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="font-mono text-xs text-link">
          Score visé : <span className="font-bold tabular-nums">{target}/100</span>
        </span>
      </div>
      <p className="text-xs text-ink-secondary">
        Classé par impact — commencez par le haut de la liste pour les gains les plus rapides.
      </p>
      <ol className="flex flex-col gap-2 text-sm text-ink-secondary">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 rounded bg-paper px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-link">
              +{item.points}
            </span>
            <span>
              <span className="font-medium text-ink">{item.categoryLabel}</span> — {item.action}
            </span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={handleCopy}
        className="self-start rounded-full border border-accent/40 px-3 py-1 font-mono text-xs font-medium text-link transition-colors hover:bg-paper"
      >
        {copied ? "Copié !" : "Copier le plan d'action"}
      </button>
    </div>
  );
}

function CategoryBar({ category }: { category: ScoreCategory }) {
  const ratio = category.max > 0 ? category.score / category.max : 0;
  const tone = toneFromRatio(ratio);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-ink">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_BG[tone]}`} />
          {category.label}
        </span>
        <span className="font-mono text-ink-muted tabular-nums">
          {category.score}/{category.max}
        </span>
      </div>
      <div className="meter-track h-2 w-full overflow-hidden rounded-full">
        <div className={`h-full rounded-full ${TONE_BG[tone]}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      {category.details.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 text-xs text-ink-muted">
          {category.details.map((d, i) => (
            <li key={i}>– {d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Brouillon de llms.txt généré par IA quand le site n'en a pas — à relire avant publication. */
function LlmsTxtDraft({ draft }: { draft: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <details className="rounded-2xl border border-accent/30 bg-accent-tint/30 px-4 py-3 text-left text-sm">
      <summary className="cursor-pointer font-medium text-link">Brouillon de llms.txt généré par IA</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-xs text-ink-secondary">
          Généré à partir du contenu réel de la page d&apos;accueil — à relire avant publication (aucun chiffre n&apos;est
          inventé, mais la formulation doit être validée).
        </p>
        <pre className="overflow-x-auto rounded-xl border border-border-soft bg-paper p-3 font-mono text-xs whitespace-pre-wrap text-ink-secondary">
          {draft}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="self-start rounded-full border border-accent/40 px-3 py-1 font-mono text-xs font-medium text-link transition-colors hover:bg-paper"
        >
          {copied ? "Copié !" : "Copier le llms.txt"}
        </button>
      </div>
    </details>
  );
}

/** Score d'accessibilité aux agents IA (llms.txt, robots.txt, sitemap, en-têtes Link, Markdown, WebMCP) — propriété du site, affichée une fois. */
function AgentReadinessSection({ readiness }: { readiness: AgentReadinessResult }) {
  const ratio = readiness.score / 100;
  return (
    <div className="flex flex-col gap-4 border-t border-border-soft pt-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">Accessibilité aux agents IA</h2>
        <span className={`font-mono text-sm font-bold tabular-nums ${TONE_TEXT[toneFromRatio(ratio)]}`}>
          {readiness.score}/100
        </span>
      </div>
      <p className="text-xs text-ink-muted">
        Le site est-il directement exploitable par des agents IA autonomes (pas seulement citable dans une réponse) :
        llms.txt, robots.txt, sitemap.xml, en-têtes Link, Markdown pour agents, WebMCP.
      </p>
      <div className="flex flex-col gap-4">
        {readiness.checks.map((cat) => (
          <CategoryBar key={cat.key} category={cat} />
        ))}
      </div>
      {readiness.llmsTxtDraft && <LlmsTxtDraft draft={readiness.llmsTxtDraft} />}
    </div>
  );
}

/** Bloc hostname/score/statut d'une page. */
function ScoreHero({ result }: { result: GeoScoreResult }) {
  const ratio = result.totalScore / 100;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-sm text-ink-muted">{result.hostname}</span>
      {result.pageTitle && <span className="max-w-md text-sm font-medium text-ink-secondary">{result.pageTitle}</span>}
      <span className={`font-display text-4xl font-normal tabular-nums ${TONE_TEXT[toneFromRatio(ratio)]}`}>
        {result.totalScore}
        <span className="text-lg text-ink-muted">/100</span>
      </span>
      <StatusPill ratio={ratio} />
      {!result.aiEvaluated && (
        <span className="inline-flex items-center gap-1.5 text-xs text-warning">
          Analyse IA non activée pour cette page — score plafonné.
        </span>
      )}
    </div>
  );
}

/** Détail d'une page sous le score : catégories GEO, accessibilité agents IA, plan d'action GEO. */
function ResultDetail({ result }: { result: GeoScoreResult }) {
  return (
    <>
      <div className="flex flex-col gap-4">
        {result.categories.map((cat) => (
          <CategoryBar key={cat.key} category={cat} />
        ))}
      </div>
      {result.agentReadiness && <AgentReadinessSection readiness={result.agentReadiness} />}
      <ActionPlan categories={result.categories} currentScore={result.totalScore} hostname={result.hostname} />
    </>
  );
}

/** Version compacte, tout-en-une-carte : utilisée pour les lignes dépliables du détail par page en mode "Site entier". */
function ResultCard({ result }: { result: GeoScoreResult }) {
  return (
    <div className="flex flex-col gap-5">
      <ScoreHero result={result} />
      {result.agentReadiness && (
        <ActionPlan
          categories={result.agentReadiness.checks}
          currentScore={result.agentReadiness.score}
          hostname={result.hostname}
          title="Plan d'action — agents IA"
        />
      )}
      <ResultDetail result={result} />
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<"page" | "site">("site");
  const [url, setUrl] = useState("");

  // Mode "Une page"
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<GeoScoreResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Mode "Site entier"
  const [crawling, setCrawling] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [pages, setPages] = useState<PageCrawlResult[]>([]);
  const [siteCopied, setSiteCopied] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const busy = loading || crawling;

  function updatePage(pageUrl: string, patch: Partial<PageCrawlResult>) {
    setPages((prev) => prev.map((p) => (p.url === pageUrl ? { ...p, ...patch } : p)));
  }

  async function analyzeOnePage(pageUrl: string) {
    updatePage(pageUrl, { status: "loading" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pageUrl, skipAgentReadiness: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erreur inconnue.");
      updatePage(pageUrl, { status: "done", result: data as GeoScoreResult });
    } catch (err) {
      updatePage(pageUrl, { status: "error", error: err instanceof Error ? err.message : "Erreur inconnue." });
    }
  }

  async function handlePageSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    setStepIndex(0);

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 1100);

    // Palier minimum de 3 à 8s : le vrai fetch + parsing + appel IA tourne en
    // parallèle. Le total affiché est le max des deux — jamais un résultat
    // tronqué, seulement un affichage qui ne "flashe" pas instantanément.
    const minDelay = new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 5000));

    try {
      const [res] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        }),
        minDelay,
      ]);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Une erreur est survenue.");
      }
      setResult(data as GeoScoreResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }

  async function handleSiteSubmit() {
    setCrawling(true);
    setError(null);
    setDiscovery(null);
    setPages([]);
    setSiteCopied(false);

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Erreur lors de la découverte des pages.");
      }
      const discoveryResult = data as DiscoveryResult;
      setDiscovery(discoveryResult);
      setPages(discoveryResult.pages.map((p) => ({ url: p.url, category: p.category, status: "pending" as const })));

      await runWithConcurrency(
        discoveryResult.pages.map((p) => p.url),
        3,
        analyzeOnePage,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setCrawling(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    if (mode === "page") {
      await handlePageSubmit();
    } else {
      await handleSiteSubmit();
    }
  }

  function handleCopyBadge() {
    if (!result) return;
    const text = `Score GEO de ${result.hostname} : ${result.totalScore}/100 — vérifié avec le Vérificateur de Score GEO`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCopySiteBadge() {
    if (!discovery || siteAverage === null) return;
    const text = `Score GEO moyen de ${discovery.hostname} : ${siteAverage}/100 sur ${doneResults.length} pages — vérifié avec le Vérificateur de Score GEO`;
    navigator.clipboard.writeText(text).then(() => {
      setSiteCopied(true);
      setTimeout(() => setSiteCopied(false), 2000);
    });
  }

  // Petites listes (plafond 20 pages) — recalculées à chaque rendu, pas besoin de useMemo.
  const doneResults = pages.filter(
    (p): p is PageCrawlResult & { result: GeoScoreResult } => p.status === "done" && !!p.result,
  );
  const erroredPages = pages.filter((p) => p.status === "error");
  const completedCount = doneResults.length + erroredPages.length;

  const siteAverage =
    doneResults.length > 0
      ? Math.round(doneResults.reduce((sum, p) => sum + p.result.totalScore, 0) / doneResults.length)
      : null;

  const categoryTotals = new Map<string, { key: string; label: string; score: number; max: number }>();
  for (const p of doneResults) {
    for (const c of p.result.categories) {
      const existing = categoryTotals.get(c.key);
      if (existing) {
        existing.score += c.score;
        existing.max += c.max;
      } else {
        categoryTotals.set(c.key, { key: c.key, label: c.label, score: c.score, max: c.max });
      }
    }
  }
  const aggregatedCategories = Array.from(categoryTotals.values());

  const weakestPages = [...doneResults].sort((a, b) => a.result.totalScore - b.result.totalScore).slice(0, 3);

  // Détail par page classé du pire score au meilleur ; les pages sans score
  // (en attente, en cours, en échec) restent groupées après, dans leur ordre
  // de découverte d'origine.
  const sortedPages = [...pages].sort((a, b) => {
    const scoreA = a.status === "done" && a.result ? a.result.totalScore : null;
    const scoreB = b.status === "done" && b.result ? b.result.totalScore : null;
    if (scoreA !== null && scoreB !== null) return scoreA - scoreB;
    if (scoreA !== null) return -1;
    if (scoreB !== null) return 1;
    return 0;
  });

  return (
    <main className="relative flex-1 overflow-x-clip">
      {/* Bandeau d'annonce */}
      <div className="border-b border-border-soft bg-surface px-4 py-2.5 text-center text-xs text-ink-secondary">
        <span className="pulse-dot mr-2 align-middle" />
        Analyse gratuite — aucune carte bancaire requise
      </div>

      <header className="sticky top-0 z-30 border-b border-border-soft bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              aria-label="Vérificateur de Score GEO"
              className="inline-flex items-center gap-1.5 font-display text-xl leading-none"
            >
              Score GEO <span className="text-lg">📡</span>
            </Link>
            <p className="text-[10px] leading-none text-ink-muted italic">a sysy&apos;s gtm project</p>
          </div>
          <div className="flex items-center gap-4">
            <MagneticLink
              href="#methodologie"
              className="hidden text-sm text-ink-secondary transition-colors hover:text-ink sm:inline"
            >
              Méthodologie
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
              Audit de visibilité IA
            </span>
            <h1 className="text-balance font-display text-4xl leading-[1.1] font-normal sm:text-5xl">
              Vérificateur de{" "}
              <span className="relative inline-block whitespace-nowrap">
                Score GEO
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
              Analysez la visibilité d&apos;une page — ou d&apos;un site entier — dans les réponses des moteurs IA
              (ChatGPT, Perplexity, Claude) : structure, données structurées, clarté des réponses et citabilité.
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-8 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => !busy && setMode("site")}
                disabled={busy}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                  mode === "site" ? "bg-btn-primary text-btn-primary-ink" : "border border-border-soft text-ink-secondary hover:text-ink"
                }`}
              >
                Site entier
              </button>
              <button
                type="button"
                onClick={() => !busy && setMode("page")}
                disabled={busy}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                  mode === "page" ? "bg-btn-primary text-btn-primary-ink" : "border border-border-soft text-ink-secondary hover:text-ink"
                }`}
              >
                Une page
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.22}>
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                inputMode="url"
                placeholder={mode === "page" ? "https://votre-site.com/article" : "https://votre-site.com"}
                value={url}
                disabled={busy}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !url.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-btn-primary px-6 py-3 font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Analyse en cours..." : crawling ? "Audit en cours..." : mode === "page" ? "Analyser" : "Lancer l'audit"}
                {!busy && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </form>
          </Reveal>

          {mode === "site" && (
            <Reveal delay={0.28}>
              <p className="mt-4 text-xs text-ink-muted">
                Découvre les pages via <code className="rounded bg-border-soft px-1 py-0.5 font-mono">sitemap.xml</code>{" "}
                (repli sur les liens de la page d&apos;accueil si absent), respecte{" "}
                <code className="rounded bg-border-soft px-1 py-0.5 font-mono">robots.txt</code>, et sélectionne un
                échantillon représentatif de 20 pages (accueil, pricing, produit, ressources...) pour rester
                raisonnable en temps et en coût — chaque page déclenche une analyse indépendante. Les variantes de
                langue (<code className="rounded bg-border-soft px-1 py-0.5 font-mono">/fr</code>,{" "}
                <code className="rounded bg-border-soft px-1 py-0.5 font-mono">/en</code>...) et les pages de compte
                ou légales sont automatiquement écartées de la sélection.
              </p>
            </Reveal>
          )}
        </section>
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-8 px-6 pb-24">
        {error && (
          <div className="rounded-2xl border border-critical/40 bg-critical-tint px-4 py-3 text-sm text-critical">{error}</div>
        )}

        {(loading || (crawling && !discovery)) && (
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="flex items-end gap-2.5">
              <span className="bounce-dot h-3 w-3 rounded-full bg-link" />
              <span className="bounce-dot h-3 w-3 rounded-full bg-link" />
              <span className="bounce-dot h-3 w-3 rounded-full bg-link" />
            </div>
            {loading ? (
              <ul className="flex flex-col items-center gap-2">
                {LOADING_STEPS.slice(0, stepIndex + 1).map((step, i) => (
                  <li
                    key={step}
                    className={`pop-in font-mono text-xs transition-colors duration-300 ${
                      i === stepIndex ? "font-medium text-ink" : "text-ink-muted"
                    }`}
                  >
                    {i < stepIndex ? "✓ " : "… "}
                    {step}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="pop-in font-mono text-xs text-ink-secondary">Découverte des pages du site…</span>
            )}
          </div>
        )}

        {mode === "page" && result && !loading && (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border-soft bg-surface p-6 sm:p-8">
              <ScoreHero result={result} />
            </div>
            {result.agentReadiness && (
              <ActionPlan
                categories={result.agentReadiness.checks}
                currentScore={result.agentReadiness.score}
                hostname={result.hostname}
                title="Plan d'action — agents IA"
              />
            )}
            <div className="flex flex-col gap-4 rounded-2xl border border-border-soft bg-surface p-6">
              <ResultDetail result={result} />
            </div>
            <button
              onClick={handleCopyBadge}
              className="self-center rounded-full border border-border-soft px-4 py-1.5 text-sm text-ink-secondary transition-colors hover:text-ink"
            >
              {copied ? "Copié !" : "Copier le badge à partager"}
            </button>
          </div>
        )}

        {mode === "site" && (discovery || pages.length > 0) && (
          <div className="flex flex-col gap-6">
            {discovery && (
              <p className="text-center font-mono text-xs text-ink-muted">
                {discovery.totalFoundIsApproximate ? `${discovery.totalFound}+` : discovery.totalFound} page(s) trouvée(s) via{" "}
                {discovery.source === "sitemap" ? "le sitemap" : "les liens de la page d'accueil (pas de sitemap trouvé)"}
                {discovery.capped ? ` — ${pages.length} analysées (plafond de 20)` : ""} · {completedCount}/{pages.length} traitées
              </p>
            )}

            {siteAverage !== null && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-border-soft bg-surface p-6 text-center sm:p-8">
                <span className="text-sm text-ink-muted">{discovery?.hostname}</span>
                <span className="font-display text-6xl font-normal tabular-nums text-ink">
                  {siteAverage}
                  <span className="text-2xl text-ink-muted">/100</span>
                </span>
                <StatusPill ratio={siteAverage / 100} />
                <span className="text-xs text-ink-muted">
                  Moyenne sur {doneResults.length} page(s) analysée(s){erroredPages.length > 0 ? ` · ${erroredPages.length} en échec` : ""}
                </span>
                <button
                  onClick={handleCopySiteBadge}
                  className="mt-2 rounded-full border border-border-soft px-4 py-1.5 text-sm text-ink-secondary transition-colors hover:text-ink"
                >
                  {siteCopied ? "Copié !" : "Copier le badge à partager"}
                </button>
              </div>
            )}

            {discovery?.agentReadiness && (
              <ActionPlan
                categories={discovery.agentReadiness.checks}
                currentScore={discovery.agentReadiness.score}
                hostname={discovery.hostname}
                title="Plan d'action — agents IA"
              />
            )}

            <div className="flex flex-col gap-6 rounded-2xl border border-border-soft bg-surface p-6">
              {aggregatedCategories.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-medium text-ink">Moyennes du site par catégorie</h2>
                  {aggregatedCategories.map((cat) => {
                    const ratio = cat.max > 0 ? cat.score / cat.max : 0;
                    const tone = toneFromRatio(ratio);
                    return (
                      <div key={cat.key} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium text-ink">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_BG[tone]}`} />
                            {cat.label}
                          </span>
                          <span className="font-mono text-ink-muted tabular-nums">{Math.round(ratio * 100)}%</span>
                        </div>
                        <div className="meter-track h-2 w-full overflow-hidden rounded-full">
                          <div className={`h-full rounded-full ${TONE_BG[tone]}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {discovery?.agentReadiness && <AgentReadinessSection readiness={discovery.agentReadiness} />}

              {weakestPages.length > 0 && (
                <div className="flex flex-col gap-2 rounded-2xl border border-warning/30 bg-warning-tint p-4">
                  <h2 className="text-sm font-medium text-warning">Pages à améliorer en priorité</h2>
                  <ul className="flex flex-col gap-1 text-sm text-ink-secondary">
                    {weakestPages.map((p) => (
                      <li key={p.url} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <CategoryTag category={p.category} />
                          <span className="truncate">{p.url}</span>
                        </span>
                        <span className="shrink-0 font-mono font-medium tabular-nums">{p.result.totalScore}/100</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-ink">Détail par page</h2>
                <p className="text-xs text-ink-muted">Classé du plus faible score au plus élevé.</p>
                <ul className="flex flex-col divide-y divide-border-soft">
                  {sortedPages.map((p) => (
                    <li key={p.url} className="py-2.5">
                      {p.status === "done" && p.result ? (
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                              <CategoryTag category={p.category} />
                              <span className="truncate text-ink-secondary">{p.url}</span>
                            </span>
                            <span className={`shrink-0 font-mono font-medium tabular-nums ${TONE_TEXT[toneFromRatio(p.result.totalScore / 100)]}`}>
                              {p.result.totalScore}/100
                            </span>
                          </summary>
                          <div className="mt-4 border-t border-border-soft pt-4">
                            <ResultCard result={p.result} />
                          </div>
                        </details>
                      ) : (
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <CategoryTag category={p.category} />
                            <span className="truncate text-ink-muted">{p.url}</span>
                          </span>
                          <span className="shrink-0 font-mono text-xs text-ink-muted">
                            {p.status === "pending" && "en attente…"}
                            {p.status === "loading" && "analyse en cours…"}
                            {p.status === "error" && (p.error ?? "échec")}
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <details id="methodologie" className="scroll-mt-20 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-ink-secondary open:pb-4">
          <summary className="cursor-pointer font-medium text-ink">Méthodologie & sources</summary>
          <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-ink-muted">
            <p>
              La pondération s&apos;appuie sur trois sources publiques : l&apos;étude{" "}
              <span className="font-medium text-ink-secondary">
                « GEO: Generative Engine Optimization » (Aggarwal et al., 2023, arXiv:2311.09735)
              </span>
              , dont le résultat le plus robuste — citer des sources et ajouter des statistiques/citations augmente
              nettement la visibilité dans les réponses générées, contrairement au bourrage de mots-clés — pèse pour
              25/100 dans la catégorie « Citations, statistiques & sources » ; la documentation Google Search Central
              sur les données structurées (15/100) ; et son guide E-E-A-T pour la fraîcheur et l&apos;auteur (10/100).
            </p>
            <p>
              Limite assumée : c&apos;est une approximation heuristique, pas une mesure garantie — aucun outil externe
              ne peut connaître la citabilité réelle d&apos;une page dans un moteur IA donné sans accès à ses journaux
              internes.
            </p>
            <p>
              <span className="font-medium text-ink-secondary">Sélection des 20 pages (mode « Site entier »)</span> :
              chaque URL découverte est classée par motif d&apos;URL (Accueil, Pricing, Produit, Ressources, À propos,
              Carrières, Contact, Légal, Autre — aucun appel IA, juste une lecture du chemin) puis choisie par quota
              par catégorie (accueil, pricing, produit, ressources, à propos, carrières, contact) pour obtenir un
              échantillon représentatif de la structure du site plutôt qu&apos;un tri arbitraire — par exemple les 20
              premiers articles de blog par ordre alphabétique, qui donnerait une image biaisée du site. Les places
              restantes sont comblées en priorité par des pages de contenu individuelles (catégorie « Autre » —
              souvent les fiches produit ou articles les plus rentables à auditer), et les pages légales/boilerplate
              (mentions légales, confidentialité...) ne sont piochées qu&apos;en tout dernier recours. Au sein d&apos;une
              catégorie, les chemins les plus courts sont préférés (proxy pour « plus proche de la racine du site =
              plus probablement important »).
            </p>
            <p>
              <span className="font-medium text-ink-secondary">Déduplication & exclusions</span> : deux URLs qui ne
              diffèrent que par un préfixe de langue (ex.{" "}
              <code className="rounded bg-border-soft px-1 py-0.5 font-mono">/fr/pricing</code> et{" "}
              <code className="rounded bg-border-soft px-1 py-0.5 font-mono">/pricing</code>) sont fusionnées — seule
              la version sans préfixe est conservée, pour ne pas occuper deux places de l&apos;échantillon avec la
              même page. Les pages de compte, connexion, mentions légales, confidentialité, etc. sont exclues
              d&apos;office : elles ne concernent ni le produit ni le contenu éditorial du site.
            </p>
            <p>
              <span className="font-medium text-ink-secondary">Accessibilité aux agents IA</span> : en complément du
              score GEO (visibilité dans une réponse générée), l&apos;outil vérifie si le site est directement
              exploitable par un agent IA autonome — présence d&apos;un{" "}
              <code className="rounded bg-border-soft px-1 py-0.5 font-mono">llms.txt</code>, autorisation des robots
              IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended...) et directive Content-Signal dans{" "}
              <code className="rounded bg-border-soft px-1 py-0.5 font-mono">robots.txt</code>,{" "}
              <code className="rounded bg-border-soft px-1 py-0.5 font-mono">sitemap.xml</code>, en-têtes{" "}
              <code className="rounded bg-border-soft px-1 py-0.5 font-mono">Link</code> (RFC 8288), négociation de
              contenu Markdown, et support WebMCP. Si aucun{" "}
              <code className="rounded bg-border-soft px-1 py-0.5 font-mono">llms.txt</code> n&apos;est trouvé, un
              brouillon est généré automatiquement par IA à partir du contenu réel de la page d&apos;accueil (à relire
              avant publication).
            </p>
          </div>
        </details>
      </div>

      <footer className="relative overflow-hidden border-t border-border-soft px-6 pt-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 pb-10 text-center">
          <p className="font-display text-2xl">Vérificateur de Score GEO</p>
          <p className="max-w-md text-sm text-ink-muted">
            Analysez la visibilité GEO de vos pages dans les réponses des moteurs IA — un projet gratuit des Sysy&apos;s
            GTM Projects.
          </p>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 border-t border-border-soft py-6 text-xs text-ink-muted">
          <p>&copy; {new Date().getFullYear()} Sysy&apos;s GTM Projects. Tous droits réservés.</p>
        </div>
        <div className="pointer-events-none flex justify-center overflow-hidden pb-2 text-center">
          <p className="footer-wordmark">Score GEO</p>
        </div>
      </footer>
    </main>
  );
}
