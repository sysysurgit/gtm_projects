"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Copy, Download, Check, Star, Tag, X } from "lucide-react";
import type { GenerationResult } from "@/lib/types";

interface HookFavorite {
  hook_index: number;
  tags: string[];
  hook: {
    title: string;
    description?: string;
    cta?: string;
  };
}

export function GenerationResultView({
  result,
  generationId,
}: {
  result: GenerationResult;
  generationId?: string;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [favorites, setFavorites] = useState<Map<number, HookFavorite>>(new Map());
  const [editingTagsIndex, setEditingTagsIndex] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (generationId) {
      loadFavorites();
    }
  }, [generationId]);

  async function loadFavorites() {
    // Pour simplifier, on charge depuis localStorage côté client
    // En prod, on ferait un fetch vers /api/favorites
    const stored = localStorage.getItem(`favorites_${generationId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setFavorites(new Map(parsed.map((f: HookFavorite) => [f.hook_index, f])));
    }
  }

  async function toggleFavorite(index: number) {
    const newFavorites = new Map(favorites);
    if (newFavorites.has(index)) {
      newFavorites.delete(index);
    } else {
      // Sauvegarder le hook complet avec l'index et les tags
      const hook = result.cards[index];
      newFavorites.set(index, {
        hook_index: index,
        tags: [],
        hook: {
          title: hook.title,
          description: hook.description,
          cta: hook.cta,
        },
      });
    }
    setFavorites(newFavorites);
    if (generationId) {
      localStorage.setItem(
        `favorites_${generationId}`,
        JSON.stringify(Array.from(newFavorites.values()))
      );
    }
  }

  async function addTag(index: number, tag: string) {
    if (!tag.trim()) return;
    const newFavorites = new Map(favorites);
    const hook = result.cards[index];
    const fav = newFavorites.get(index) || {
      hook_index: index,
      tags: [],
      hook: {
        title: hook.title,
        description: hook.description,
        cta: hook.cta,
      },
    };
    if (!fav.tags.includes(tag.trim())) {
      fav.tags.push(tag.trim());
      newFavorites.set(index, fav);
      setFavorites(newFavorites);
      if (generationId) {
        localStorage.setItem(
          `favorites_${generationId}`,
          JSON.stringify(Array.from(newFavorites.values()))
        );
      }
    }
    setTagInput("");
  }

  async function removeTag(index: number, tag: string) {
    const newFavorites = new Map(favorites);
    const fav = newFavorites.get(index);
    if (fav) {
      fav.tags = fav.tags.filter((t) => t !== tag);
      newFavorites.set(index, fav);
      setFavorites(newFavorites);
      if (generationId) {
        localStorage.setItem(
          `favorites_${generationId}`,
          JSON.stringify(Array.from(newFavorites.values()))
        );
      }
    }
  }

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
        {result.cards.map((c, i) => {
          const isFavorited = favorites.has(i);
          const fav = favorites.get(i);
          return (
            <div
              key={i}
              className="group relative rounded-2xl border border-border-soft bg-surface p-5"
            >
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(i)}
                  className="rounded-lg bg-surface-raised p-2 opacity-0 transition-all hover:bg-surface group-hover:opacity-100"
                  aria-label={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Star
                    className={`h-4 w-4 ${isFavorited ? "fill-link text-link" : ""}`}
                  />
                </button>
                <button
                  onClick={() => copyCard(c, i)}
                  className="rounded-lg bg-surface-raised p-2 opacity-0 transition-all hover:bg-surface group-hover:opacity-100"
                  aria-label="Copier ce hook"
                >
                  {copiedIndex === i ? (
                    <Check className="h-4 w-4 text-good" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mb-2 pr-20 font-semibold">{c.title}</p>
              {c.description && <p className="mb-3 text-sm text-ink-secondary">{c.description}</p>}
              {c.cta && (
                <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-link uppercase">
                  {c.cta} <ArrowRight className="h-3.5 w-3.5" />
                </p>
              )}

              {isFavorited && (
                <div className="mt-4 border-t border-border-soft pt-3">
                  {fav && fav.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {fav.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-1 text-xs"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(i, tag)}
                            className="hover:text-critical"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {editingTagsIndex === i ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addTag(i, tagInput);
                          } else if (e.key === "Escape") {
                            setEditingTagsIndex(null);
                            setTagInput("");
                          }
                        }}
                        placeholder="Nom du tag..."
                        className="flex-1 rounded-lg border border-border-soft bg-surface-raised px-2 py-1 text-xs outline-none focus:border-accent"
                      />
                      <button
                        onClick={() => addTag(i, tagInput)}
                        className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-accent-ink"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingTagsIndex(i)}
                      className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-link"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      Ajouter un tag
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
