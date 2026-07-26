import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";

export interface Recommendation {
  points: number;
  action: string;
}

export interface ScoreCategory {
  key: string;
  label: string;
  score: number;
  max: number;
  details: string[];
  recommendations: Recommendation[];
}

export interface GeoScoreResult {
  url: string;
  hostname: string;
  fetchedAt: string;
  pageTitle: string | null;
  metaDescription: string | null;
  totalScore: number;
  aiEvaluated: boolean;
  categories: ScoreCategory[];
}

/**
 * Pondération et méthodologie
 * ----------------------------
 * Les poids ci-dessous s'appuient sur trois sources publiques :
 *
 * 1. Aggarwal, Murahari, Rajpurohit, Kalyan, Narasimhan, Deshpande —
 *    "GEO: Generative Engine Optimization" (arXiv:2311.09735, 2023-2024).
 *    Étude empirique (benchmark GEO-bench) qui teste différentes stratégies de
 *    réécriture de contenu et mesure leur effet sur la visibilité dans des
 *    réponses générées par des LLM. Ses conclusions les plus robustes : citer
 *    des sources, ajouter des statistiques et des citations verbatim sont les
 *    leviers avec le plus fort impact ; le bourrage de mots-clés a un effet
 *    quasi nul, contrairement au SEO classique. → catégorie "Citations,
 *    statistiques & sources" pondérée le plus fortement (25/100).
 * 2. Google Search Central — documentation sur les données structurées et sur
 *    la façon dont les résumés générés par IA (AI Overviews) s'appuient sur le
 *    balisage schema.org. → catégorie "Données structurées" (15/100).
 * 3. Google Search Central — guide "Creating helpful, reliable, people-first
 *    content" et le cadre E-E-A-T (Experience, Expertise, Authoritativeness,
 *    Trustworthiness). → catégorie "Fraîcheur & auteur" (10/100).
 *
 * Le reste (structure de base, format direct/Q&A) reste pondéré mais réduit
 * par rapport à une v1 plus intuitive, ces signaux étant nécessaires mais
 * peu différenciants d'après la littérature ci-dessus.
 *
 * Limite assumée : il s'agit d'une approximation heuristique. Aucun outil
 * externe ne peut mesurer avec certitude la citabilité réelle dans un moteur
 * IA donné sans accès à ses journaux internes — ces poids reflètent des
 * tendances publiées, pas une garantie de résultat pour une page précise.
 *
 * Chaque sous-vérification qui ne rapporte pas la totalité de ses points émet
 * aussi une `Recommendation` (points récupérables + action concrète) — c'est
 * ce qui alimente le plan d'action affiché dans l'app, pas seulement le score.
 */
export const SCORE_WEIGHTS = {
  structure: 10,
  schema: 15,
  citations: 25,
  directAnswers: 15,
  freshnessAuthor: 10,
  entityClarity: 25,
} as const;

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

function isBlockedHostname(hostname: string): boolean {
  return BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(hostname));
}

function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80")) return true;
    return false;
  }
  return false;
}

export function validateUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("URL invalide.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Seuls les protocoles http et https sont acceptés.");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error("Cette adresse n'est pas autorisée.");
  }
  return url;
}

/** Best-effort SSRF guard: resolves the hostname and rejects private/loopback ranges. */
export async function assertHostnameIsPublic(hostname: string): Promise<void> {
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error("Cette adresse n'est pas autorisée.");
    }
    return;
  }
  let address: string;
  try {
    ({ address } = await lookup(hostname));
  } catch {
    throw new Error("Impossible de résoudre ce nom de domaine.");
  }
  if (isPrivateIp(address)) {
    throw new Error("Cette adresse n'est pas autorisée.");
  }
}

