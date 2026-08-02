import { ArrowRight } from "lucide-react";
import type { GenerationResult } from "@/lib/types";

export function GenerationResultView({ result }: { result: GenerationResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {result.cards.map((c, i) => (
        <div key={i} className="rounded-lg border border-border-soft bg-surface p-5">
          <p className="font-semibold mb-2">{c.title}</p>
          {c.description && <p className="text-sm text-ink-secondary mb-3">{c.description}</p>}
          {c.cta && (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-link">
              {c.cta} <ArrowRight className="h-3.5 w-3.5" />
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
