import { ArrowRight } from "lucide-react";
import type { GenerationResult } from "@/lib/types";

export function GenerationResultView({ result }: { result: GenerationResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {result.cards.map((c, i) => (
        <div key={i} className="rounded-2xl border border-border-soft bg-surface p-5">
          <p className="mb-2 font-semibold">{c.title}</p>
          {c.description && <p className="mb-3 text-sm text-ink-secondary">{c.description}</p>}
          {c.cta && (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-link uppercase">
              {c.cta} <ArrowRight className="h-3.5 w-3.5" />
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
