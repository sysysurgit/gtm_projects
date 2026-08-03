"use client";

import { useState } from "react";
import { ArrowRight, Copy, Download, Check } from "lucide-react";
import type { GenerationResult } from "@/lib/types";

export function GenerationResultView({ result }: { result: GenerationResult }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  async function copyCard(card: GenerationResult["cards"][0], index: number) {
    const text = `${card.title}\n\n${card.description || ""}\n\n${card.cta || ""}`.trim();
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  async function copyAll() {
    const text = result.cards
      .map((c, i) => `HOOK ${i + 1}\n${c.title}\n\n${c.description || ""}\n\n${c.cta || ""}`)
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function downloadCSV() {
    const headers = ["Hook", "Description", "CTA"];
    const rows = result.cards.map((c) => [
      `"${c.title.replace(/"/g, '""')}"`,
      `"${(c.description || "").replace(/"/g, '""')}"`,
      `"${(c.cta || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hooks-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJSON() {
    const json = JSON.stringify(result.cards, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hooks-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={copyAll}
          className="inline-flex items-center gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm transition-colors hover:bg-surface-raised"
        >
          {copiedAll ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
          {copiedAll ? "Copié !" : "Copier tout"}
        </button>
        <button
          onClick={downloadCSV}
          className="inline-flex items-center gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm transition-colors hover:bg-surface-raised"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
        <button
          onClick={downloadJSON}
          className="inline-flex items-center gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm transition-colors hover:bg-surface-raised"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.cards.map((c, i) => (
          <div key={i} className="group relative rounded-2xl border border-border-soft bg-surface p-5">
            <button
              onClick={() => copyCard(c, i)}
              className="absolute top-3 right-3 rounded-lg bg-surface-raised p-2 opacity-0 transition-all hover:bg-surface group-hover:opacity-100"
              aria-label="Copier ce hook"
            >
              {copiedIndex === i ? (
                <Check className="h-4 w-4 text-good" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <p className="mb-2 pr-10 font-semibold">{c.title}</p>
            {c.description && <p className="mb-3 text-sm text-ink-secondary">{c.description}</p>}
            {c.cta && (
              <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-link uppercase">
                {c.cta} <ArrowRight className="h-3.5 w-3.5" />
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
