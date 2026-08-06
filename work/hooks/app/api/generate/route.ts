import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateHooks, MODEL } from "@/lib/gemini/generate-hooks";
import { getFormatSpec, PLATFORMS, type PlatformId } from "@/lib/ad-platforms";
import type { Brief, DefaultBrief } from "@/lib/types";

const MAX_VISUAL_BYTES = 5 * 1024 * 1024;

interface ClaimResult {
  allowed: boolean;
  remaining: number;
  cap: number;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  // Re-validated via getUser() above, not a decoded JWT — this is the concrete
  // enforcement of "mandatory email verification before the 1st generation."
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }

  const body = await request.json();
  const brief: Brief = {
    platform: body.platform,
    adFormat: body.adFormat,
    budgetRange: body.budgetRange,
    funnelStage: body.funnelStage,
    creativeStyle: body.creativeStyle || null,
    industry: body.industry,
    productOffer: body.productOffer,
    keyFeatures: body.keyFeatures,
    credibilityProof: body.credibilityProof,
    persona: body.persona,
    targetGoals: body.targetGoals,
    targetPainsObjections: body.targetPainsObjections,
    competitorStrengths: body.competitorStrengths,
    competitorGaps: body.competitorGaps,
    visualBase64: body.visualBase64,
    visualMediaType: body.visualMediaType,
  };

  const requiredTextFields: (keyof Brief)[] = [
    "industry",
    "productOffer",
    "keyFeatures",
    "credibilityProof",
    "persona",
    "targetGoals",
    "targetPainsObjections",
    "competitorStrengths",
    "competitorGaps",
  ];

  if (
    !PLATFORMS[brief.platform as PlatformId] ||
    !getFormatSpec(brief.platform, brief.adFormat) ||
    !brief.budgetRange ||
    !brief.funnelStage ||
    requiredTextFields.some((f) => !(brief[f] as string)?.trim())
  ) {
    return NextResponse.json({ error: "INVALID_BRIEF" }, { status: 400 });
  }

  if (brief.visualBase64 && Buffer.byteLength(brief.visualBase64, "base64") > MAX_VISUAL_BYTES) {
    return NextResponse.json({ error: "VISUAL_TOO_LARGE" }, { status: 400 });
  }

  // Brief insert and slot claim don't depend on each other's result — run
  // them concurrently instead of two sequential round-trips before the
  // (much longer) Gemini call even starts.
  const [briefResult, claimResult] = await Promise.all([
    supabaseAdmin
      .from("briefs")
      .insert({
        user_id: user.id,
        platform: brief.platform,
        ad_format: brief.adFormat,
        budget_range: brief.budgetRange,
        funnel_stage: brief.funnelStage,
        creative_style: brief.creativeStyle || null,
        industry: brief.industry,
        product_offer: brief.productOffer,
        key_features: brief.keyFeatures,
        credibility_proof: brief.credibilityProof,
        persona: brief.persona,
        target_goals: brief.targetGoals,
        target_pains_objections: brief.targetPainsObjections,
        competitor_strengths: brief.competitorStrengths,
        competitor_gaps: brief.competitorGaps,
      })
      .select("id")
      .single(),
    supabaseAdmin.rpc("claim_generation_slot", { p_user_id: user.id }).single<ClaimResult>(),
  ]);

  const { data: briefRow, error: briefError } = briefResult;
  const { data: claim, error: claimError } = claimResult;

  if (briefError || !briefRow) {
    // Brief failed but the slot claim ran anyway (they're concurrent) — undo
    // it so a transient DB hiccup never costs the user a credit.
    if (claim?.allowed) {
      await supabaseAdmin.rpc("release_generation_slot", { p_user_id: user.id });
    }
    return NextResponse.json({ error: "BRIEF_INSERT_FAILED" }, { status: 500 });
  }

  if (claimError || !claim) {
    return NextResponse.json({ error: "CLAIM_FAILED" }, { status: 500 });
  }

  if (!claim.allowed) {
    return NextResponse.json(
      { error: "CAP_REACHED", cap: claim.cap, remaining: 0 },
      { status: 403 }
    );
  }

  try {
    const result = await generateHooks(brief);
    const { promptTokens, completionTokens, ...output } = result;

    // Profil : prénom/marque (si fournis) + brief par défaut pour préremplir
    // la prochaine génération — best-effort, ne doit jamais faire échouer la
    // réponse si l'update rate. Le visuel reste éphémère, jamais persisté.
    const defaultBrief: DefaultBrief = {
      platform: brief.platform,
      adFormat: brief.adFormat,
      budgetRange: brief.budgetRange,
      funnelStage: brief.funnelStage,
      creativeStyle: brief.creativeStyle || null,
      industry: brief.industry,
      productOffer: brief.productOffer,
      keyFeatures: brief.keyFeatures,
      credibilityProof: brief.credibilityProof,
      persona: brief.persona,
      targetGoals: brief.targetGoals,
      targetPainsObjections: brief.targetPainsObjections,
      competitorStrengths: brief.competitorStrengths,
      competitorGaps: brief.competitorGaps,
    };
    const profileUpdate: Record<string, unknown> = { default_brief: defaultBrief };
    if (typeof body.firstName === "string" && body.firstName.trim()) {
      profileUpdate.first_name = body.firstName.trim();
    }
    if (typeof body.brandName === "string" && body.brandName.trim()) {
      profileUpdate.brand_name = body.brandName.trim();
    }

    // Neither write depends on the other's result — run concurrently.
    await Promise.all([
      supabaseAdmin.from("generations").insert({
        user_id: user.id,
        brief_id: briefRow.id,
        model: MODEL,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        status: "completed",
        output,
      }),
      supabaseAdmin.from("profiles").update(profileUpdate).eq("id", user.id),
    ]);

    return NextResponse.json({ ...output, remaining: claim.remaining });
  } catch (err) {
    console.error("generateHooks failed", err);
    await supabaseAdmin.rpc("release_generation_slot", { p_user_id: user.id });
    await supabaseAdmin.from("generations").insert({
      user_id: user.id,
      brief_id: briefRow.id,
      model: MODEL,
      status: "failed",
      error_message: err instanceof Error ? err.message : "unknown error",
    });
    return NextResponse.json({ error: "GENERATION_FAILED" }, { status: 502 });
  }
}
