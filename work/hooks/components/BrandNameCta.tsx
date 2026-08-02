"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

const PENDING_BRAND_KEY = "hooks_pending_brand_name";

// The hero CTA doubles as the first question of the brief ("quelle marque ?")
// instead of a generic "essayer gratuitement" button. The typed value can't
// travel through the signup -> email-confirm -> login redirect chain as a
// query param without risk of being dropped, so it's handed off via
// localStorage and picked up by OnboardingWizard on mount (see there).
export function BrandNameCta() {
  const router = useRouter();
  const [brand, setBrand] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = brand.trim();
    if (trimmed) {
      window.localStorage.setItem(PENDING_BRAND_KEY, trimmed);
    }
    router.push("/signup");
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md text-left">
      <label htmlFor="brand-cta" className="mb-2 block text-sm font-medium text-ink-secondary">
        Pour quelle marque allons-nous travailler ?
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1.5 pl-4 transition-colors focus-within:border-accent">
        <input
          id="brand-cta"
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Nom de la marque à promouvoir"
          className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-btn-primary px-4 py-2.5 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95"
        >
          Continuer <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

export const HOOKS_PENDING_BRAND_KEY = PENDING_BRAND_KEY;
