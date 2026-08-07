import { getFormatSpec, PLATFORMS } from "@/lib/ad-platforms";
import { buildSystemPrompt, buildUserPrompt, buildCreativeStyleGuidance, isCompliant, CARDS_PER_GENERATION, type RawCard } from "@/lib/hook-prompts";
import { deepseekChatCompletion, DeepSeekApiError } from "@/lib/deepseek/client";
import { describeVisual } from "@/lib/gemini/describe-image";
import type { Brief, GenerationResult, HookCard } from "@/lib/types";

// DeepSeek v4-flash, thinking désactivé : réponse en ~1-2s côté API (mesuré),
// contre v4-pro thinking=enabled qui peut dépasser 15-20s voire cramer tout
// le budget de tokens en "réflexion" sans jamais produire de réponse (observé
// en test : reasoning_tokens = max_tokens entier, timeout côté fonction
// serverless -> "Une erreur est survenue" générique côté utilisateur).
// Qualité légèrement en retrait vs v4-pro mais largement suffisante pour ce
// cas d'usage, et le budget demandé est <20s bout en bout, pas la meilleure
// qualité absolue. v4-pro reste disponible si besoin (passer MODEL +
// thinking:true + reasoningEffort dans callDeepSeek ci-dessous).
export const MODEL = "deepseek-v4-flash";

const MAX_ATTEMPTS = 2;

// DeepSeek en json_object mode refuse un tableau JSON nu à la racine — il
// wrappe systématiquement dans un objet (mesuré : {"cards": [...]}). On
// gère aussi le cas où le modèle renvoie malgré tout un tableau nu, ou un
// objet avec une autre clé racine contenant le tableau, pour rester robuste
// aux variations de sortie.
function extractCardsArray(content: string): RawCard[] {
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed as RawCard[];
  if (parsed && typeof parsed === "object") {
    const firstArrayValue = Object.values(parsed).find((v) => Array.isArray(v));
    if (firstArrayValue) return firstArrayValue as RawCard[];
  }
  throw new Error("Réponse DeepSeek : impossible de trouver un tableau de cards dans le JSON.");
}

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
            content: `${systemPrompt}\n\nRéponds UNIQUEMENT avec un objet JSON de la forme {"cards": [...]}, où "cards" est un tableau de ${CARDS_PER_GENERATION} objets, chacun avec les clés "angle", "title", "description", "cta". Aucun texte avant ou après le JSON, aucun bloc markdown \`\`\`.`,
          },
          { role: "user", content: userPrompt },
        ],
        maxTokens: 1200,
        thinking: false,
        jsonMode: true,
        timeoutMs: 20000,
      });
      const rawCards = extractCardsArray(content);
      return {
        rawCards,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      };
    } catch (err) {
      lastError = err;
      console.error(`generateHooksDeepSeek: DeepSeek call failed (attempt ${attempt}/${MAX_ATTEMPTS})`, err);
      // 429/401 échoueront identiquement au retry — ne pas gaspiller un
      // second appel (et du temps) sur une requête qui ne peut pas réussir.
      // 408 (timeout) est RETENTÉ au contraire : au premier appel après un
      // cold start Vercel, le délai réseau peut dépasser le budget même si
      // l'API répond correctement — le retry sur fonction chaude passe dans
      // la grande majorité des cas (cause du "première génération échoue,
      // la régénération marche").
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