async function fetchHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VerificateurScoreGEO/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      throw new Error(`La page a répondu avec le statut ${res.status}.`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      throw new Error("L'URL ne pointe pas vers une page HTML.");
    }

    const html = await res.text();
    const MAX_CHARS = 3_000_000;
    return html.length > MAX_CHARS ? html.slice(0, MAX_CHARS) : html;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Le chargement de la page a dépassé le délai autorisé (10s).");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function scoreStructure($: cheerio.CheerioAPI): ScoreCategory {
  const details: string[] = [];
  const recommendations: Recommendation[] = [];
  let score = 0;
  const max = SCORE_WEIGHTS.structure;

  const h1Count = $("h1").length;
  if (h1Count === 1) {
    score += 4;
    details.push("Un seul H1 détecté — bonne clarté de structure.");
  } else if (h1Count === 0) {
    details.push("Aucun H1 détecté.");
    recommendations.push({ points: 4, action: "Ajouter un titre H1 unique et descriptif en haut de la page." });
  } else {
    details.push(`${h1Count} balises H1 détectées — un seul H1 par page est préférable.`);
    recommendations.push({ points: 4, action: `Ne garder qu'un seul H1 par page (actuellement ${h1Count}).` });
  }

  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? "";
  if (metaDescription.length >= 50 && metaDescription.length <= 300) {
    score += 3;
    details.push("Meta description présente et bien dimensionnée.");
  } else if (metaDescription.length > 0) {
    score += 1;
    details.push("Meta description présente mais mal dimensionnée (idéal : 50-160 caractères).");
    recommendations.push({ points: 2, action: "Ajuster la longueur de la meta description à 50-160 caractères." });
  } else {
    details.push("Aucune meta description détectée.");
    recommendations.push({ points: 3, action: "Ajouter une meta description de 50 à 160 caractères résumant la page." });
  }

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;
  if (wordCount >= 300) {
    score += 3;
    details.push(`Contenu textuel suffisant (~${wordCount} mots).`);
  } else {
    details.push(`Contenu textuel limité (~${wordCount} mots) — signal nécessaire mais peu différenciant seul.`);
    recommendations.push({ points: 3, action: `Étoffer le contenu à au moins 300 mots (actuellement ~${wordCount}).` });
  }

  return { key: "structure", label: "Structure du contenu", score, max, details, recommendations };
}

function scoreSchema($: cheerio.CheerioAPI): ScoreCategory {
  const details: string[] = [];
  const recommendations: Recommendation[] = [];
  let score = 0;
  const max = SCORE_WEIGHTS.schema;

  const jsonLdBlocks: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) jsonLdBlocks.push(...parsed);
      else jsonLdBlocks.push(parsed);
    } catch {
      // JSON-LD malformé — ignoré
    }
  });

  if (jsonLdBlocks.length > 0) {
    score += 6;
    details.push(`${jsonLdBlocks.length} bloc(s) de données structurées JSON-LD détecté(s).`);
  } else {
    details.push("Aucune donnée structurée JSON-LD détectée.");
    recommendations.push({ points: 6, action: "Ajouter des données structurées JSON-LD (schema.org) à la page." });
  }

  const types = new Set<string>();
  for (const block of jsonLdBlocks) {
    const t = block["@type"];
    if (Array.isArray(t)) t.forEach((x) => types.add(String(x)));
    else if (t) types.add(String(t));
  }

  if (types.has("FAQPage")) {
    score += 6;
    details.push("Schema FAQPage détecté — favorable aux moteurs de réponse IA (Google Search Central).");
  } else {
    details.push("Pas de schema FAQPage détecté.");
    recommendations.push({
      points: 6,
      action: "Ajouter un schema FAQPage si la page contient des questions/réponses — très favorable aux moteurs IA.",
    });
  }

  const usefulTypes = ["Organization", "Article", "Product", "BreadcrumbList", "WebPage", "NewsArticle"];
  const matched = usefulTypes.filter((t) => types.has(t));
  if (matched.length > 0) {
    score += 3;
    details.push(`Types de schema complémentaires détectés : ${matched.join(", ")}.`);
  } else {
    details.push("Aucun type de schema complémentaire (Organization, Article, Product...) détecté.");
    recommendations.push({ points: 3, action: "Ajouter un schema complémentaire pertinent (Organization, Article, Product...)." });
  }

  return { key: "schema", label: "Données structurées", score, max, details, recommendations };
}

const STAT_PATTERN = /\d+(?:[.,]\d+)?\s?(?:%|pourcents?)|\b\d{2,}(?:[.,]\d+)?\b/g;
const QUOTE_PATTERN = /«\s?[^»]{15,}\s?»|"[^"]{15,}"/;

