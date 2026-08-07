import { getFormatSpec, PLATFORMS } from "@/lib/ad-platforms";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildCreativeStyleGuidance,
  buildRsaSystemPrompt,
  buildRsaUserPrompt,
  isCompliant,
  RSA_HEADLINES_COUNT,
  RSA_DESCRIPTIONS_COUNT,
  CARDS_PER_GENERATION,
  type RawCard,
} from "@/lib/hook-prompts";
import { deepseekChatCompletion, DeepSeekApiError } from "@/lib/deepseek/client";
import { describeVisual } from "@/lib/gemini/describe-image";
import type { Brief, GenerationResult, HookCard, RsaPack } from "@/lib/types";

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

// Appel générique : renvoie l'objet JSON racine parsé. Le retry absorbe les
// échecs transitoires (JSON tronqué, parse error) ; 429/401 ne sont pas
// retryés (échec certain), 408 (timeout) SI — au premier appel après un cold
// start Vercel, le délai réseau peut dépasser le budget même si l'API répond
// correctement ; le retry sur fonction chaude passe dans la grande majorité
// des cas (cause du "première génération échoue, la régénération marche").
async function callDeepSeekJson(
  systemPrompt: string,
  userPrompt: string
): Promise<{ json: Record<string, unknown>; promptTokens: number; completionTokens: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { content, usage } = await deepseekChatCompletion({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\nRéponds UNIQUEMENT avec un objet JSON. Aucun texte avant ou après le JSON, aucun bloc markdown \`\`\`.`,
          },
          { role: "user", content: userPrompt },
        ],
        maxTokens: 1500,
        thinking: false,
        jsonMode: true,
        timeoutMs: 20000,
      });
      const json = JSON.parse(content) as Record<string, unknown>;
      return {
        json,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      };
    } catch (err) {
      lastError = err;
      console.error(`DeepSeek call failed (attempt ${attempt}/${MAX_ATTEMPTS})`, err);
      // 429/401 échoueront identiquement au retry — ne pas gaspiller un
      // second appel (et du temps) sur une requête qui ne peut pas réussir.
      if (err instanceof DeepSeekApiError && (err.status === 429 || err.status === 401)) {
        break;
      }
    }
  }
  throw lastError;
}

async function callDeepSeekCards(
  systemPrompt: string,
  userPrompt: string
): Promise<{ rawCards: RawCard[]; promptTokens: number; completionTokens: number }> {
  const { json, promptTokens, completionTokens } = await callDeepSeekJson(systemPrompt, userPrompt);
  const rawCards = extractCardsArray(JSON.stringify(json));
  return { rawCards, promptTokens, completionTokens };
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

  // Tronque un texte à maxChars en coupant à la frontière de mot la plus
  // proche (jamais au milieu d'un mot), sans ajouter de ponctuation finale —
  // fallback de robustesse quand le modèle dépasse les limites Google.
  function truncateAtWordBoundary(text: string, maxChars: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= maxChars) return trimmed;
    const cut = trimmed.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?]+$/, "");
  }

  // --- Branche RSA (Responsive Search Ads Google) : sortie en pool de
  // headlines + descriptions, pas en cards — le format et le prompt sont
  // radicalement différents (voir buildRsaSystemPrompt).
  if (brief.platform === "google_ads" && brief.adFormat === "rsa") {
    const systemPrompt = buildRsaSystemPrompt(
      platformLabel,
      formatSpec.label,
      formatSpec.promptGuidance,
      styleGuidance
    );
    const userPrompt = buildRsaUserPrompt(brief, platformLabel, formatSpec.label, visualDescription);

    const { json, promptTokens, completionTokens } = await callDeepSeekJson(systemPrompt, userPrompt);

    const rawHeadlines = Array.isArray(json.headlines) ? (json.headlines as unknown[]) : [];
    const rawDescriptions = Array.isArray(json.descriptions) ? (json.descriptions as unknown[]) : [];

    // Conformité stricte d'abord (Google rejette au-delà des limites) ;
    // fallback : troncature propre à la frontière de mot pour les éléments
    // qui dépassent de peu. On ne jette jamais un élément utilisable.
    const headlines = rawHeadlines
      .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
      .map((h) => truncateAtWordBoundary(h, 30))
      .filter((h) => h.length > 0 && h.length <= 30)
      .slice(0, RSA_HEADLINES_COUNT);
    const descriptions = rawDescriptions
      .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      .map((d) => truncateAtWordBoundary(d, 90))
      .filter((d) => d.length > 0 && d.length <= 90)
      .slice(0, RSA_DESCRIPTIONS_COUNT);

    if (headlines.length === 0 || descriptions.length === 0) {
      throw new Error("Réponse RSA invalide : aucun headline ou description utilisable.");
    }

    const pack: RsaPack = { headlines, descriptions };
    return { ...pack, promptTokens, completionTokens };
  }

  // --- Branche classique (cards) : LinkedIn, Meta, Reddit, formats Google hors RSA ---
  const constraintsLine = `Contraintes strictes : title ≤ ${formatSpec.titleMaxChars} caractères, description ≤ ${formatSpec.descriptionMaxChars} caractères, cta ≤ ${formatSpec.ctaMaxChars} caractères. Compte les caractères, ne dépasse jamais.`;

  const systemPrompt = `${buildSystemPrompt(platformLabel, formatSpec.label, formatSpec.promptGuidance, styleGuidance)}\n\n${constraintsLine}`;
  const userPrompt = buildUserPrompt(brief, platformLabel, formatSpec.label, visualDescription);

  const { rawCards, promptTokens, completionTokens } = await callDeepSeekCards(systemPrompt, userPrompt);

  const compliant = rawCards.filter((c) => isCompliant(c, formatSpec.titleMaxChars, formatSpec.descriptionMaxChars));
  const pool = compliant.length >= CARDS_PER_GENERATION ? compliant : rawCards;

  const cards: HookCard[] = pool.slice(0, CARDS_PER_GENERATION).map((c) => ({
    title: c.title,
    description: c.description || undefined,
    cta: c.cta || undefined,
  }));

  return { cards, promptTokens, completionTokens };
}
