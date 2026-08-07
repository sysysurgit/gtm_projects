"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

// Tour guidé post-inscription (coach marks type SaaS) : une séquence de
// bulles "Suivant / Terminé" qui présente chaque onglet de l'app après que
// l'utilisateur a complété son profil entreprise (première étape à
// l'inscription). Déclenché une seule fois via localStorage
// ("hooks-tour-pending" posé par la sauvegarde du profil ; consommé ici,
// remplacé par "hooks-tour-done").

interface TourStep {
  target: string; // sélecteur [data-tour="..."]
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    target: "generate",
    title: "Générer des hooks",
    body: "C'est ici que tout se passe : régie, format, budget, ton brief complet… et le style créatif en dernier. Tes hooks arrivent en quelques secondes.",
  },
  {
    target: "templates",
    title: "Templates",
    body: "Des briefs pré-remplis par industrie (SaaS B2B, e-commerce, formation, services pro) pour démarrer sans page blanche.",
  },
  {
    target: "history",
    title: "Historique",
    body: "Toutes tes générations passées, avec le brief qui les a produites. Pratique pour retrouver un hook ou un angle gagnant.",
  },
  {
    target: "profile",
    title: "Profil entreprise",
    body: "Ton contexte, ton ton de marque, tes contraintes — et ton style créatif par défaut. Défini une fois, appliqué à toutes tes générations.",
  },
];

export function AppTour() {
  const [active, setActive] = useState(-1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [hidden, setHidden] = useState(false); // cible masquée (mobile) → bulle centrée
  const rafRef = useRef<number | null>(null);

  const measure = useCallback((selector: string) => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
    if (!el) {
      setTargetRect(null);
      setHidden(true);
      return;
    }
    const rect = el.getBoundingClientRect();
    // Cible masquée (ex. nav desktop invisible sur mobile) → bulle centrée
    if (rect.width === 0 || rect.height === 0) {
      setTargetRect(null);
      setHidden(true);
      return;
    }
    setTargetRect(rect);
    setHidden(false);
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem("hooks-tour-pending") !== "1") return;
      // On laisse la page se poser avant de mesurer les positions
      const t = setTimeout(() => {
        setActive(0);
        measure(STEPS[0].target);
      }, 400);
      return () => clearTimeout(t);
    } catch {
      /* localStorage indisponible */
    }
  }, [measure]);

  // Repositionne la bulle au scroll/resize (debounce via rAF)
  useEffect(() => {
    if (active < 0) return;
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        measure(STEPS[active].target);
      });
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, measure]);

  function finish() {
    try {
      localStorage.removeItem("hooks-tour-pending");
      localStorage.setItem("hooks-tour-done", "1");
    } catch {
      /* ignore */
    }
    setActive(-1);
    setTargetRect(null);
  }

  if (active < 0) return null;

  const step = STEPS[active];
  const isLast = active === STEPS.length - 1;

  // Position de la bulle : au-dessus de la cible si possible, sinon dessous.
  // Cible masquée → centrée en haut de l'écran.
  const BUBBLE_W = 340;
  let bubbleStyle: React.CSSProperties;
  let highlightStyle: React.CSSProperties | null = null;

  if (hidden || !targetRect) {
    bubbleStyle = {
      position: "fixed",
      top: 96,
      left: "50%",
      transform: "translateX(-50%)",
      width: Math.min(BUBBLE_W, window.innerWidth - 32),
    };
  } else {
    const vw = window.innerWidth;
    const left = Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - BUBBLE_W / 2, vw - BUBBLE_W - 16));
    const placeAbove = targetRect.top > 260;
    bubbleStyle = {
      position: "fixed",
      top: placeAbove ? targetRect.top - 16 : targetRect.bottom + 16,
      left,
      width: Math.min(BUBBLE_W, vw - 32),
      transform: placeAbove ? "translateY(-100%)" : undefined,
    };
    highlightStyle = {
      position: "fixed",
      top: targetRect.top - 4,
      left: targetRect.left - 4,
      width: targetRect.width + 8,
      height: targetRect.height + 8,
      borderRadius: 10,
      boxShadow: "0 0 0 2px var(--accent), 0 0 24px rgba(28, 0, 254, 0.35)",
      zIndex: 60,
      pointerEvents: "none",
    };
  }

  return (
    <>
      {highlightStyle && <div style={highlightStyle} />}
      <div
        role="dialog"
        aria-label={step.title}
        className="fixed z-[70] rounded-2xl border border-border-soft bg-surface-raised p-5 shadow-2xl"
        style={bubbleStyle}
      >
        <p className="mb-1 text-[10px] font-semibold tracking-widest text-ink-muted uppercase">
          {active + 1} / {STEPS.length}
        </p>
        <p className="mb-1 font-display text-lg font-normal">{step.title}</p>
        <p className="mb-4 text-sm text-ink-secondary">{step.body}</p>
        <div className="flex items-center justify-between gap-3">
          {!isLast ? (
            <button onClick={finish} className="text-xs text-ink-muted transition-colors hover:text-ink">
              Passer
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => {
              if (isLast) {
                finish();
                return;
              }
              const next = active + 1;
              setActive(next);
              measure(STEPS[next].target);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-btn-primary px-4 py-2 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95"
          >
            {isLast ? "Terminé" : "Suivant"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
