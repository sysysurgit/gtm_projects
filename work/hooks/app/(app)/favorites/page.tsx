"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Tag, X, Trash2 } from "lucide-react";

interface HookFavorite {
  generationId: string;
  hook_index: number;
  tags: string[];
  hook: {
    title: string;
    description?: string;
    cta?: string;
  };
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<HookFavorite[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    loadAllFavorites();
  }, []);

  function loadAllFavorites() {
    // Charger tous les favoris depuis localStorage
    const allFavs: HookFavorite[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("favorites_")) {
        const generationId = key.replace("favorites_", "");
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            // Le hook est maintenant sauvegardé directement dans le favori
            parsed.forEach((fav: { hook_index: number; tags: string[]; hook: any }) => {
              if (fav.hook) {
                allFavs.push({
                  generationId,
                  hook_index: fav.hook_index,
                  tags: fav.tags,
                  hook: fav.hook,
                });
              }
            });
          }
        } catch (e) {
          console.error("Failed to parse favorites", e);
        }
      }
    }
    setFavorites(allFavs);
  }

  function removeFavorite(generationId: string, hookIndex: number) {
    const key = `favorites_${generationId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      const filtered = parsed.filter((f: { hook_index: number }) => f.hook_index !== hookIndex);
      if (filtered.length > 0) {
        localStorage.setItem(key, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(key);
      }
      loadAllFavorites();
    }
  }

  const allTags = Array.from(
    new Set(favorites.flatMap((f) => f.tags))
  ).sort();

  const filteredFavorites = selectedTag
    ? favorites.filter((f) => f.tags.includes(selectedTag))
    : favorites;

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-normal">Favoris</h1>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted">Filtrer par tag :</span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              selectedTag === null
                ? "bg-accent text-accent-ink"
                : "bg-surface-raised text-ink-secondary hover:bg-surface"
            }`}
          >
            Tous ({favorites.length})
          </button>
          {allTags.map((tag) => {
            const count = favorites.filter((f) => f.tags.includes(tag)).length;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  selectedTag === tag
                    ? "bg-accent text-accent-ink"
                    : "bg-surface-raised text-ink-secondary hover:bg-surface"
                }`}
              >
                {tag} ({count})
              </button>
            );
          })}
        </div>
      )}

      {filteredFavorites.length === 0 ? (
        <div className="rounded-2xl border border-border-soft bg-surface p-8 text-center">
          <Star className="mx-auto mb-3 h-12 w-12 text-ink-muted" />
          <p className="mb-2 font-medium">Aucun favori pour le moment</p>
          <p className="text-sm text-ink-secondary">
            Marquez vos hooks préférés avec l'étoile ⭐ pour les retrouver ici
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredFavorites.map((fav, i) => (
            <div
              key={`${fav.generationId}-${fav.hook_index}`}
              className="group relative rounded-2xl border border-border-soft bg-surface p-5"
            >
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  onClick={() => removeFavorite(fav.generationId, fav.hook_index)}
                  className="rounded-lg bg-surface-raised p-2 opacity-0 transition-all hover:bg-surface hover:text-critical group-hover:opacity-100"
                  aria-label="Retirer des favoris"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 pr-10 font-semibold">{fav.hook.title}</p>
              {fav.hook.description && (
                <p className="mb-3 text-sm text-ink-secondary">{fav.hook.description}</p>
              )}
              {fav.hook.cta && (
                <p className="mb-3 text-xs font-medium tracking-wide text-link uppercase">
                  {fav.hook.cta}
                </p>
              )}
              {fav.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {fav.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-1 text-xs"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <Link
                href={`/generations/${fav.generationId}`}
                className="mt-3 inline-block text-xs text-ink-muted hover:text-link"
              >
                Voir la génération →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
