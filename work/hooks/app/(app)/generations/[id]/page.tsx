import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLATFORMS, getFormatSpec, type PlatformId } from "@/lib/ad-platforms";
import { GenerationResultView } from "@/components/GenerationResultView";
import type { GenerationResult } from "@/lib/types";

const BUDGET_LABEL: Record<string, string> = {
  lt_1k: "moins de 1000€/mois",
  "1k_5k": "1000-5000€/mois",
  "5k_20k": "5000-20000€/mois",
  gt_20k: "plus de 20000€/mois",
};

const FUNNEL_LABEL: Record<string, string> = {
  awareness: "Awareness",
  consideration: "Consideration",
  action: "Action",
};

export default async function GenerationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: generation } = await supabase
    .from("generations")
    .select("id, created_at, status, error_message, output, briefs(platform, ad_format, budget_range, funnel_stage, industry, persona, product_offer)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!generation) notFound();

  const brief = generation.briefs as unknown as {
    platform: PlatformId;
    ad_format: string;
    budget_range: string;
    funnel_stage: string;
    industry: string;
    persona: string;
    product_offer: string;
  } | null;

  const platformLabel = brief ? PLATFORMS[brief.platform]?.label ?? brief.platform : null;
  const formatLabel = brief ? getFormatSpec(brief.platform, brief.ad_format)?.label ?? brief.ad_format : null;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-ink-muted hover:text-link mb-6 inline-block">
        ← Retour à l&apos;historique
      </Link>

      <h1 className="text-2xl font-semibold mb-1">Génération du {new Date(generation.created_at).toLocaleString("fr-FR")}</h1>

      {brief && (
        <div className="rounded-lg border border-border-soft bg-surface p-4 my-5 text-sm space-y-1">
          <p>
            <span className="text-ink-muted">Régie : </span>
            {platformLabel} — {formatLabel}
          </p>
          <p>
            <span className="text-ink-muted">Budget : </span>
            {BUDGET_LABEL[brief.budget_range] ?? brief.budget_range}
            {" · "}
            <span className="text-ink-muted">Funnel : </span>
            {FUNNEL_LABEL[brief.funnel_stage] ?? brief.funnel_stage}
          </p>
          <p>
            <span className="text-ink-muted">Industrie : </span>
            {brief.industry}
          </p>
          <p>
            <span className="text-ink-muted">Persona : </span>
            {brief.persona}
          </p>
          <p>
            <span className="text-ink-muted">Offre : </span>
            {brief.product_offer}
          </p>
        </div>
      )}

      {generation.status === "failed" ? (
        <p className="text-sm text-critical mt-6">
          Cette génération a échoué{generation.error_message ? ` : ${generation.error_message}` : "."}
        </p>
      ) : generation.output ? (
        <div className="mt-6">
          <GenerationResultView result={generation.output as unknown as GenerationResult} />
        </div>
      ) : (
        <p className="text-sm text-ink-muted mt-6">Aucun résultat disponible pour cette génération.</p>
      )}
    </div>
  );
}