function scoreCitations($: cheerio.CheerioAPI, baseHost: string): ScoreCategory {
  const details: string[] = [];
  const recommendations: Recommendation[] = [];
  let score = 0;
  const max = SCORE_WEIGHTS.citations;

  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const linkUrl = new URL(href, `https://${baseHost}`);
      if (linkUrl.hostname && linkUrl.hostname !== baseHost) externalLinks++;
    } catch {
      // href invalide — ignoré
    }
  });
  if (externalLinks >= 2) {
    score += 10;
    details.push(`${externalLinks} liens sortants vers des sources externes — favorise la citation par les moteurs IA.`);
  } else if (externalLinks === 1) {
    score += 5;
    details.push("Un seul lien sortant détecté.");
    recommendations.push({ points: 5, action: "Ajouter au moins un second lien sortant vers une source externe fiable." });
  } else {
    details.push("Aucun lien sortant vers une source externe détecté.");
    recommendations.push({ points: 10, action: "Ajouter au moins 2 liens sortants vers des sources externes fiables." });
  }

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const statMatches = bodyText.match(STAT_PATTERN) ?? [];
  if (statMatches.length >= 3) {
    score += 10;
    details.push(`${statMatches.length} données chiffrées détectées — les statistiques augmentent la citabilité (étude GEO, Aggarwal et al. 2023).`);
  } else if (statMatches.length > 0) {
    score += 5;
    details.push(`${statMatches.length} donnée(s) chiffrée(s) détectée(s) — encore limité.`);
    recommendations.push({ points: 5, action: "Ajouter davantage de données chiffrées concrètes (au moins 3 occurrences)." });
  } else {
    details.push("Aucune statistique ou donnée chiffrée détectée.");
    recommendations.push({ points: 10, action: "Intégrer des statistiques ou données chiffrées concrètes dans le contenu." });
  }

  const hasQuote = $("blockquote").length > 0 || QUOTE_PATTERN.test(bodyText);
  if (hasQuote) {
    score += 5;
    details.push("Citation ou verbatim détecté(e).");
  } else {
    details.push("Aucune citation ou verbatim détecté(e).");
    recommendations.push({
      points: 5,
      action: "Ajouter une citation ou un verbatim (expert, client, étude) pour renforcer la crédibilité.",
    });
  }

  return { key: "citations", label: "Citations, statistiques & sources", score, max, details, recommendations };
}

function scoreDirectAnswers($: cheerio.CheerioAPI): ScoreCategory {
  const details: string[] = [];
  const recommendations: Recommendation[] = [];
  let score = 0;
  const max = SCORE_WEIGHTS.directAnswers;

  const headings = $("h2, h3")
    .toArray()
    .map((el) => $(el).text().trim());
  const questionHeadings = headings.filter((h) => h.endsWith("?"));
  if (questionHeadings.length >= 2) {
    score += 9;
    details.push(`${questionHeadings.length} sous-titres formulés en question — excellent format pour les réponses IA.`);
  } else if (questionHeadings.length === 1) {
    score += 4;
    details.push("Un sous-titre formulé en question détecté.");
    recommendations.push({ points: 5, action: "Ajouter un second sous-titre formulé en question." });
  } else {
    details.push("Aucun sous-titre formulé en question (ex : « Comment... », « Qu'est-ce que... »).");
    recommendations.push({
      points: 9,
      action: "Reformuler au moins deux sous-titres en questions (ex : « Comment... », « Qu'est-ce que... »).",
    });
  }

  const listCount = $("ul, ol").length;
  if (listCount >= 2) {
    score += 6;
    details.push(`${listCount} listes structurées détectées — favorise l'extraction par les IA.`);
  } else if (listCount === 1) {
    score += 3;
    details.push("Une liste structurée détectée.");
    recommendations.push({ points: 3, action: "Ajouter une seconde liste structurée (à puces ou numérotée)." });
  } else {
    details.push("Aucune liste structurée détectée.");
    recommendations.push({ points: 6, action: "Structurer le contenu avec au moins deux listes à puces ou numérotées." });
  }

  return { key: "direct-answers", label: "Clarté des réponses", score, max, details, recommendations };
}

