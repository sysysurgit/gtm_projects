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

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeoScoreResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;

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

  function handleCopyBadge() {
    if (!result) return;
    const text = `Score GEO de ${result.hostname} : ${result.totalScore}/100 — vérifié avec le Vérificateur de Score GEO`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black sm:px-8">
      <main className="flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Vérificateur de Score GEO
          </h1>
          <p className="mx-auto max-w-lg text-balance text-zinc-600 dark:text-zinc-400">
            Analysez la visibilité d&apos;une page dans les réponses des moteurs IA (ChatGPT, Perplexity, Claude) :
            structure, données structurées, clarté des réponses et citabilité.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            inputMode="url"
            placeholder="https://votre-site.com"
            value={url}
            disabled={loading}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none ring-zinc-900 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-100"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? "Analyse en cours..." : "Analyser"}
          </button>
        </form>

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

        {result && !loading && (
          <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col items-center gap-2 border-b border-zinc-200 pb-6 text-center dark:border-zinc-800">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{result.hostname}</span>
              {result.pageTitle && (
                <span className="max-w-md text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {result.pageTitle}
                </span>
              )}
              <span className={`text-6xl font-bold ${totalScoreColor(result.totalScore)}`}>
                {result.totalScore}
                <span className="text-2xl text-zinc-400 dark:text-zinc-600">/100</span>
              </span>
              {!result.aiEvaluated && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Analyse IA non activée — score plafonné sans clé ANTHROPIC_API_KEY côté serveur.
                </span>
              )}
              <button
                onClick={handleCopyBadge}
                className="mt-2 rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {copied ? "Copié !" : "Copier le badge à partager"}
              </button>
            </div>

            <div className="flex flex-col gap-5">
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
        )}
      </main>
    </div>
  );
}
