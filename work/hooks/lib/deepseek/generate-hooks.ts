import { getFormatSpec, PLATFORMS } from "@/lib/ad-platforms";
import { buildSystemPrompt, buildUserPrompt, buildCreativeStyleGuidance, isCompliant, CARDS_PER_GENERATION, type RawCard } from "@/lib/hook-prompts";
import { deepseekChatCompletion, DeepSeekApiError } from "@/lib/deepseek/client";
import { describeVisual } from "@/lib/gemini/describe-image";
import type { Brief, GenerationResult, HookCard } from "@/lib/types";

// DeepSeek v4-pro : bascule qualité depuis gemini-3.1-flash-lite (voir
// generate-hooks.ts, conservé pour référence/rollback). Coût mesuré
// négligeable pour ce volume (~0.20-0.30$/mois à 10 générations/jour, voir
// discussion du 2026-08-06) — le choix est motivé par la qualité créative et
// l'absence du rate-limit serré de Gemini free tier (~15 appels/min), pas
// par le prix.
export const MODEL = "deepseek-v4-pro";

const MAX_ATTEMPTS = 2;

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string
): Promise<{ rawCards: RawCard[]; promptTokens: number; completionTokens: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { content, usage } = await deepseekChatCompletion({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\nRéponds UNIQUEMENT avec un tableau JSON de ${CARDS_PER_GENERATION} objets, chacun avec les clés "angle", "title", "description", "cta". Aucun texte avant ou après le JSON, aucun bloc markdown \`\`\`.`,
          },
          { role: "user", content: userPrompt },
        ],
        maxTokens: 2000,
        // reasoning_effort "high" = qualité créative maximale pour un coût
        // toujours négligeable à ce volume (voir commentaire MODEL ci-dessus).
        reasoningEffort: "high",
        jsonMode: true,
      });
      const rawCards = JSON.parse(content) as RawCard[];
      return {
        rawCards,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      };
    } catch (err) {
      lastError = err;
      console.error(`generateHooksDeepSeek: DeepSeek call failed (attempt ${attempt}/${MAX_ATTEMPTS})`, err);
      // 429/401 échoueront identiquement au retry — ne pas gaspiller un
      // second appel (et de la latence) sur une requête qui ne peut pas réussir.
      if (err instanceof DeepSeekApiError && (err.status === 429 || err.status === 401)) {
        break;
      }
    }
  }
  throw lastError;
}

export type GenerateHooksResult = GenerationResult & {
  promptTokens: number;
  completionTokens: number;
};

export async function generateHooksDeepSeek(brief: Brief): Promise<GenerateHooksResult> {
  const formatSpec = getFormatSpec(brief.platform, brief.adFormat);
  if (!formatSpec) {
    throw new Error(`Unknown platform/format combination: ${brief.platform}/${brief.adFormat}`);
  }
  const platformLabel = PLATFORMS[brief.platform].label;
  const styleGuidance = buildCreativeStyleGuidance(brief.creativeStyle);

  // Le visuel (si joint) passe par Gemini vision d'abord pour être décrit en
  // texte — DeepSeek n'accepte pas d'image en entrée. Best-effort : en cas
  // d'échec, la génération continue simplement sans référence au visuel.
  let visualDescription: string | undefined;
  if (brief.visualBase64 && brief.visualMediaType) {
    visualDescription = await describeVisual(brief.visualBase64, brief.visualMediaType);
  }

  const constraintsLine = `Contraintes strictes : title ≤ ${formatSpec.titleMaxChars} caractères, description ≤ ${formatSpec.descriptionMaxChars} caractères, cta ≤ ${formatSpec.ctaMaxChars} caractères. Compte les caractères, ne dépasse jamais.`;

  const systemPrompt = `${buildSystemPrompt(platformLabel, formatSpec.label, formatSpec.promptGuidance, styleGuidance)}\n\n${constraintsLine}`;
  const userPrompt = buildUserPrompt(brief, platformLabel, formatSpec.label, visualDescription);

  const { rawCards, promptTokens, completionTokens } = await callDeepSeek(systemPrompt, userPrompt);

  const compliant = rawCards.filter((c) => isCompliant(c, formatSpec.titleMaxChars, formatSpec.descriptionMaxChars));
  const pool = compliant.length >= CARDS_PER_GENERATION ? compliant : rawCards;

  const cards: HookCard[] = pool.slice(0, CARDS_PER_GENERATION).map((c) => ({
    title: c.title,
    description: c.description || undefined,
    cta: c.cta || undefined,
  }));

  return { cards, promptTokens, completionTokens };
}