function scoreFreshnessAuthor($: cheerio.CheerioAPI): ScoreCategory {
  const details: string[] = [];
  const recommendations: Recommendation[] = [];
  let score = 0;
  const max = SCORE_WEIGHTS.freshnessAuthor;

  const hasDate =
    $('meta[property="article:published_time"]').length > 0 ||
    $("time[datetime]").length > 0 ||
    $('meta[name="date"]').length > 0;
  if (hasDate) {
    score += 5;
    details.push("Date de publication ou de mise à jour détectée.");
  } else {
    details.push("Aucune date de publication détectée.");
    recommendations.push({
      points: 5,
      action: "Afficher une date de publication/mise à jour visible (balise <time> ou meta article:published_time).",
    });
  }

  const hasAuthor =
    $('meta[name="author"]').length > 0 ||
    $('[rel="author"]').length > 0 ||
    $('[class*="author" i]').length > 0;
  if (hasAuthor) {
    score += 5;
    details.push("Auteur identifié sur la page (signal E-E-A-T).");
  } else {
    details.push("Aucun auteur identifié.");
    recommendations.push({
      points: 5,
      action: "Identifier clairement l'auteur de la page (meta author, rel=author, ou bloc auteur visible).",
    });
  }

  return { key: "freshness-author", label: "Fraîcheur & auteur", score, max, details, recommendations };
}

async function scoreEntityClarity(
  apiKey: string,
  pageTitle: string,
  metaDescription: string,
  bodyText: string,
): Promise<ScoreCategory> {
  const client = new Anthropic({ apiKey });
  const excerpt = bodyText.slice(0, 6000);
  const max = SCORE_WEIGHTS.entityClarity;

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            score: { type: "integer" },
            summary: { type: "string" },
            improvement: { type: "string" },
          },
          required: ["score", "summary", "improvement"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "user",
        content: `Tu es un évaluateur GEO (Generative Engine Optimization). Évalue la clarté d'entité de cette page : un moteur de réponse IA (ChatGPT, Perplexity, Claude) pourrait-il citer précisément et sans ambiguïté de quoi parle cette page (marque, produit, service), et la citer comme source fiable, à partir de son seul contenu ?

Titre : ${pageTitle || "(absent)"}
Meta description : ${metaDescription || "(absente)"}
Extrait du contenu :
"""
${excerpt}
"""

Donne : un score entier de 0 à ${max} (${max} = entité extrêmement claire et citable sans ambiguïté, 0 = entité totalement floue ou absente) ; une phrase d'explication en français ; et, si le score n'est pas déjà maximal, une phrase d'amélioration concrète et actionnable (sinon une chaîne vide).`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse IA invalide.");
  }
  const parsed = JSON.parse(textBlock.text) as { score: number; summary: string; improvement: string };
  const clamped = Math.max(0, Math.min(max, Math.round(parsed.score)));

  const recommendations: Recommendation[] = [];
  if (clamped < max && parsed.improvement.trim()) {
    recommendations.push({ points: max - clamped, action: parsed.improvement.trim() });
  }

  return {
    key: "entity-clarity",
    label: "Clarté d'entité (analyse IA)",
    score: clamped,
    max,
    details: [parsed.summary],
    recommendations,
  };
}

export async function analyzeGeoScore(url: URL, apiKey?: string): Promise<GeoScoreResult> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const pageTitle = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  const categories: ScoreCategory[] = [
    scoreStructure($),
    scoreSchema($),
    scoreCitations($, url.hostname),
    scoreDirectAnswers($),
    scoreFreshnessAuthor($),
  ];

  let aiEvaluated = false;
  if (apiKey) {
    try {
      categories.push(await scoreEntityClarity(apiKey, pageTitle ?? "", metaDescription ?? "", bodyText));
      aiEvaluated = true;
    } catch (err) {
      console.error("scoreEntityClarity failed:", err);
      categories.push({
        key: "entity-clarity",
        label: "Clarté d'entité (analyse IA)",
        score: 0,
        max: SCORE_WEIGHTS.entityClarity,
        details: ["L'analyse IA a échoué — ce sous-score n'est pas pris en compte."],
        recommendations: [],
      });
    }
  } else {
    categories.push({
      key: "entity-clarity",
      label: "Clarté d'entité (analyse IA)",
      score: 0,
      max: SCORE_WEIGHTS.entityClarity,
      details: ["Analyse IA non disponible (clé ANTHROPIC_API_KEY absente du serveur)."],
      recommendations: [],
    });
  }

  const rawTotal = categories.reduce((sum, c) => sum + c.score, 0);
  const maxTotal = categories.reduce((sum, c) => sum + c.max, 0);
  const totalScore = Math.round((rawTotal / maxTotal) * 100);

  return {
    url: url.toString(),
    hostname: url.hostname,
    fetchedAt: new Date().toISOString(),
    pageTitle,
    metaDescription,
    totalScore,
    aiEvaluated,
    categories,
  };
}
