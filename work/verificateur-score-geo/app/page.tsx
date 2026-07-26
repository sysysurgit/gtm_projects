"use client";

import { useState, type FormEvent } from "react";

interface ScoreCategory {
  key: string;
  label: string;
  score: number;
  max: number;
  details: string[];
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
}

interface DiscoveryResult {
  rootUrl: string;
  hostname: string;
  urls: string[];
  source: "sitemap" | "homepage-links";
  totalFound: number;
  totalFoundIsApproximate: boolean;
  capped: boolean;
}

interface PageCrawlResult {
  url: string;
  status: "pending" | "loading" | "done" | "error";
  result?: GeoScoreResult;
  error?: string;
}

function scoreColor(ratio: number): string {
  if (ratio >= 0.75) return "bg-emerald-500";
  if (ratio >= 0.5) return "bg-amber-500";
  return "bg-red-500";
}

function totalScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
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

function ResultCard({ result }: { result: GeoScoreResult }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{result.hostname}</span>
        {result.pageTitle && (
          <span className="max-w-md text-sm font-medium text-zinc-700 dark:text-zinc-300">{result.pageTitle}</span>
        )}
        <span className={`text-4xl font-bold ${totalScoreColor(result.totalScore)}`}>
          {result.totalScore}
          <span className="text-lg text-zinc-400 dark:text-zinc-600">/100</span>
        </span>
        {!result.aiEvaluated && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Analyse IA non activée pour cette page — score plafonné.
          </span>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {result.categories.map((cat) => {
          const ratio = cat.max > 0 ? cat.score / cat.max : 0;
          return (
            <div key={cat.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{cat.label}</span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {cat.score}/{cat.max}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${scoreColor(ratio)}`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
              <ul className="mt-1 flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {cat.details.map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<"page" | "site">("page");
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
        body: JSON.stringify({ url: pageUrl }),
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
      setPages(discoveryResult.urls.map((u) => ({ url: u, status: "pending" as const })));

      await runWithConcurrency(discoveryResult.urls, 3, analyzeOnePage);
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

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black sm:px-8">
      <main className="flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Vérificateur de Score GEO
          </h1>
          <p className="mx-auto max-w-lg text-balance text-zinc-600 dark:text-zinc-400">
            Analysez la visibilité d&apos;une page — ou d&apos;un site entier — dans les réponses des moteurs IA
            (ChatGPT, Perplexity, Claude) : structure, données structurées, clarté des réponses et citabilité.
          </p>
        </header>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => !busy && setMode("page")}
            disabled={busy}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              mode === "page"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            Une page
          </button>
          <button
            type="button"
            onClick={() => !busy && setMode("site")}
            disabled={busy}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              mode === "site"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            Site entier
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            inputMode="url"
            placeholder={mode === "page" ? "https://votre-site.com/article" : "https://votre-site.com"}
            value={url}
            disabled={busy}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none ring-zinc-900 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-100"
          />
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? "Analyse en cours..." : crawling ? "Audit en cours..." : mode === "page" ? "Analyser" : "Lancer l'audit"}
          </button>
        </form>

        {mode === "site" && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Découvre les pages via <code>sitemap.xml</code> (repli sur les liens de la page d&apos;accueil si absent),
            respecte <code>robots.txt</code>, et plafonne à 20 pages par audit pour rester raisonnable en temps et en
            coût — chaque page déclenche une analyse indépendante.
          </p>
        )}

        <details className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 open:pb-4 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">Méthodologie & sources</summary>
          <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed">
            <p>
              La pondération s&apos;appuie sur trois sources publiques : l&apos;étude{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
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
          </div>
        </details>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-900 dark:bg-zinc-50" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Analyse en cours…</span>
            </div>
            <ul className="flex flex-col gap-2">
              {LOADING_STEPS.map((step, i) => (
                <li
                  key={step}
                  className={`flex items-center gap-2.5 text-sm transition-colors duration-300 ${
                    i < stepIndex
                      ? "text-zinc-400 dark:text-zinc-600"
                      : i === stepIndex
                        ? "font-medium text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-300 dark:text-zinc-700"
                  }`}
                >
                  <span className="w-4 shrink-0 text-center">
                    {i < stepIndex ? "✓" : i === stepIndex ? "…" : ""}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode === "page" && result && !loading && (
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <ResultCard result={result} />
            <button
              onClick={handleCopyBadge}
              className="self-center rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {copied ? "Copié !" : "Copier le badge à partager"}
            </button>
          </div>
        )}

        {mode === "site" && (discovery || pages.length > 0) && (
          <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            {discovery && (
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                {discovery.totalFoundIsApproximate ? `${discovery.totalFound}+` : discovery.totalFound} page(s) trouvée(s) via{" "}
                {discovery.source === "sitemap" ? "le sitemap" : "les liens de la page d'accueil (pas de sitemap trouvé)"}
                {discovery.capped ? ` — ${pages.length} analysées (plafond de 20)` : ""} · {completedCount}/{pages.length} traitées
              </p>
            )}

            {siteAverage !== null && (
              <div className="flex flex-col items-center gap-2 border-b border-zinc-200 pb-6 text-center dark:border-zinc-800">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{discovery?.hostname}</span>
                <span className={`text-6xl font-bold ${totalScoreColor(siteAverage)}`}>
                  {siteAverage}
                  <span className="text-2xl text-zinc-400 dark:text-zinc-600">/100</span>
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Moyenne sur {doneResults.length} page(s) analysée(s){erroredPages.length > 0 ? ` · ${erroredPages.length} en échec` : ""}
                </span>
                <button
                  onClick={handleCopySiteBadge}
                  className="mt-2 rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {siteCopied ? "Copié !" : "Copier le badge à partager"}
                </button>
              </div>
            )}

            {aggregatedCategories.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Moyennes du site par catégorie</h2>
                {aggregatedCategories.map((cat) => {
                  const ratio = cat.max > 0 ? cat.score / cat.max : 0;
                  return (
                    <div key={cat.key} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{cat.label}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">{Math.round(ratio * 100)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${scoreColor(ratio)}`}
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {weakestPages.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                <h2 className="text-sm font-medium text-amber-800 dark:text-amber-300">Pages à améliorer en priorité</h2>
                <ul className="flex flex-col gap-1 text-sm text-amber-700 dark:text-amber-400">
                  {weakestPages.map((p) => (
                    <li key={p.url} className="flex items-center justify-between gap-3">
                      <span className="truncate">{p.url}</span>
                      <span className="shrink-0 font-medium">{p.result.totalScore}/100</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Détail par page</h2>
              <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {pages.map((p) => (
                  <li key={p.url} className="py-2.5">
                    {p.status === "done" && p.result ? (
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                          <span className="truncate text-zinc-700 dark:text-zinc-300">{p.url}</span>
                          <span className={`shrink-0 font-medium ${totalScoreColor(p.result.totalScore)}`}>
                            {p.result.totalScore}/100
                          </span>
                        </summary>
                        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                          <ResultCard result={p.result} />
                        </div>
                      </details>
                    ) : (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-zinc-500 dark:text-zinc-400">{p.url}</span>
                        <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-600">
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
        )}
      </main>
    </div>
  );
}
